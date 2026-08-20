"use client";

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { registerPlugin } from '@capacitor/core';
import type { SignInWithApplePlugin } from '@capacitor-community/apple-sign-in';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AppleLogo } from '@/components/brand/AppleLogo';
import { buildPostAuthRedirect } from '@/lib/auth';
import { isNativeIosApp, waitForCapacitorPlugin } from '@/lib/native-app';

// Registered through the bridge rather than imported from the package entrypoint
// so the plugin's web fallback (and its Apple JS SDK loader) never reaches the
// browser bundle. The button only renders inside the native iOS app.
const APPLE_PLUGIN_NAME = 'SignInWithApple';
const SignInWithApple = registerPlugin<SignInWithApplePlugin>(APPLE_PLUGIN_NAME);

// Must match the bundle id that the backend validates the token audience against.
const APPLE_CLIENT_ID = 'uz.birjoy.app';
const APPLE_REDIRECT_URI = 'https://www.bir-joy.uz/sign-in';

type AppleAuthSectionProps = {
  redirectTo: string;
};

// The user tapping "Cancel" on the Apple sheet is a normal outcome, not an error
// worth showing a destructive toast for.
function isUserCancellation(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /1001|canceled|cancelled|AKAuthenticationError/i.test(message);
}

export function AppleAuthSection({ redirectTo }: AppleAuthSectionProps) {
  const { signInWithApple } = useAuth();
  const { messages } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [nativeReady, setNativeReady] = useState(false);

  useEffect(() => {
    if (!isNativeIosApp()) {
      return;
    }

    let active = true;

    void (async () => {
      const available = await waitForCapacitorPlugin(APPLE_PLUGIN_NAME, { timeoutMs: 4000 });

      if (active) {
        setNativeReady(available);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleAppleSignIn = async () => {
    setIsLoading(true);

    try {
      // clientId and redirectURI are ignored by the native iOS implementation but
      // are required by the plugin's shared option type.
      const nativeResult = await SignInWithApple.authorize({
        clientId: APPLE_CLIENT_ID,
        redirectURI: APPLE_REDIRECT_URI,
        scopes: 'name email',
      });

      const appleResponse = nativeResult?.response;

      if (!appleResponse?.identityToken) {
        throw new Error('Apple identity token was not returned.');
      }

      const result = await signInWithApple({
        identityToken: appleResponse.identityToken,
        authorizationCode: appleResponse.authorizationCode || undefined,
        // Apple supplies the name only on the very first authorization, so it is
        // forwarded here; the backend keeps whatever it already stored.
        givenName: appleResponse.givenName || undefined,
        familyName: appleResponse.familyName || undefined,
      });

      if (!result.ok) {
        toast({
          title: messages.auth.requestFailedTitle,
          description: result.message || messages.auth.requestFailedDescription,
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
      if (isUserCancellation(error)) {
        return;
      }

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
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        // Nudged up a hair: the Apple mark reads low against text at this size.
        <AppleLogo className="mr-2 h-[1.15rem] w-[1.15rem] -translate-y-[1px]" />
      )}
      {messages.auth.appleAction}
    </Button>
  );
}
