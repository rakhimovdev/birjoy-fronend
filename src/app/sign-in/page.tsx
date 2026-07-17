'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { AuthPageShell } from '@/components/auth/AuthPageShell';
import { GoogleAuthSection } from '@/components/auth/GoogleAuthSection';
import { YandexAuthSection } from '@/components/auth/YandexAuthSection';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { completeExternalAuthSession } from '@/lib/auth';

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignInPageContent />
    </Suspense>
  );
}

function SignInPageContent() {
  const { signIn, isReady, user } = useAuth();
  const { messages } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/profile';
  const externalToken = searchParams.get('token') || '';
  const externalUser = searchParams.get('user') || '';
  const authError = searchParams.get('authError') || '';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompletingExternalAuth, setIsCompletingExternalAuth] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    if (isReady && user) {
      router.replace(redirect);
    }
  }, [isReady, redirect, router, user]);

  useEffect(() => {
    if (!authError) {
      return;
    }

    toast({
      title: messages.auth.requestFailedTitle,
      description: authError,
      variant: 'destructive',
    });
    router.replace(`/sign-in?redirect=${encodeURIComponent(redirect)}`);
  }, [authError, messages.auth.requestFailedTitle, redirect, router, toast]);

  useEffect(() => {
    if (!externalToken || !externalUser) {
      return;
    }

    setIsCompletingExternalAuth(true);

    try {
      const parsedUser = JSON.parse(externalUser) as {
        name: string;
        email: string;
      };
      const result = completeExternalAuthSession(externalToken, parsedUser);

      if (!result.ok) {
        throw new Error(result.message);
      }

      toast({
        title: messages.auth.signInSuccessTitle,
        description: messages.auth.signInSuccessDescription,
      });
      router.replace(redirect);
    } catch (error) {
      toast({
        title: messages.auth.requestFailedTitle,
        description:
          error instanceof Error ? error.message : messages.auth.requestFailedDescription,
        variant: 'destructive',
      });
      router.replace(`/sign-in?redirect=${encodeURIComponent(redirect)}`);
    } finally {
      setIsCompletingExternalAuth(false);
    }
  }, [
    externalToken,
    externalUser,
    messages.auth.requestFailedDescription,
    messages.auth.requestFailedTitle,
    messages.auth.signInSuccessDescription,
    messages.auth.signInSuccessTitle,
    redirect,
    router,
    toast,
  ]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const result = await signIn(formData);

    if (!result.ok) {
      const isServerError = result.error === 'server_unavailable';
      const isValidationError = result.error === 'validation_error';

      toast({
        title: isServerError
          ? messages.auth.serverUnavailableTitle
          : isValidationError
            ? messages.auth.requestFailedTitle
            : messages.auth.invalidCredentialsTitle,
        description: isServerError
          ? messages.auth.serverUnavailableDescription
          : result.message || (isValidationError
            ? messages.auth.requestFailedDescription
            : messages.auth.invalidCredentialsDescription),
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    toast({
      title: messages.auth.signInSuccessTitle,
      description: messages.auth.signInSuccessDescription,
    });

    router.replace(redirect);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <AuthPageShell
        badge={messages.auth.signInBadge}
        title={messages.auth.signInTitle}
        description={messages.auth.signInDescription}
        highlights={messages.auth.highlights}
        footerText={messages.auth.noAccount}
        footerActionLabel={messages.auth.signUpAction}
        footerActionHref="/sign-up"
      >
        <GoogleAuthSection redirectTo={redirect} />
        <YandexAuthSection redirectTo={redirect} />
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">{messages.auth.emailLabel}</Label>
            <Input
              id="email"
              type="email"
              placeholder={messages.auth.emailPlaceholder}
              value={formData.email}
              onChange={(event) =>
                setFormData((previous) => ({
                  ...previous,
                  email: event.target.value,
                }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{messages.auth.passwordLabel}</Label>
            <div className="relative">
              <Input
                id="password"
                type={isPasswordVisible ? 'text' : 'password'}
                placeholder={messages.auth.passwordPlaceholder}
                value={formData.password}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    password: event.target.value,
                  }))
                }
                className="pr-14"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-xl text-muted-foreground hover:text-foreground"
                onClick={() => setIsPasswordVisible((previous) => !previous)}
                aria-label={
                  isPasswordVisible
                    ? messages.auth.hidePassword
                    : messages.auth.showPassword
                }
              >
                {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Button
            type="submit"
            className="h-12 w-full gap-2 text-base font-semibold"
            disabled={isSubmitting || isCompletingExternalAuth}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {messages.auth.signInAction}
          </Button>
        </form>
        <div className="rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          {messages.auth.registerHint}{' '}
          <Link href="/sign-up" className="font-semibold text-primary">
            {messages.auth.signUpAction}
          </Link>
        </div>
      </AuthPageShell>
    </div>
  );
}
