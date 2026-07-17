'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth();
  const { messages } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;
  const signInHref = `/sign-in?redirect=${encodeURIComponent(redirectTarget)}`;

  useEffect(() => {
    if (!isReady || user) {
      return;
    }

    window.location.replace(signInHref);
  }, [isReady, signInHref, user]);

  if (!isReady || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="flex items-center gap-3 rounded-full border border-border/70 bg-card/92 px-5 py-3 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          {isReady ? messages.auth.protectedTitle : messages.auth.loading}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
