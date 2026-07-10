'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, UserPlus } from 'lucide-react';
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

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignUpPageContent />
    </Suspense>
  );
}

function SignUpPageContent() {
  const { signUp, isReady, user } = useAuth();
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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    password: '',
    confirmPassword: '',
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
    router.replace(`/sign-up?redirect=${encodeURIComponent(redirect)}`);
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
        title: messages.auth.signUpSuccessTitle,
        description: messages.auth.signUpSuccessDescription,
      });
      router.replace(redirect);
    } catch (error) {
      toast({
        title: messages.auth.requestFailedTitle,
        description:
          error instanceof Error ? error.message : messages.auth.requestFailedDescription,
        variant: 'destructive',
      });
      router.replace(`/sign-up?redirect=${encodeURIComponent(redirect)}`);
    } finally {
      setIsCompletingExternalAuth(false);
    }
  }, [
    externalToken,
    externalUser,
    messages.auth.requestFailedDescription,
    messages.auth.requestFailedTitle,
    messages.auth.signUpSuccessDescription,
    messages.auth.signUpSuccessTitle,
    redirect,
    router,
    toast,
  ]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formData.password.length < 6) {
      toast({
        title: messages.auth.passwordTooShortTitle,
        description: messages.auth.passwordTooShortDescription,
        variant: 'destructive',
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: messages.auth.passwordMismatchTitle,
        description: messages.auth.passwordMismatchDescription,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const result = await signUp({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      location: formData.location,
      password: formData.password,
    });

    if (!result.ok) {
      const isServerError = result.error === 'server_unavailable';
      const isValidationError = result.error === 'validation_error';

      toast({
        title: isServerError
          ? messages.auth.serverUnavailableTitle
          : result.error === 'email_in_use'
            ? messages.auth.emailInUseTitle
            : messages.auth.requestFailedTitle,
        description: isServerError
          ? messages.auth.serverUnavailableDescription
          : result.error === 'email_in_use'
            ? messages.auth.emailInUseDescription
            : result.message || (isValidationError
              ? messages.auth.requestFailedDescription
              : messages.auth.requestFailedDescription),
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    toast({
      title: messages.auth.signUpSuccessTitle,
      description: messages.auth.signUpSuccessDescription,
    });

    router.replace(redirect);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <AuthPageShell
        badge={messages.auth.signUpBadge}
        title={messages.auth.signUpTitle}
        description={messages.auth.signUpDescription}
        highlights={messages.auth.highlights}
        footerText={messages.auth.haveAccount}
        footerActionLabel={messages.auth.signInAction}
        footerActionHref="/sign-in"
      >
        <GoogleAuthSection redirectTo={redirect} />
        <YandexAuthSection redirectTo={redirect} />
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{messages.auth.nameLabel}</Label>
            <Input
              id="name"
              placeholder={messages.auth.namePlaceholder}
              value={formData.name}
              onChange={(event) =>
                setFormData((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              required
            />
          </div>
          <div className="grid gap-4 min-[481px]:grid-cols-2">
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
              <Label htmlFor="phone">{messages.auth.phoneLabel}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder={messages.auth.phonePlaceholder}
                value={formData.phone}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    phone: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">{messages.auth.locationLabel}</Label>
            <Input
              id="location"
              placeholder={messages.auth.locationPlaceholder}
              value={formData.location}
              onChange={(event) =>
                setFormData((previous) => ({
                  ...previous,
                  location: event.target.value,
                }))
              }
            />
          </div>
          <div className="grid gap-4 min-[481px]:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">{messages.auth.passwordLabel}</Label>
              <Input
                id="password"
                type="password"
                placeholder={messages.auth.passwordPlaceholder}
                value={formData.password}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    password: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{messages.auth.confirmPasswordLabel}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={messages.auth.confirmPasswordPlaceholder}
                value={formData.confirmPassword}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    confirmPassword: event.target.value,
                  }))
                }
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            className="h-12 w-full gap-2 text-base font-semibold"
            disabled={isSubmitting || isCompletingExternalAuth}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {messages.auth.signUpAction}
          </Button>
        </form>
        <div className="rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          {messages.auth.haveAccount}{' '}
          <Link href="/sign-in" className="font-semibold text-primary">
            {messages.auth.signInAction}
          </Link>
        </div>
      </AuthPageShell>
    </div>
  );
}
