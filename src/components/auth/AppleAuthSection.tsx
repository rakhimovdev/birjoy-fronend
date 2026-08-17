"use client";

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { buildPostAuthRedirect } from '@/lib/auth';
import { isNativeIosApp, waitForBirJoyAuthPlugin } from '@/lib/native-app';
import { registerPlugin, Capacitor } from '@capacitor/core';

// Use the community plugin for Apple Sign-In (iOS native)
// Plugin registers as `SignInWithApple` (v7+)
const AppleSignIn = registerPlugin('SignInWithApple') as any;

type AppleAuthSectionProps = {
  redirectTo: string;
};

export function AppleAuthSection({ redirectTo }: AppleAuthSectionProps) {
  const { signInWithApple } = useAuth();
  const { messages } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [nativeReady, setNativeReady] = useState(false);

  useEffect(() => {
    if (!isNativeIosApp()) {
      setNativeReady(false);
      return;
    }

    let active = true;

    void (async () => {
      const diag = await waitForBirJoyAuthPlugin({ timeoutMs: 4000 });

      if (!active) return;

      setNativeReady(Boolean(diag.isNativeIosApp && diag.birJoyAuthPluginAvailable));
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleAppleSignIn = async () => {
    setIsLoading(true);

    try {
      const readyDiagnostics = await waitForBirJoyAuthPlugin();

      // Confirm platform is iOS
      if (!readyDiagnostics.isNativeIosApp) {
        throw new Error('Apple sign-in is not available on this platform.');
      }

      // Ensure plugin is available
      if (!Capacitor.isPluginAvailable || !Capacitor.isPluginAvailable('SignInWithApple')) {
        throw new Error('Apple Sign-In plugin is not available in this WebView.');
      }

      // Call community Apple Sign-In plugin (native uses `authorize`)
      const nativeResult = await AppleSignIn.authorize({});

      const identityToken = nativeResult?.response?.identityToken as string | undefined;

      if (!identityToken) {
        throw new Error('Apple identity token was not returned.');
      }

      const credential = identityToken;

      // Use context method if available, otherwise fallback to direct helper
      const rawResult = typeof signInWithApple === 'function'
        ? await signInWithApple(credential)
        : await (await import('@/lib/auth')).signInWithAppleUser(credential);

      const result: any = rawResult as any;

      if (!result || !result.ok) {
        toast({
          title: messages.auth.requestFailedTitle,
          description: result?.message || messages.auth.requestFailedDescription,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: messages.auth.signInSuccessTitle,
        description: messages.auth.signInSuccessDescription,
      });

      router.replace(buildPostAuthRedirect(result.user, redirectTo));
    } catch (error) {
      toast({
        title: messages.auth.requestFailedTitle,
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isNativeIosApp()) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-12 w-full rounded-full text-base font-semibold"
      onClick={() => void handleAppleSignIn()}
      disabled={!nativeReady || isLoading}
    >
      {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{messages.auth.appleAction}</> : messages.auth.appleAction}
    </Button>
  );
}
