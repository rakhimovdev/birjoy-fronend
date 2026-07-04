'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, LockKeyhole } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth();
  const { messages } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;

  useEffect(() => {
    if (!isReady || user) {
      return;
    }

    router.replace(`/sign-in?redirect=${encodeURIComponent(redirectTarget)}`);
  }, [isReady, redirectTarget, router, user]);

  if (!isReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="flex items-center gap-3 rounded-full border border-border/70 bg-card/92 px-5 py-3 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          {messages.auth.loading}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <CardTitle>{messages.auth.protectedTitle}</CardTitle>
            <CardDescription>{messages.auth.protectedDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full">
              <Link href={`/sign-in?redirect=${encodeURIComponent(redirectTarget)}`}>
                {messages.auth.signInAction}
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/sign-up">{messages.auth.signUpAction}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
