'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Ban, Check, ExternalLink, Flag, Loader2, RefreshCw, Trash2, Undo2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  deleteAdminAd,
  fetchAdminReports,
  setAdminUserSuspension,
  updateAdminReportStatus,
  type AdminReport,
  type AdminReportStatus,
} from '@/lib/admin';
import type { Language } from '@/lib/i18n';

const copy = {
  uz: {
    title: 'Shikoyatlar',
    description:
      'Ilovadan kelgan shikoyatlar. Foydalanish shartlariga ko‘ra har biri 24 soat ichida ko‘rib chiqilishi kerak.',
    refresh: 'Yangilash',
    empty: 'Ochiq shikoyat yo‘q.',
    loadFailed: 'Shikoyatlarni yuklab bo‘lmadi.',
    actionFailed: 'Amal bajarilmadi.',
    listing: 'E’lon',
    listingDeleted: 'E’lon allaqachon o‘chirilgan',
    conversation: 'Suhbat',
    reported: 'Shikoyat qilingan',
    comment: 'Izoh',
    suspendedBadge: 'Bloklangan',
    open: 'E’lonni ochish',
    deleteAd: 'E’lonni o‘chirish',
    suspend: 'Foydalanuvchini bloklash',
    unsuspend: 'Blokdan chiqarish',
    reviewed: 'Ko‘rib chiqildi',
    dismiss: 'Rad etish',
    confirmDelete: 'E’lon butunlay o‘chiriladi. Davom etasizmi?',
    confirmSuspend: (name: string) =>
      `${name} bloklansinmi? U tizimga kira olmaydi va joriy sessiyasi yopiladi.`,
    reasons: { spam: 'Spam', scam: 'Firibgarlik', abuse: 'Haqorat', other: 'Boshqa' } as Record<string, string>,
    roles: { seller: 'Sotuvchi', buyer: 'Xaridor' } as Record<string, string>,
  },
  ru: {
    title: 'Жалобы',
    description:
      'Жалобы из приложения. По условиям использования каждую нужно рассмотреть в течение 24 часов.',
    refresh: 'Обновить',
    empty: 'Открытых жалоб нет.',
    loadFailed: 'Не удалось загрузить жалобы.',
    actionFailed: 'Действие не выполнено.',
    listing: 'Объявление',
    listingDeleted: 'Объявление уже удалено',
    conversation: 'Диалог',
    reported: 'На кого жалоба',
    comment: 'Комментарий',
    suspendedBadge: 'Заблокирован',
    open: 'Открыть объявление',
    deleteAd: 'Удалить объявление',
    suspend: 'Заблокировать пользователя',
    unsuspend: 'Разблокировать',
    reviewed: 'Рассмотрено',
    dismiss: 'Отклонить',
    confirmDelete: 'Объявление будет удалено навсегда. Продолжить?',
    confirmSuspend: (name: string) =>
      `Заблокировать ${name}? Пользователь не сможет войти, текущая сессия закроется.`,
    reasons: { spam: 'Спам', scam: 'Мошенничество', abuse: 'Оскорбления', other: 'Другое' } as Record<string, string>,
    roles: { seller: 'Продавец', buyer: 'Покупатель' } as Record<string, string>,
  },
  en: {
    title: 'Reports',
    description:
      'Reports from the apps. The terms of use promise each one is reviewed within 24 hours.',
    refresh: 'Refresh',
    empty: 'No open reports.',
    loadFailed: 'Could not load the reports.',
    actionFailed: 'The action failed.',
    listing: 'Listing',
    listingDeleted: 'The listing is already deleted',
    conversation: 'Conversation',
    reported: 'Reported user',
    comment: 'Comment',
    suspendedBadge: 'Suspended',
    open: 'Open listing',
    deleteAd: 'Delete listing',
    suspend: 'Suspend user',
    unsuspend: 'Lift suspension',
    reviewed: 'Reviewed',
    dismiss: 'Dismiss',
    confirmDelete: 'The listing will be deleted for good. Continue?',
    confirmSuspend: (name: string) =>
      `Suspend ${name}? They will not be able to sign in, and their current session ends.`,
    reasons: { spam: 'Spam', scam: 'Scam', abuse: 'Abuse', other: 'Something else' } as Record<string, string>,
    roles: { seller: 'Seller', buyer: 'Buyer' } as Record<string, string>,
  },
};

// The moderation queue: every open report with what it is about, and the
// actions a moderator takes on it — remove the listing, suspend the user,
// close the report.
export function AdminReportsPanel({ locale }: { locale: Language }) {
  const text = copy[locale] ?? copy.en;
  const { toast } = useToast();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setReports(await fetchAdminReports('open'));
    } catch {
      toast({ variant: 'destructive', title: text.loadFailed });
    } finally {
      setIsLoading(false);
    }
  }, [text.loadFailed, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (report: AdminReport, action: () => Promise<void>) => {
    setBusyId(report.id);
    try {
      await action();
      await load();
    } catch {
      toast({ variant: 'destructive', title: text.actionFailed });
    } finally {
      setBusyId('');
    }
  };

  const close = (report: AdminReport, status: AdminReportStatus) =>
    run(report, () => updateAdminReportStatus(report.id, status));

  const deleteListing = (report: AdminReport) => {
    if (!report.ad || !window.confirm(text.confirmDelete)) return;
    const adId = report.ad.id;
    void run(report, async () => {
      await deleteAdminAd(adId);
      await updateAdminReportStatus(report.id, 'reviewed');
    });
  };

  const toggleSuspension = (report: AdminReport) => {
    const target = report.targetUser;
    if (!target) return;
    if (!target.suspended && !window.confirm(text.confirmSuspend(target.name || target.id))) return;
    void run(report, () => setAdminUserSuspension(target.id, !target.suspended));
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Flag className="h-5 w-5" />
            {text.title}
            {reports.length > 0 ? <Badge variant="destructive">{reports.length}</Badge> : null}
          </h2>
          <p className="text-muted-foreground">{text.description}</p>
        </div>
        <Button
          variant="outline"
          className="w-full gap-2 min-[481px]:w-auto"
          onClick={() => void load()}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {text.refresh}
        </Button>
      </div>

      {!isLoading && reports.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-8 text-center text-muted-foreground">{text.empty}</CardContent>
        </Card>
      ) : null}

      {reports.map((report) => {
        const busy = busyId === report.id;
        const target = report.targetUser;

        return (
          <Card key={report.id} className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{text.reasons[report.reason] ?? report.reason}</Badge>
                <CardDescription>{new Date(report.createdAt).toLocaleString(locale)}</CardDescription>
              </div>
              <CardTitle className="text-lg">
                {report.ad
                  ? `${text.listing}: ${report.ad.title}`
                  : report.conversation
                    ? `${text.conversation}: ${report.conversation.adTitle}`
                    : text.listingDeleted}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {target ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">{text.reported}: </span>
                  <span className="font-semibold">{target.name || target.id}</span>
                  {target.suspended ? (
                    <Badge variant="secondary" className="ml-2">
                      {text.suspendedBadge}
                    </Badge>
                  ) : null}
                </p>
              ) : null}

              {report.text ? (
                <p className="rounded-2xl bg-muted/60 p-3 text-sm">
                  <span className="text-muted-foreground">{text.comment}: </span>
                  {report.text}
                </p>
              ) : null}

              {report.conversation && report.conversation.messages.length > 0 ? (
                <ol className="max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-border/70 p-3 text-sm">
                  {report.conversation.messages.map((message) => (
                    <li key={message.id}>
                      <span className="font-semibold">
                        {text.roles[message.senderRole] ?? message.senderRole}
                        {' · '}
                        {message.senderRole === 'seller'
                          ? report.conversation?.sellerName
                          : report.conversation?.buyerName}
                        :{' '}
                      </span>
                      {message.text}
                    </li>
                  ))}
                </ol>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {report.ad ? (
                  <>
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <Link href={`/ads/${report.ad.id}`} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                        {text.open}
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-2"
                      disabled={busy}
                      onClick={() => deleteListing(report)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {text.deleteAd}
                    </Button>
                  </>
                ) : null}
                {target ? (
                  <Button
                    variant={target.suspended ? 'outline' : 'destructive'}
                    size="sm"
                    className="gap-2"
                    disabled={busy}
                    onClick={() => toggleSuspension(report)}
                  >
                    {target.suspended ? <Undo2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                    {target.suspended ? text.unsuspend : text.suspend}
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={busy}
                  onClick={() => void close(report, 'reviewed')}
                >
                  <Check className="h-4 w-4" />
                  {text.reviewed}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  disabled={busy}
                  onClick={() => void close(report, 'dismissed')}
                >
                  <X className="h-4 w-4" />
                  {text.dismiss}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
