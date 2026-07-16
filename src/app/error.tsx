'use client';

import { useEffect } from 'react';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { MarketplaceErrorState } from '@/components/marketplace/MarketplaceStates';
import { useI18n } from '@/components/providers/LocaleProvider';

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const copy =
    locale === 'ru'
      ? {
          title: 'Что-то пошло не так',
          description:
            'Не удалось открыть эту страницу. Попробуйте повторить попытку или вернуться к ленте объявлений.',
          retry: 'Повторить',
          back: 'К объявлениям',
        }
      : locale === 'en'
        ? {
            title: 'Something went wrong',
            description:
              'This page could not be opened. Try again or head back to the marketplace feed.',
            retry: 'Retry',
            back: 'Back to listings',
          }
        : {
            title: 'Kutilmagan xatolik yuz berdi',
            description:
              'Bu sahifani ochib bo‘lmadi. Qayta urinib ko‘ring yoki marketplace ro‘yxatiga qayting.',
            retry: 'Qayta urinish',
            back: 'Eʼlonlarga qaytish',
          };

  return (
    <MarketplaceShell>
      <main className="marketplace-main">
        <MarketplaceErrorState
          title={copy.title}
          description={copy.description}
          retryLabel={copy.retry}
          onRetry={reset}
          secondaryAction={{
            label: copy.back,
            href: '/uy-joy',
            variant: 'outline',
          }}
        />
      </main>
    </MarketplaceShell>
  );
}
