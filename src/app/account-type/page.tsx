'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Building2, Loader2, UserRound } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { UserAccountType } from '@/lib/types';

function normalizeRedirectPath(value: string | null) {
  if (!value) {
    return '/profile';
  }

  const trimmedValue = value.trim();
  return trimmedValue.startsWith('/') ? trimmedValue : '/profile';
}

function getCopy(locale: 'uz' | 'ru' | 'en') {
  if (locale === 'ru') {
    return {
      badge: 'Последний шаг',
      title: 'Вы риелтор или обычный пользователь?',
      description:
        'Выберите тип аккаунта, чтобы BirJoy мог точнее подстроить интерфейс и сценарии публикации.',
      realtorLabel: 'Риелтор',
      realtorDescription:
        'Подходит для специалистов и агентств, которые регулярно публикуют объявления.',
      regularLabel: 'Обычный пользователь',
      regularDescription:
        'Подходит для личного использования, разовых публикаций и обычного поиска.',
      continueAction: 'Продолжить',
      saving: 'Сохраняем',
      savedTitle: 'Тип аккаунта сохранён',
      savedDescription: 'Теперь профиль настроен и можно продолжить работу.',
    };
  }

  if (locale === 'en') {
    return {
      badge: 'Last step',
      title: 'Are you a realtor or a regular user?',
      description:
        'Choose the account type so BirJoy can tailor posting and browsing flows more accurately.',
      realtorLabel: 'Realtor',
      realtorDescription:
        'Best for professionals or agencies that publish listings regularly.',
      regularLabel: 'Regular user',
      regularDescription:
        'Best for personal browsing, occasional posting, and everyday marketplace use.',
      continueAction: 'Continue',
      saving: 'Saving',
      savedTitle: 'Account type saved',
      savedDescription: 'Your profile is ready and you can keep going.',
    };
  }

  return {
    badge: 'Oxirgi qadam',
    title: 'Siz rieltorsizmi yoki oddiy foydalanuvchi?',
    description:
      'Akkaunt turini tanlang, shunda BirJoy eʼlon berish va ko‘rish oqimlarini sizga mosroq ko‘rsatadi.',
    realtorLabel: 'Rieltor',
    realtorDescription:
      'Doimiy ravishda eʼlon joylaydigan mutaxassislar va agentliklar uchun mos.',
    regularLabel: 'Oddiy foydalanuvchi',
    regularDescription:
      'Shaxsiy foydalanish, vaqti-vaqti bilan eʼlon berish va oddiy qidiruv uchun mos.',
    continueAction: 'Davom etish',
    saving: 'Saqlanmoqda',
    savedTitle: 'Akkaunt turi saqlandi',
    savedDescription: 'Profilingiz tayyor. Endi davom etishingiz mumkin.',
  };
}

function AccountTypePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isReady, updateProfile } = useAuth();
  const { locale, messages } = useI18n();
  const { toast } = useToast();
  const redirect = normalizeRedirectPath(searchParams.get('redirect'));
  const [selectedType, setSelectedType] = useState<UserAccountType>('regular');
  const [isSaving, setIsSaving] = useState(false);
  const copy = getCopy(locale);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!user) {
      router.replace(`/sign-in?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    if (user.accountType) {
      router.replace(redirect);
      return;
    }
  }, [isReady, redirect, router, user]);

  useEffect(() => {
    if (user?.accountType) {
      setSelectedType(user.accountType);
    }
  }, [user?.accountType]);

  const handleContinue = async () => {
    setIsSaving(true);
    const result = await updateProfile({
      accountType: selectedType,
    });

    if (!result.ok) {
      toast({
        title: messages.auth.requestFailedTitle,
        description: result.message || messages.auth.requestFailedDescription,
        variant: 'destructive',
      });
      setIsSaving(false);
      return;
    }

    toast({
      title: copy.savedTitle,
      description: copy.savedDescription,
    });
    router.replace(redirect);
  };

  if (!isReady || !user || user.accountType) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-10">
          <div className="inline-flex items-center gap-3 rounded-full border bg-background/82 px-5 py-3 text-sm font-medium text-muted-foreground shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>{messages.auth.loading}</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="px-4 py-8 sm:py-10">
        <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-4xl items-center">
          <Card className="surface-card w-full rounded-[2rem]">
            <CardHeader className="space-y-4 p-6 sm:p-8">
              <div className="inline-flex w-fit items-center rounded-full border border-accent/20 bg-accent/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-accent-foreground">
                {copy.badge}
              </div>
              <CardTitle className="text-3xl font-black tracking-tight sm:text-4xl">
                {copy.title}
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-7 sm:text-base">
                {copy.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-6 pt-0 sm:p-8 sm:pt-0">
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSelectedType('realtor')}
                  className={`rounded-[1.7rem] border p-5 text-left transition-colors ${
                    selectedType === 'realtor'
                      ? 'border-primary/20 bg-primary/10 text-primary'
                      : 'border-border/70 bg-background/78 text-foreground hover:border-primary/15 hover:bg-primary/5'
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background/90 text-current shadow-sm">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-xl font-bold">{copy.realtorLabel}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {copy.realtorDescription}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedType('regular')}
                  className={`rounded-[1.7rem] border p-5 text-left transition-colors ${
                    selectedType === 'regular'
                      ? 'border-primary/20 bg-primary/10 text-primary'
                      : 'border-border/70 bg-background/78 text-foreground hover:border-primary/15 hover:bg-primary/5'
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background/90 text-current shadow-sm">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-xl font-bold">{copy.regularLabel}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {copy.regularDescription}
                  </p>
                </button>
              </div>

              <Button
                type="button"
                className="h-12 w-full gap-2 text-base font-semibold"
                disabled={isSaving}
                onClick={() => void handleContinue()}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {isSaving ? copy.saving : copy.continueAction}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function AccountTypePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AccountTypePageContent />
    </Suspense>
  );
}
