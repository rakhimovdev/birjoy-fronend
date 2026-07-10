'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { backendApiBaseUrl } from '@/lib/api';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Button } from '@/components/ui/button';

type YandexAuthSectionProps = {
  redirectTo: string;
};

type PublicConfigResponse = {
  yandexAuthEnabled?: boolean;
};

type YandexConfigState = 'idle' | 'loading' | 'ready' | 'disabled';

function getCopy(locale: 'uz' | 'ru' | 'en') {
  if (locale === 'ru') {
    return {
      action: 'Продолжить через Yandex',
    };
  }

  if (locale === 'en') {
    return {
      action: 'Continue with Yandex',
    };
  }

  return {
    action: 'Yandex bilan davom etish',
  };
}

export function YandexAuthSection({ redirectTo }: YandexAuthSectionProps) {
  const { locale } = useI18n();
  const copy = getCopy(locale);
  const [configState, setConfigState] = useState<YandexConfigState>(
    backendApiBaseUrl ? 'loading' : 'disabled'
  );

  useEffect(() => {
    if (!backendApiBaseUrl) {
      setConfigState('disabled');
      return;
    }

    let isActive = true;
    setConfigState('loading');

    void fetch(`${backendApiBaseUrl}/config/public`, {
      cache: 'no-store',
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load public config.');
        }

        const data = (await response.json().catch(() => ({}))) as PublicConfigResponse;

        if (isActive) {
          setConfigState(data.yandexAuthEnabled ? 'ready' : 'disabled');
        }
      })
      .catch(() => {
        if (isActive) {
          setConfigState('disabled');
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  if (configState === 'disabled') {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-12 w-full rounded-full text-base font-semibold"
      disabled={configState !== 'ready'}
      onClick={() => {
        if (typeof window === 'undefined') {
          return;
        }

        window.location.assign(
          `${backendApiBaseUrl}/auth/yandex?redirect=${encodeURIComponent(redirectTo)}`
        );
      }}
    >
      {configState === 'ready' ? (
        copy.action
      ) : (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {copy.action}
        </>
      )}
    </Button>
  );
}
