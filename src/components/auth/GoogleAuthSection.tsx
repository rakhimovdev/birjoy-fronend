'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { backendApiBaseUrl } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { BirJoyAuth, isNativeAndroidApp } from '@/lib/native-app';

type GoogleCredentialResponse = {
  credential?: string;
};

type PublicConfigResponse = {
  googleAuthEnabled?: boolean;
  googleClientId?: string;
};

type GoogleConfigState = 'idle' | 'loading' | 'ready' | 'disabled' | 'error';

type GoogleIdConfiguration = {
  callback: (response: GoogleCredentialResponse) => void;
  cancel_on_tap_outside?: boolean;
  client_id: string;
  ux_mode?: 'popup' | 'redirect';
};

type GoogleButtonConfiguration = {
  logo_alignment?: 'left' | 'center';
  shape?: 'pill' | 'rectangular' | 'square' | 'circle';
  size?: 'small' | 'medium' | 'large';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  width?: number;
};

type GoogleAccounts = {
  id: {
    cancel: () => void;
    initialize: (config: GoogleIdConfiguration) => void;
    renderButton: (element: HTMLElement, config: GoogleButtonConfiguration) => void;
  };
};

declare global {
  interface Window {
    google?: {
      accounts: GoogleAccounts;
    };
  }
}

type GoogleAuthSectionProps = {
  redirectTo: string;
};

function isGoogleFlowCancellation(message: string) {
  const normalizedMessage = message.trim().toLowerCase();

  return (
    normalizedMessage.includes('cancelled') ||
    normalizedMessage.includes('canceled') ||
    normalizedMessage.includes('dismissed')
  );
}

export function GoogleAuthSection({ redirectTo }: GoogleAuthSectionProps) {
  const embeddedGoogleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || '';
  const { signInWithGoogle } = useAuth();
  const { messages } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [googleClientId, setGoogleClientId] = useState(embeddedGoogleClientId);
  const [configState, setConfigState] = useState<GoogleConfigState>(
    backendApiBaseUrl ? 'loading' : embeddedGoogleClientId ? 'ready' : 'error'
  );
  const [scriptState, setScriptState] = useState<'idle' | 'ready' | 'error'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nativeGoogleAuth = isNativeAndroidApp();

  useEffect(() => {
    if (!backendApiBaseUrl) {
      setGoogleClientId(embeddedGoogleClientId);
      setConfigState(embeddedGoogleClientId ? 'ready' : 'error');
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
        const runtimeGoogleClientId =
          typeof data.googleClientId === 'string' ? data.googleClientId.trim() : '';
        const resolvedGoogleClientId = runtimeGoogleClientId || embeddedGoogleClientId;
        const googleAuthEnabled = data.googleAuthEnabled !== false;

        if (!isActive) {
          return;
        }

        setGoogleClientId(resolvedGoogleClientId);
        setConfigState(
          googleAuthEnabled && resolvedGoogleClientId
            ? 'ready'
            : googleAuthEnabled
              ? 'error'
              : 'disabled'
        );
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setGoogleClientId(embeddedGoogleClientId);
        setConfigState(embeddedGoogleClientId ? 'ready' : 'error');
      });

    return () => {
      isActive = false;
    };
  }, [embeddedGoogleClientId]);

  useEffect(() => {
    if (nativeGoogleAuth) {
      return;
    }

    if (!googleClientId || scriptState !== 'ready' || !window.google || !buttonRef.current) {
      return;
    }

    const container = buttonRef.current;
    const buttonWidth = Math.max(240, Math.round(container.getBoundingClientRect().width || 320));

    container.innerHTML = '';
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      ux_mode: 'popup',
      cancel_on_tap_outside: true,
      callback: (response) => {
        void (async () => {
          if (!response.credential) {
            return;
          }

          setIsSubmitting(true);

          const result = await signInWithGoogle(response.credential);

          if (!result.ok) {
            toast({
              title:
                result.error === 'server_unavailable'
                  ? messages.auth.serverUnavailableTitle
                  : messages.auth.requestFailedTitle,
              description:
                result.error === 'server_unavailable'
                  ? result.message || messages.auth.serverUnavailableDescription
                  : result.message || messages.auth.requestFailedDescription,
              variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
          }

          toast({
            title: messages.auth.googleSuccessTitle,
            description: messages.auth.googleSuccessDescription,
          });

          window.google?.accounts.id.cancel();
          router.replace(redirectTo);
        })();
      },
    });
    window.google.accounts.id.renderButton(container, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      logo_alignment: 'left',
      width: buttonWidth,
    });

    return () => {
      container.innerHTML = '';
    };
  }, [googleClientId, messages, nativeGoogleAuth, redirectTo, router, scriptState, signInWithGoogle, toast]);

  const handleNativeGoogleSignIn = async () => {
    if (!googleClientId) {
      toast({
        title: messages.auth.requestFailedTitle,
        description: messages.auth.googleUnavailableDescription,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const nativeResult = await BirJoyAuth.signInWithGoogle({
        serverClientId: googleClientId,
      });

      if (!nativeResult.idToken) {
        throw new Error('Google ID token was not returned.');
      }

      const result = await signInWithGoogle(nativeResult.idToken);

      if (!result.ok) {
        toast({
          title:
            result.error === 'server_unavailable'
              ? messages.auth.serverUnavailableTitle
              : messages.auth.requestFailedTitle,
          description:
            result.error === 'server_unavailable'
              ? result.message || messages.auth.serverUnavailableDescription
              : result.message || messages.auth.requestFailedDescription,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: messages.auth.googleSuccessTitle,
        description: messages.auth.googleSuccessDescription,
      });

      router.replace(redirectTo);
    } catch (error) {
      if (error instanceof Error && isGoogleFlowCancellation(error.message)) {
        return;
      }

      toast({
        title: messages.auth.requestFailedTitle,
        description:
          error instanceof Error ? error.message : messages.auth.requestFailedDescription,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isGoogleUnavailable =
    configState === 'disabled' ||
    configState === 'error' ||
    (!nativeGoogleAuth && scriptState === 'error');
  const isLoadingGoogle = configState !== 'ready' || (!nativeGoogleAuth && scriptState !== 'ready');

  return (
    <div className="space-y-4">
      {googleClientId && !nativeGoogleAuth ? (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={() => setScriptState('ready')}
          onError={() => setScriptState('error')}
        />
      ) : null}

      <div className="flex items-center gap-3 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground/80">
        <span className="h-px flex-1 bg-border" />
        <span>{messages.auth.orContinueWith}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {isGoogleUnavailable ? (
        <div className="rounded-2xl border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
          {messages.auth.googleUnavailableDescription}
        </div>
      ) : nativeGoogleAuth ? (
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full rounded-full text-base font-semibold"
          onClick={() => void handleNativeGoogleSignIn()}
          disabled={isLoadingGoogle || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {messages.auth.googleAction}
            </>
          ) : (
            messages.auth.googleAction
          )}
        </Button>
      ) : (
        <div className="relative min-h-12">
          <div
            ref={buttonRef}
            className={cn(
              'flex min-h-12 w-full items-center justify-center overflow-hidden rounded-full',
              isSubmitting && 'pointer-events-none opacity-60'
            )}
          />
          {isLoadingGoogle || isSubmitting ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-full border bg-background/80 backdrop-blur-sm">
              <Button type="button" variant="outline" className="w-full rounded-full" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {messages.auth.googleAction}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
