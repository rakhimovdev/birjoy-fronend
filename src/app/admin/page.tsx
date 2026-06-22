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
  AlertDialogTrigger,
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
  fetchAdminOrders,
  getStoredAdminProfile,
  getStoredAdminToken,
  loginAdmin,
  signOutAdmin,
  updateAdminOrderStatus,
} from '@/lib/admin';
import { fetchAds, getConditionLabel } from '@/lib/ads';
import { getCategoryBySlug } from '@/lib/mock-data';
import type { Ad, AdminProfile, OrderRequest, OrderRequestStatus } from '@/lib/types';

const orderStatusOptions: Array<{ value: OrderRequestStatus; label: string }> = [
  { value: 'new', label: 'Yangi' },
  { value: 'contacted', label: 'Bog‘langan' },
  { value: 'completed', label: 'Yakunlangan' },
];

function formatPrice(price: number) {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('uz-UZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getStatusLabel(status: OrderRequestStatus) {
  return orderStatusOptions.find((item) => item.value === status)?.label || status;
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

export default function AdminPage() {
  const { toast } = useToast();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [orders, setOrders] = useState<OrderRequest[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingAdId, setDeletingAdId] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const [formData, setFormData] = useState({
    login: 'birjoy-admin',
    password: '',
  });
  const fallbackAdminProfile: AdminProfile = {
    login: 'birjoy-admin',
    name: 'BirJoy Admin',
    role: 'admin',
  };

  const loadDashboard = async (currentAdmin?: AdminProfile | null) => {
    setIsRefreshing(true);

    try {
      const [nextOrders, nextAds] = await Promise.all([fetchAdminOrders(), fetchAds()]);
      setOrders(nextOrders);
      setAds(nextAds);
      setAdmin(currentAdmin || getStoredAdminProfile() || fallbackAdminProfile);
    } catch (error) {
      signOutAdmin();
      setAdmin(null);
      setAds([]);
      setOrders([]);
      toast({
        title: 'Admin panelni yuklab bo‘lmadi',
        description:
          error instanceof Error ? error.message : 'Qaytadan login qilib davom eting.',
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
        title: 'Admin panelga kirildi',
        description: 'Buyurtmalar ro‘yxati yangilanmoqda.',
      });
      await loadDashboard(nextAdmin);
      setFormData((previous) => ({
        ...previous,
        password: '',
      }));
    } catch (error) {
      toast({
        title: 'Login amalga oshmadi',
        description:
          error instanceof Error ? error.message : 'Login yoki parolni qayta tekshirib ko‘ring.',
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
    toast({
      title: 'Admin paneldan chiqildi',
      description: 'Sessiya yopildi.',
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
        title: 'Status yangilandi',
        description: `Buyurtma holati "${getStatusLabel(status)}" ga o‘zgartirildi.`,
      });
    } catch (error) {
      toast({
        title: 'Status yangilanmadi',
        description:
          error instanceof Error ? error.message : 'Qaytadan urinib ko‘ring.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingOrderId('');
    }
  };

  const handleDeleteAd = async (adId: string) => {
    setDeletingAdId(adId);

    try {
      await deleteAdminAd(adId);
      setAds((previous) => previous.filter((ad) => ad.id !== adId));
      toast({
        title: 'Eʼlon o‘chirildi',
        description: 'Eʼlon admin paneldan muvaffaqiyatli olib tashlandi.',
      });
    } catch (error) {
      toast({
        title: 'Eʼlon o‘chirilmadi',
        description:
          error instanceof Error ? error.message : 'Qaytadan urinib ko‘ring.',
        variant: 'destructive',
      });
    } finally {
      setDeletingAdId('');
    }
  };

  const newOrdersCount = orders.filter((order) => order.status === 'new').length;
  const contactedOrdersCount = orders.filter((order) => order.status === 'contacted').length;
  const completedOrdersCount = orders.filter((order) => order.status === 'completed').length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(135deg,_#071c55_0%,_#0b48d6_48%,_#ff8d2a_120%)] p-8 text-white shadow-[0_28px_70px_rgba(7,28,85,0.16)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold backdrop-blur">
                <ShieldCheck className="h-4 w-4" />
                BirJoy admin paneli
              </div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Foydalanuvchilardan kelgan buyurtmalar shu yerga tushadi
              </h1>
              <p className="mt-3 max-w-xl text-white/85">
                Yangi so‘rovlarni kuzatish, mijoz bilan bog‘langanini belgilash va yakunlangan
                buyurtmalarni boshqarish uchun yagona oynacha.
              </p>
            </div>

            {admin ? (
              <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                <p className="text-sm text-white/80">Aktiv admin</p>
                <p className="mt-1 text-xl font-semibold">{admin.name}</p>
                <p className="text-sm text-white/75">{admin.login}</p>
              </div>
            ) : null}
          </div>
        </section>

        {!isReady ? (
          <div className="rounded-3xl border bg-white px-6 py-16 text-center shadow-sm">
            <Loader2 className="mx-auto mb-4 h-6 w-6 animate-spin text-primary" />
            <p className="text-muted-foreground">Admin maʼlumotlari yuklanmoqda...</p>
          </div>
        ) : admin ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Buyurtmalar boshqaruvi</h2>
                <p className="text-muted-foreground">
                  Har bir buyurtma eʼlon, mijoz va sotuvchi maʼlumotlari bilan saqlanadi.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => void loadDashboard(admin)}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Yangilash
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  Chiqish
                </Button>
              </div>
            </div>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardDescription>Jami buyurtmalar</CardDescription>
                  <CardTitle className="text-3xl">{orders.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardDescription>Yangi</CardDescription>
                  <CardTitle className="text-3xl text-blue-700">{newOrdersCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardDescription>Bog‘langan</CardDescription>
                  <CardTitle className="text-3xl text-amber-700">{contactedOrdersCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardDescription>Yakunlangan</CardDescription>
                  <CardTitle className="text-3xl text-emerald-700">{completedOrdersCount}</CardTitle>
                </CardHeader>
              </Card>
            </section>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Kelgan buyurtmalar</CardTitle>
                <CardDescription>
                  So‘nggi buyurtmalar tepada ko‘rinadi. Statusni shu jadvaldan o‘zgartirish mumkin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="rounded-3xl border border-dashed px-6 py-16 text-center">
                    <p className="text-lg font-semibold">Hozircha buyurtmalar yo‘q</p>
                    <p className="mt-2 text-muted-foreground">
                      Foydalanuvchilar eʼlon ichidagi buyurtma formasini yuborganda shu yerda
                      ko‘rinadi.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Eʼlon</TableHead>
                        <TableHead>Mijoz</TableHead>
                        <TableHead>Sotuvchi</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sana</TableHead>
                        <TableHead>Xabar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="min-w-[220px]">
                            <p className="font-semibold text-foreground">{order.adTitle}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatPrice(order.adPrice)}
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
                                {getStatusLabel(order.status)}
                              </span>
                              <Select
                                value={order.status}
                                onValueChange={(value) =>
                                  void handleOrderStatusChange(order.id, value as OrderRequestStatus)
                                }
                                disabled={updatingOrderId === order.id}
                              >
                                <SelectTrigger className="h-10 w-[170px]">
                                  <SelectValue placeholder="Status tanlang" />
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
                            {formatDate(order.createdAt)}
                          </TableCell>
                          <TableCell className="min-w-[220px] text-sm text-muted-foreground">
                            {order.message || 'Izoh qoldirilmagan'}
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
                <CardTitle>Eʼlonlar boshqaruvi</CardTitle>
                <CardDescription>
                  Admin barcha eʼlonlarni ko‘rib chiqishi va kerak bo‘lsa o‘chirishi mumkin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ads.length === 0 ? (
                  <div className="rounded-3xl border border-dashed px-6 py-16 text-center">
                    <p className="text-lg font-semibold">Hozircha eʼlonlar yo‘q</p>
                    <p className="mt-2 text-muted-foreground">
                      Yangi eʼlonlar joylanganda shu jadvalda paydo bo‘ladi.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Eʼlon</TableHead>
                        <TableHead>Kategoriya</TableHead>
                        <TableHead>Sotuvchi</TableHead>
                        <TableHead>Holati</TableHead>
                        <TableHead>Sana</TableHead>
                        <TableHead className="text-right">Amal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ads.map((ad) => {
                        const categoryName = getCategoryBySlug(ad.category)?.name.uz || ad.category;

                        return (
                          <TableRow key={ad.id}>
                            <TableCell className="min-w-[260px]">
                              <p className="font-semibold text-foreground">{ad.title.uz}</p>
                              <p className="text-sm text-muted-foreground">{ad.location.uz}</p>
                            </TableCell>
                            <TableCell className="min-w-[180px]">
                              <p className="font-medium text-foreground">{categoryName}</p>
                              <p className="text-sm text-muted-foreground">
                                {getConditionLabel(ad.condition, 'uz')}
                              </p>
                            </TableCell>
                            <TableCell className="min-w-[220px]">
                              <p className="font-semibold text-foreground">{ad.userName}</p>
                              <p className="text-sm text-muted-foreground">{ad.sellerPhone}</p>
                            </TableCell>
                            <TableCell className="min-w-[140px]">
                              <Badge variant={ad.status === 'active' ? 'default' : 'secondary'}>
                                {ad.status === 'active'
                                  ? 'Faol'
                                  : ad.status === 'pending'
                                    ? 'Kutilmoqda'
                                    : 'Flag qilingan'}
                              </Badge>
                            </TableCell>
                            <TableCell className="min-w-[160px] text-sm text-muted-foreground">
                              {formatDate(ad.createdAt)}
                            </TableCell>
                            <TableCell className="min-w-[190px] text-right">
                              <div className="flex justify-end gap-2">
                                <Button asChild variant="outline" size="sm" className="gap-2">
                                  <Link href={`/ads/${ad.id}`} target="_blank" rel="noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                    Ko‘rish
                                  </Link>
                                </Button>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="gap-2"
                                      disabled={deletingAdId === ad.id}
                                    >
                                      {deletingAdId === ad.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                      O‘chirish
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Eʼlonni o‘chirasizmi?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Bu amal qaytarilmaydi. Eʼlon marketplace ichidan olib
                                        tashlanadi, lekin eski buyurtma yozuvlari saqlanib qoladi.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        disabled={deletingAdId === ad.id}
                                        onClick={() => void handleDeleteAd(ad.id)}
                                      >
                                        O‘chirish
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
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
          </div>
        ) : (
          <div className="mx-auto max-w-md">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Admin login</CardTitle>
                <CardDescription>
                  Buyurtmalar paneliga kirish uchun admin login va parolni kiriting.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(event) => void handleLogin(event)} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="admin-login">Login</Label>
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
                    <Label htmlFor="admin-password">Parol</Label>
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
                      placeholder="Parolni kiriting"
                      required
                    />
                  </div>
                  <Button type="submit" className="h-12 w-full gap-2 text-base font-semibold" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogIn className="h-4 w-4" />
                    )}
                    Admin panelga kirish
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
