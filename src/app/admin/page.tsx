'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, LogIn, LogOut, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  deleteAdminAd,
  fallbackAdminProfile,
  fetchAdminOrders,
  fetchAdminUsers,
  getStoredAdminProfile,
  getStoredAdminToken,
  loginAdmin,
  signOutAdmin,
  updateAdminUserPostingPermissions,
  updateAdminOrderStatus,
} from '@/lib/admin';
import { fetchAds, getConditionLabel } from '@/lib/ads';
import { getCategoryBySlug } from '@/lib/mock-data';
import { getLocalizedText, languageMeta, type Language } from '@/lib/i18n';
import { useI18n } from '@/components/providers/LocaleProvider';
import type { Ad, AdminProfile, OrderRequest, OrderRequestStatus, PostingPermissions, UserProfile } from '@/lib/types';

type PostingPermissionKey = keyof PostingPermissions;

const adminPageTranslations = {
  uz: {
    orderStatuses: {
      new: 'Yangi',
      contacted: 'Bog‘langan',
      completed: 'Yakunlangan',
    },
    loadFailedTitle: 'Admin panelni yuklab bo‘lmadi',
    loadFailedDescription: 'Qaytadan login qilib davom eting.',
    loginSuccessTitle: 'Admin panelga kirildi',
    loginSuccessDescription: 'Buyurtmalar ro‘yxati yangilanmoqda.',
    loginFailedTitle: 'Login amalga oshmadi',
    loginFailedDescription: 'Login yoki parolni qayta tekshirib ko‘ring.',
    signOutTitle: 'Admin paneldan chiqildi',
    signOutDescription: 'Sessiya yopildi.',
    statusUpdatedTitle: 'Status yangilandi',
    statusUpdatedDescription: (status: string) => `Buyurtma holati "${status}" ga o‘zgartirildi.`,
    statusFailedTitle: 'Status yangilanmadi',
    statusFailedDescription: 'Qaytadan urinib ko‘ring.',
    adDeletedTitle: 'Eʼlon o‘chirildi',
    adDeletedDescription: 'Eʼlon admin paneldan muvaffaqiyatli olib tashlandi.',
    adDeleteFailedTitle: 'Eʼlon o‘chirilmadi',
    adDeleteFailedDescription: 'Qaytadan urinib ko‘ring.',
    heroBadge: 'BirJoy admin paneli',
    heroTitle: 'Foydalanuvchilardan kelgan buyurtmalar shu yerga tushadi',
    heroDescription:
      'Yangi so‘rovlarni kuzatish, mijoz bilan bog‘langanini belgilash va yakunlangan buyurtmalarni boshqarish uchun yagona oynacha.',
    activeAdmin: 'Aktiv admin',
    loading: 'Admin maʼlumotlari yuklanmoqda...',
    ordersSectionTitle: 'Buyurtmalar boshqaruvi',
    ordersSectionDescription:
      'Har bir buyurtma eʼlon, mijoz va sotuvchi maʼlumotlari bilan saqlanadi.',
    refresh: 'Yangilash',
    signOut: 'Chiqish',
    totalOrders: 'Jami buyurtmalar',
    ordersTableTitle: 'Kelgan buyurtmalar',
    ordersTableDescription:
      'So‘nggi buyurtmalar tepada ko‘rinadi. Statusni shu jadvaldan o‘zgartirish mumkin.',
    emptyOrdersTitle: 'Hozircha buyurtmalar yo‘q',
    emptyOrdersDescription:
      'Foydalanuvchilar eʼlon ichidagi buyurtma formasini yuborganda shu yerda ko‘rinadi.',
    adColumn: 'Eʼlon',
    customerColumn: 'Mijoz',
    sellerColumn: 'Sotuvchi',
    statusColumn: 'Status',
    dateColumn: 'Sana',
    messageColumn: 'Xabar',
    statusPlaceholder: 'Status tanlang',
    emptyMessage: 'Izoh qoldirilmagan',
    adsTableTitle: 'Eʼlonlar boshqaruvi',
    adsTableDescription:
      'Admin barcha eʼlonlarni ko‘rib chiqishi va kerak bo‘lsa o‘chirishi mumkin.',
    usersTableTitle: 'Foydalanuvchi ruxsatlari',
    usersTableDescription:
      'Market va taomlar bo‘limiga kim eʼlon bera olishini shu yerda boshqaring.',
    emptyUsersTitle: 'Hozircha foydalanuvchilar yo‘q',
    emptyUsersDescription: 'Ro‘yxatdan o‘tgan foydalanuvchilar shu jadvalda ko‘rinadi.',
    emptyAdsTitle: 'Hozircha eʼlonlar yo‘q',
    emptyAdsDescription: 'Yangi eʼlonlar joylanganda shu jadvalda paydo bo‘ladi.',
    userColumn: 'Foydalanuvchi',
    contactColumn: 'Aloqa',
    marketPermissionColumn: 'Market',
    foodPermissionColumn: 'Taomlar',
    joinedColumn: 'Qo‘shilgan',
    approvedPermission: 'Ruxsat bor',
    pendingPermission: 'Kutilmoqda',
    grantPermission: 'Ruxsat berish',
    revokePermission: 'Bekor qilish',
    permissionUpdatedTitle: 'Ruxsat yangilandi',
    permissionUpdatedDescription: 'Foydalanuvchi posting ruxsati saqlandi.',
    permissionUpdateFailedTitle: 'Ruxsat yangilanmadi',
    permissionUpdateFailedDescription: 'Qaytadan urinib ko‘ring.',
    categoryColumn: 'Kategoriya',
    conditionColumn: 'Holati',
    actionColumn: 'Amal',
    view: 'Ko‘rish',
    delete: 'O‘chirish',
    activeStatus: 'Faol',
    pendingStatus: 'Kutilmoqda',
    flaggedStatus: 'Flag qilingan',
    soldStatus: 'Sotildi',
    deleteConfirmTitle: 'Eʼlonni o‘chirasizmi?',
    deleteConfirmDescription:
      'Bu amal qaytarilmaydi. Eʼlon marketplace ichidan olib tashlanadi, lekin eski buyurtma yozuvlari saqlanib qoladi.',
    cancel: 'Bekor qilish',
    loginCardTitle: 'Admin login',
    loginCardDescription: 'Buyurtmalar paneliga kirish uchun admin login va parolni kiriting.',
    loginLabel: 'Login',
    passwordLabel: 'Parol',
    passwordPlaceholder: 'Parolni kiriting',
    loginAction: 'Admin panelga kirish',
  },
  ru: {
    orderStatuses: {
      new: 'Новая',
      contacted: 'Связались',
      completed: 'Завершена',
    },
    loadFailedTitle: 'Не удалось загрузить админ-панель',
    loadFailedDescription: 'Войдите заново и попробуйте еще раз.',
    loginSuccessTitle: 'Вход в админ-панель выполнен',
    loginSuccessDescription: 'Список заявок обновляется.',
    loginFailedTitle: 'Не удалось войти',
    loginFailedDescription: 'Проверьте логин и пароль еще раз.',
    signOutTitle: 'Вы вышли из админ-панели',
    signOutDescription: 'Сессия завершена.',
    statusUpdatedTitle: 'Статус обновлен',
    statusUpdatedDescription: (status: string) => `Статус заявки изменен на "${status}".`,
    statusFailedTitle: 'Статус не обновлен',
    statusFailedDescription: 'Попробуйте еще раз.',
    adDeletedTitle: 'Объявление удалено',
    adDeletedDescription: 'Объявление успешно удалено из админ-панели.',
    adDeleteFailedTitle: 'Не удалось удалить объявление',
    adDeleteFailedDescription: 'Попробуйте еще раз.',
    heroBadge: 'Админ-панель BirJoy',
    heroTitle: 'Сюда попадают заявки от пользователей',
    heroDescription:
      'Единое окно для отслеживания новых запросов, отметки связи с клиентом и управления завершенными заявками.',
    activeAdmin: 'Активный админ',
    loading: 'Загружаются данные администратора...',
    ordersSectionTitle: 'Управление заявками',
    ordersSectionDescription:
      'Каждая заявка хранится вместе с данными объявления, покупателя и продавца.',
    refresh: 'Обновить',
    signOut: 'Выйти',
    totalOrders: 'Всего заявок',
    ordersTableTitle: 'Входящие заявки',
    ordersTableDescription:
      'Последние заявки отображаются сверху. Статус можно менять прямо в таблице.',
    emptyOrdersTitle: 'Пока нет заявок',
    emptyOrdersDescription:
      'Здесь появятся заявки, когда пользователи отправят форму внутри объявления.',
    adColumn: 'Объявление',
    customerColumn: 'Клиент',
    sellerColumn: 'Продавец',
    statusColumn: 'Статус',
    dateColumn: 'Дата',
    messageColumn: 'Сообщение',
    statusPlaceholder: 'Выберите статус',
    emptyMessage: 'Комментарий не оставлен',
    adsTableTitle: 'Управление объявлениями',
    adsTableDescription:
      'Администратор может просматривать все объявления и при необходимости удалять их.',
    usersTableTitle: 'Разрешения пользователей',
    usersTableDescription:
      'Управляйте тем, кто может публиковать объявления в разделах Market и Еда.',
    emptyUsersTitle: 'Пользователей пока нет',
    emptyUsersDescription: 'Зарегистрированные пользователи будут показаны в этой таблице.',
    emptyAdsTitle: 'Пока нет объявлений',
    emptyAdsDescription: 'Когда появятся новые объявления, они будут показаны в этой таблице.',
    userColumn: 'Пользователь',
    contactColumn: 'Контакт',
    marketPermissionColumn: 'Market',
    foodPermissionColumn: 'Еда',
    joinedColumn: 'Дата регистрации',
    approvedPermission: 'Разрешено',
    pendingPermission: 'Ожидает',
    grantPermission: 'Разрешить',
    revokePermission: 'Отменить',
    permissionUpdatedTitle: 'Разрешение обновлено',
    permissionUpdatedDescription: 'Права на публикацию сохранены.',
    permissionUpdateFailedTitle: 'Не удалось обновить разрешение',
    permissionUpdateFailedDescription: 'Попробуйте еще раз.',
    categoryColumn: 'Категория',
    conditionColumn: 'Состояние',
    actionColumn: 'Действие',
    view: 'Открыть',
    delete: 'Удалить',
    activeStatus: 'Активно',
    pendingStatus: 'Ожидает',
    flaggedStatus: 'Помечено',
    soldStatus: 'Продано',
    deleteConfirmTitle: 'Удалить объявление?',
    deleteConfirmDescription:
      'Это действие необратимо. Объявление исчезнет из маркетплейса, но старые записи заявок сохранятся.',
    cancel: 'Отмена',
    loginCardTitle: 'Вход для администратора',
    loginCardDescription: 'Введите логин и пароль администратора, чтобы открыть панель заявок.',
    loginLabel: 'Логин',
    passwordLabel: 'Пароль',
    passwordPlaceholder: 'Введите пароль',
    loginAction: 'Войти в админ-панель',
  },
  en: {
    orderStatuses: {
      new: 'New',
      contacted: 'Contacted',
      completed: 'Completed',
    },
    loadFailedTitle: 'Could not load the admin panel',
    loadFailedDescription: 'Please sign in again and continue.',
    loginSuccessTitle: 'Signed in to the admin panel',
    loginSuccessDescription: 'Refreshing the order list.',
    loginFailedTitle: 'Sign-in failed',
    loginFailedDescription: 'Please recheck the login and password.',
    signOutTitle: 'Signed out of the admin panel',
    signOutDescription: 'The session has been closed.',
    statusUpdatedTitle: 'Status updated',
    statusUpdatedDescription: (status: string) => `The order status was changed to "${status}".`,
    statusFailedTitle: 'Status was not updated',
    statusFailedDescription: 'Please try again.',
    adDeletedTitle: 'Listing deleted',
    adDeletedDescription: 'The listing was successfully removed from the admin panel.',
    adDeleteFailedTitle: 'Listing was not deleted',
    adDeleteFailedDescription: 'Please try again.',
    heroBadge: 'BirJoy admin panel',
    heroTitle: 'User order requests land here',
    heroDescription:
      'A single place to monitor new requests, mark customer follow-ups, and manage completed orders.',
    activeAdmin: 'Active admin',
    loading: 'Loading admin data...',
    ordersSectionTitle: 'Order management',
    ordersSectionDescription:
      'Each order is stored together with listing, customer, and seller details.',
    refresh: 'Refresh',
    signOut: 'Sign out',
    totalOrders: 'Total orders',
    ordersTableTitle: 'Incoming orders',
    ordersTableDescription:
      'Newest requests appear first. You can change the status directly from this table.',
    emptyOrdersTitle: 'No orders yet',
    emptyOrdersDescription:
      'Orders will appear here when users submit the request form inside a listing.',
    adColumn: 'Listing',
    customerColumn: 'Customer',
    sellerColumn: 'Seller',
    statusColumn: 'Status',
    dateColumn: 'Date',
    messageColumn: 'Message',
    statusPlaceholder: 'Select a status',
    emptyMessage: 'No note provided',
    adsTableTitle: 'Listing management',
    adsTableDescription:
      'The admin can review every listing and remove any of them when needed.',
    usersTableTitle: 'User permissions',
    usersTableDescription:
      'Control who can post listings in the Market and Food sections.',
    emptyUsersTitle: 'No users yet',
    emptyUsersDescription: 'Registered users will appear in this table.',
    emptyAdsTitle: 'No listings yet',
    emptyAdsDescription: 'New listings will appear in this table when they are posted.',
    userColumn: 'User',
    contactColumn: 'Contact',
    marketPermissionColumn: 'Market',
    foodPermissionColumn: 'Food',
    joinedColumn: 'Joined',
    approvedPermission: 'Approved',
    pendingPermission: 'Pending',
    grantPermission: 'Grant',
    revokePermission: 'Revoke',
    permissionUpdatedTitle: 'Permission updated',
    permissionUpdatedDescription: 'The posting permission was saved.',
    permissionUpdateFailedTitle: 'Permission was not updated',
    permissionUpdateFailedDescription: 'Please try again.',
    categoryColumn: 'Category',
    conditionColumn: 'Condition',
    actionColumn: 'Action',
    view: 'View',
    delete: 'Delete',
    activeStatus: 'Active',
    pendingStatus: 'Pending',
    flaggedStatus: 'Flagged',
    soldStatus: 'Sold',
    deleteConfirmTitle: 'Delete this listing?',
    deleteConfirmDescription:
      'This action cannot be undone. The listing will be removed from the marketplace, but existing order records will remain.',
    cancel: 'Cancel',
    loginCardTitle: 'Admin sign in',
    loginCardDescription: 'Enter the admin login and password to open the order dashboard.',
    loginLabel: 'Login',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter the password',
    loginAction: 'Sign in to admin panel',
  },
} as const;

function formatPrice(price: number, locale: Language) {
  return new Intl.NumberFormat(languageMeta[locale].numberLocale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(value: string, locale: Language) {
  return new Intl.DateTimeFormat(languageMeta[locale].numberLocale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getOrderStatusOptions(locale: Language) {
  const orderStatuses = adminPageTranslations[locale].orderStatuses;

  return (Object.entries(orderStatuses) as Array<[OrderRequestStatus, string]>).map(
    ([value, label]) => ({
      value,
      label,
    })
  );
}

function getStatusLabel(status: OrderRequestStatus, locale: Language) {
  return adminPageTranslations[locale].orderStatuses[status];
}

function getStatusBadgeClassName(status: OrderRequestStatus) {
  if (status === 'completed') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (status === 'contacted') {
    return 'bg-amber-50 text-amber-700';
  }

  return 'bg-blue-50 text-blue-700';
}

function getPermissionBadgeClassName(isApproved: boolean) {
  return isApproved
    ? 'bg-emerald-50 text-emerald-700'
    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200';
}

export default function AdminPage() {
  const { toast } = useToast();
  const { locale } = useI18n();
  const copy = adminPageTranslations[locale];
  const orderStatusOptions = getOrderStatusOptions(locale);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [orders, setOrders] = useState<OrderRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adPendingDeletion, setAdPendingDeletion] = useState<Ad | null>(null);
  const [deletingAdId, setDeletingAdId] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const [updatingPermissionTarget, setUpdatingPermissionTarget] = useState('');
  const [formData, setFormData] = useState({
    login: '',
    password: '',
  });

  const loadDashboard = async (currentAdmin?: AdminProfile | null) => {
    setIsRefreshing(true);

    try {
      const [nextOrders, nextAds, nextUsers] = await Promise.all([
        fetchAdminOrders(),
        fetchAds({
          fields: 'card',
          limit: 100,
        }),
        fetchAdminUsers(),
      ]);
      setOrders(nextOrders);
      setAds(nextAds);
      setUsers(nextUsers);
      setAdmin(currentAdmin || getStoredAdminProfile() || fallbackAdminProfile);
    } catch (error) {
      signOutAdmin();
      setAdmin(null);
      setAds([]);
      setOrders([]);
      setUsers([]);
      toast({
        title: copy.loadFailedTitle,
        description: error instanceof Error ? error.message : copy.loadFailedDescription,
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
      setIsReady(true);
    }
  };

  useEffect(() => {
    const storedAdmin = getStoredAdminProfile();
    const token = getStoredAdminToken();

    if (storedAdmin) {
      setAdmin(storedAdmin);
    } else if (token) {
      setAdmin(fallbackAdminProfile);
    }

    if (!token) {
      setIsReady(true);
      return;
    }

    void loadDashboard(storedAdmin);
  }, []);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const nextAdmin = await loginAdmin(formData);
      setAdmin(nextAdmin);
      toast({
        title: copy.loginSuccessTitle,
        description: copy.loginSuccessDescription,
      });
      await loadDashboard(nextAdmin);
      setFormData((previous) => ({
        ...previous,
        password: '',
      }));
    } catch (error) {
      toast({
        title: copy.loginFailedTitle,
        description: error instanceof Error ? error.message : copy.loginFailedDescription,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      setIsReady(true);
    }
  };

  const handleSignOut = () => {
    signOutAdmin();
    setAdmin(null);
    setAds([]);
    setOrders([]);
    setUsers([]);
    toast({
      title: copy.signOutTitle,
      description: copy.signOutDescription,
    });
  };

  const handleOrderStatusChange = async (orderId: string, status: OrderRequestStatus) => {
    setUpdatingOrderId(orderId);

    try {
      const updatedOrder = await updateAdminOrderStatus(orderId, status);
      setOrders((previous) =>
        previous.map((order) => (order.id === orderId ? updatedOrder : order))
      );
      toast({
        title: copy.statusUpdatedTitle,
        description: copy.statusUpdatedDescription(getStatusLabel(status, locale)),
      });
    } catch (error) {
      toast({
        title: copy.statusFailedTitle,
        description: error instanceof Error ? error.message : copy.statusFailedDescription,
        variant: 'destructive',
      });
    } finally {
      setUpdatingOrderId('');
    }
  };

  const handleDeleteAd = async (adId: string) => {
    setAdPendingDeletion(null);
    setDeletingAdId(adId);

    try {
      await deleteAdminAd(adId);
      setAds((previous) => previous.filter((ad) => ad.id !== adId));
      toast({
        title: copy.adDeletedTitle,
        description: copy.adDeletedDescription,
      });
    } catch (error) {
      toast({
        title: copy.adDeleteFailedTitle,
        description: error instanceof Error ? error.message : copy.adDeleteFailedDescription,
        variant: 'destructive',
      });
    } finally {
      setDeletingAdId('');
    }
  };

  const handlePermissionUpdate = async (
    userId: string,
    permission: PostingPermissionKey,
    nextValue: boolean
  ) => {
    setUpdatingPermissionTarget(`${userId}:${permission}`);

    try {
      const updatedUser = await updateAdminUserPostingPermissions(userId, {
        [permission]: nextValue,
      });

      setUsers((previous) =>
        previous.map((user) => (user.id === userId ? updatedUser : user))
      );

      toast({
        title: copy.permissionUpdatedTitle,
        description: copy.permissionUpdatedDescription,
      });
    } catch (error) {
      toast({
        title: copy.permissionUpdateFailedTitle,
        description:
          error instanceof Error ? error.message : copy.permissionUpdateFailedDescription,
        variant: 'destructive',
      });
    } finally {
      setUpdatingPermissionTarget('');
    }
  };

  const newOrdersCount = orders.filter((order) => order.status === 'new').length;
  const contactedOrdersCount = orders.filter((order) => order.status === 'contacted').length;
  const completedOrdersCount = orders.filter((order) => order.status === 'completed').length;
  const deleteDialogOpen = Boolean(adPendingDeletion);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(135deg,_#071c55_0%,_#0b48d6_48%,_#ff8d2a_120%)] p-5 text-white shadow-[0_28px_70px_rgba(7,28,85,0.16)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold backdrop-blur">
                <ShieldCheck className="h-4 w-4" />
                {copy.heroBadge}
              </div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{copy.heroTitle}</h1>
              <p className="mt-3 max-w-xl text-white/85">{copy.heroDescription}</p>
            </div>

            {admin ? (
              <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                <p className="text-sm text-white/80">{copy.activeAdmin}</p>
                <p className="mt-1 text-xl font-semibold">{admin.name}</p>
                <p className="text-sm text-white/75">{admin.login}</p>
              </div>
            ) : null}
          </div>
        </section>

        {!isReady ? (
          <div className="rounded-3xl border border-border/70 bg-card/92 px-6 py-16 text-center shadow-sm">
            <Loader2 className="mx-auto mb-4 h-6 w-6 animate-spin text-primary" />
            <p className="text-muted-foreground">{copy.loading}</p>
          </div>
        ) : admin ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{copy.ordersSectionTitle}</h2>
                <p className="text-muted-foreground">{copy.ordersSectionDescription}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="w-full gap-2 min-[481px]:w-auto"
                  onClick={() => void loadDashboard(admin)}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {copy.refresh}
                </Button>
                <Button variant="outline" className="w-full gap-2 min-[481px]:w-auto" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  {copy.signOut}
                </Button>
              </div>
            </div>

            <section className="grid grid-cols-1 gap-4 min-[481px]:grid-cols-2 xl:grid-cols-4">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardDescription>{copy.totalOrders}</CardDescription>
                  <CardTitle className="text-3xl">{orders.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardDescription>{copy.orderStatuses.new}</CardDescription>
                  <CardTitle className="text-3xl text-blue-700">{newOrdersCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardDescription>{copy.orderStatuses.contacted}</CardDescription>
                  <CardTitle className="text-3xl text-amber-700">{contactedOrdersCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardDescription>{copy.orderStatuses.completed}</CardDescription>
                  <CardTitle className="text-3xl text-emerald-700">{completedOrdersCount}</CardTitle>
                </CardHeader>
              </Card>
            </section>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>{copy.ordersTableTitle}</CardTitle>
                <CardDescription>{copy.ordersTableDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="rounded-3xl border border-dashed px-6 py-16 text-center">
                    <p className="text-lg font-semibold">{copy.emptyOrdersTitle}</p>
                    <p className="mt-2 text-muted-foreground">{copy.emptyOrdersDescription}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{copy.adColumn}</TableHead>
                        <TableHead>{copy.customerColumn}</TableHead>
                        <TableHead>{copy.sellerColumn}</TableHead>
                        <TableHead>{copy.statusColumn}</TableHead>
                        <TableHead>{copy.dateColumn}</TableHead>
                        <TableHead>{copy.messageColumn}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="min-w-[220px]">
                            <p className="font-semibold text-foreground">{order.adTitle}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatPrice(order.adPrice, locale)}
                            </p>
                          </TableCell>
                          <TableCell className="min-w-[220px]">
                            <p className="font-semibold text-foreground">{order.customerName}</p>
                            <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                            {order.customerEmail ? (
                              <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
                            ) : null}
                          </TableCell>
                          <TableCell className="min-w-[180px]">
                            <p className="font-semibold text-foreground">{order.sellerName}</p>
                            <p className="text-sm text-muted-foreground">{order.sellerPhone}</p>
                          </TableCell>
                          <TableCell className="min-w-[180px]">
                            <div className="space-y-3">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClassName(order.status)}`}
                              >
                                {getStatusLabel(order.status, locale)}
                              </span>
                              <Select
                                value={order.status}
                                onValueChange={(value) =>
                                  void handleOrderStatusChange(order.id, value as OrderRequestStatus)
                                }
                                disabled={updatingOrderId === order.id}
                              >
                                <SelectTrigger className="h-10 w-full min-[481px]:w-[170px]">
                                  <SelectValue placeholder={copy.statusPlaceholder} />
                                </SelectTrigger>
                                <SelectContent>
                                  {orderStatusOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[160px] text-sm text-muted-foreground">
                            {formatDate(order.createdAt, locale)}
                          </TableCell>
                          <TableCell className="min-w-[220px] text-sm text-muted-foreground">
                            {order.message || copy.emptyMessage}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>{copy.usersTableTitle}</CardTitle>
                <CardDescription>{copy.usersTableDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <div className="rounded-3xl border border-dashed px-6 py-16 text-center">
                    <p className="text-lg font-semibold">{copy.emptyUsersTitle}</p>
                    <p className="mt-2 text-muted-foreground">{copy.emptyUsersDescription}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{copy.userColumn}</TableHead>
                        <TableHead>{copy.contactColumn}</TableHead>
                        <TableHead>{copy.marketPermissionColumn}</TableHead>
                        <TableHead>{copy.foodPermissionColumn}</TableHead>
                        <TableHead>{copy.joinedColumn}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => {
                        const locationLabel = user.location ? getLocalizedText(user.location, locale) : '—';
                        const marketTarget = `${user.id}:market`;
                        const foodTarget = `${user.id}:food`;

                        return (
                          <TableRow key={user.id}>
                            <TableCell className="min-w-[220px]">
                              <p className="font-semibold text-foreground">{user.name || '—'}</p>
                              <p className="text-sm text-muted-foreground">{user.email || '—'}</p>
                            </TableCell>
                            <TableCell className="min-w-[220px]">
                              <p className="text-sm text-foreground">{user.phone || '—'}</p>
                              <p className="text-sm text-muted-foreground">{locationLabel}</p>
                            </TableCell>
                            <TableCell className="min-w-[190px]">
                              <div className="space-y-3">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPermissionBadgeClassName(user.postingPermissions.market)}`}
                                >
                                  {user.postingPermissions.market
                                    ? copy.approvedPermission
                                    : copy.pendingPermission}
                                </span>
                                <Button
                                  variant={user.postingPermissions.market ? 'outline' : 'default'}
                                  size="sm"
                                  className="w-full min-[481px]:w-auto"
                                  disabled={updatingPermissionTarget === marketTarget}
                                  onClick={() =>
                                    void handlePermissionUpdate(
                                      user.id,
                                      'market',
                                      !user.postingPermissions.market
                                    )
                                  }
                                >
                                  {updatingPermissionTarget === marketTarget ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : user.postingPermissions.market ? (
                                    copy.revokePermission
                                  ) : (
                                    copy.grantPermission
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[190px]">
                              <div className="space-y-3">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPermissionBadgeClassName(user.postingPermissions.food)}`}
                                >
                                  {user.postingPermissions.food
                                    ? copy.approvedPermission
                                    : copy.pendingPermission}
                                </span>
                                <Button
                                  variant={user.postingPermissions.food ? 'outline' : 'default'}
                                  size="sm"
                                  className="w-full min-[481px]:w-auto"
                                  disabled={updatingPermissionTarget === foodTarget}
                                  onClick={() =>
                                    void handlePermissionUpdate(
                                      user.id,
                                      'food',
                                      !user.postingPermissions.food
                                    )
                                  }
                                >
                                  {updatingPermissionTarget === foodTarget ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : user.postingPermissions.food ? (
                                    copy.revokePermission
                                  ) : (
                                    copy.grantPermission
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[160px] text-sm text-muted-foreground">
                              {formatDate(user.createdAt || user.updatedAt || new Date().toISOString(), locale)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>{copy.adsTableTitle}</CardTitle>
                <CardDescription>{copy.adsTableDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                {ads.length === 0 ? (
                  <div className="rounded-3xl border border-dashed px-6 py-16 text-center">
                    <p className="text-lg font-semibold">{copy.emptyAdsTitle}</p>
                    <p className="mt-2 text-muted-foreground">{copy.emptyAdsDescription}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{copy.adColumn}</TableHead>
                        <TableHead>{copy.categoryColumn}</TableHead>
                        <TableHead>{copy.sellerColumn}</TableHead>
                        <TableHead>{copy.conditionColumn}</TableHead>
                        <TableHead>{copy.dateColumn}</TableHead>
                        <TableHead className="text-right">{copy.actionColumn}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ads.map((ad) => {
                        const category = getCategoryBySlug(ad.category);
                        const categoryName = category ? getLocalizedText(category.name, locale) : ad.category;
                        const adTitle = getLocalizedText(ad.title, locale);
                        const adLocation = getLocalizedText(ad.location, locale);

                        return (
                          <TableRow key={ad.id}>
                            <TableCell className="min-w-[260px]">
                              <p className="font-semibold text-foreground">{adTitle}</p>
                              <p className="text-sm text-muted-foreground">{adLocation}</p>
                            </TableCell>
                            <TableCell className="min-w-[180px]">
                              <p className="font-medium text-foreground">{categoryName}</p>
                              <p className="text-sm text-muted-foreground">
                                {getConditionLabel(ad.condition, locale)}
                              </p>
                            </TableCell>
                            <TableCell className="min-w-[220px]">
                              <p className="font-semibold text-foreground">{ad.userName}</p>
                              <p className="text-sm text-muted-foreground">{ad.sellerPhone}</p>
                            </TableCell>
                            <TableCell className="min-w-[140px]">
                              <Badge variant={ad.status === 'active' ? 'default' : 'secondary'}>
                                {ad.status === 'active'
                                  ? copy.activeStatus
                                  : ad.status === 'pending'
                                    ? copy.pendingStatus
                                    : ad.status === 'flagged'
                                      ? copy.flaggedStatus
                                      : copy.soldStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="min-w-[160px] text-sm text-muted-foreground">
                              {formatDate(ad.createdAt, locale)}
                            </TableCell>
                            <TableCell className="min-w-[190px] text-right">
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button asChild variant="outline" size="sm" className="gap-2">
                                  <Link
                                    href={`/ads/${ad.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    prefetch={false}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    {copy.view}
                                  </Link>
                                </Button>

                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="gap-2"
                                  disabled={deletingAdId === ad.id}
                                  onClick={() => setAdPendingDeletion(ad)}
                                >
                                  {deletingAdId === ad.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                  {copy.delete}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <AlertDialog
              open={deleteDialogOpen}
              onOpenChange={(open) => {
                if (!open) {
                  setAdPendingDeletion(null);
                }
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{copy.deleteConfirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{copy.deleteConfirmDescription}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={Boolean(deletingAdId)}>{copy.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={!adPendingDeletion || deletingAdId === adPendingDeletion.id}
                    onClick={() => {
                      if (!adPendingDeletion) {
                        return;
                      }

                      void handleDeleteAd(adPendingDeletion.id);
                    }}
                  >
                    {copy.delete}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <div className="mx-auto max-w-md">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>{copy.loginCardTitle}</CardTitle>
                <CardDescription>{copy.loginCardDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(event) => void handleLogin(event)} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="admin-login">{copy.loginLabel}</Label>
                    <Input
                      id="admin-login"
                      value={formData.login}
                      onChange={(event) =>
                        setFormData((previous) => ({
                          ...previous,
                          login: event.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">{copy.passwordLabel}</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      value={formData.password}
                      onChange={(event) =>
                        setFormData((previous) => ({
                          ...previous,
                          password: event.target.value,
                        }))
                      }
                      placeholder={copy.passwordPlaceholder}
                      required
                    />
                  </div>
                  <Button type="submit" className="h-12 w-full gap-2 text-base font-semibold" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogIn className="h-4 w-4" />
                    )}
                    {copy.loginAction}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
