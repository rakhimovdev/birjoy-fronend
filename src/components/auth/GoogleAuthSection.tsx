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
import {
  areNativePlatformDiagnosticsEqual,
  BirJoyAuth,
  getNativePlatformDiagnostics,
  isLikelyNativeAndroidShell,
  logNativeAuthDebug,
  type NativeAppRestoredResult,
  waitForBirJoyAuthPlugin,
} from '@/lib/native-app';

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

type NativeGoogleSignInResult = {
  idToken?: string;
  displayName?: string;
  email?: string;
  photoUrl?: string;
};

function isGoogleFlowCancellation(message: string) {
  const normalizedMessage = message.trim().toLowerCase();

  return (
    normalizedMessage.includes('cancelled') ||
    normalizedMessage.includes('canceled') ||
    normalizedMessage.includes('dismissed')
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function describeGoogleClientId(clientId: string) {
  if (!clientId) {
    return {
      present: false,
      suffix: '',
    };
  }

  return {
    present: true,
    suffix: clientId.slice(-18),
  };
}

function isBirJoyGoogleSignInRestoredResult(
  restoredResult?: NativeAppRestoredResult | null
) {
  return (
    restoredResult?.pluginId === 'BirJoyAuth' &&
    restoredResult?.methodName === 'signInWithGoogle'
  );
}

function getRestoredResultKey(restoredResult: NativeAppRestoredResult) {
  return JSON.stringify({
    pluginId: restoredResult.pluginId || '',
    methodName: restoredResult.methodName || '',
    success: Boolean(restoredResult.success),
    receivedAt: restoredResult.receivedAt || 0,
    idToken: String(restoredResult.data?.idToken || ''),
    errorMessage: String(restoredResult.error?.message || ''),
  });
}

function getRestoredResultErrorMessage(restoredResult: NativeAppRestoredResult) {
  return (
    restoredResult.error?.message ||
    (typeof restoredResult.error?.data?.message === 'string'
      ? restoredResult.error.data.message
      : '') ||
    ''
  );
}

function toNativeGoogleSignInResult(
  data?: Record<string, unknown>
): NativeGoogleSignInResult {
  return {
    idToken: typeof data?.idToken === 'string' ? data.idToken : '',
    displayName: typeof data?.displayName === 'string' ? data.displayName : '',
    email: typeof data?.email === 'string' ? data.email : '',
    photoUrl: typeof data?.photoUrl === 'string' ? data.photoUrl : '',
  };
}

export function GoogleAuthSection({ redirectTo }: GoogleAuthSectionProps) {
  const embeddedGoogleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || '';
  const { signInWithGoogle } = useAuth();
  const { messages } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const handledRestoredResultKeyRef = useRef('');
  const [googleClientId, setGoogleClientId] = useState(embeddedGoogleClientId);
  const [configState, setConfigState] = useState<GoogleConfigState>(
    backendApiBaseUrl ? 'loading' : embeddedGoogleClientId ? 'ready' : 'error'
  );
  const [scriptState, setScriptState] = useState<'idle' | 'ready' | 'error'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nativeDiagnostics, setNativeDiagnostics] = useState(() =>
    getNativePlatformDiagnostics()
  );
  const nativeGoogleAuth = isLikelyNativeAndroidShell(nativeDiagnostics);
  const nativePluginAvailable = nativeDiagnostics.birJoyAuthPluginAvailable;
  const nativeBridgeReady = nativeGoogleAuth && nativeDiagnostics.birJoyAuthPluginAvailable;

  useEffect(() => {
    let cancelled = false;
    let pollTimer: number | null = null;
    let pollAttempts = 0;

    const syncNativeDiagnostics = (reason: string) => {
      const nextDiagnostics = getNativePlatformDiagnostics();

      setNativeDiagnostics((currentDiagnostics) => {
        if (areNativePlatformDiagnosticsEqual(currentDiagnostics, nextDiagnostics)) {
          return currentDiagnostics;
        }

        logNativeAuthDebug('google-auth-native-diagnostics-updated', {
          reason,
          diagnostics: nextDiagnostics,
        });
        return nextDiagnostics;
      });

      return nextDiagnostics;
    };

    const initialDiagnostics = syncNativeDiagnostics('mount');

    if (!isLikelyNativeAndroidShell(initialDiagnostics) && !initialDiagnostics.hasAndroidBridge) {
      return () => {
        cancelled = true;
      };
    }

    const pollNativeDiagnostics = () => {
      if (cancelled) {
        return;
      }

      pollAttempts += 1;
      const nextDiagnostics = syncNativeDiagnostics(`poll-${pollAttempts}`);

      if (
        isLikelyNativeAndroidShell(nextDiagnostics) &&
        nextDiagnostics.birJoyAuthPluginAvailable
      ) {
        return;
      }

      if (pollAttempts >= 40) {
        return;
      }

      pollTimer = window.setTimeout(pollNativeDiagnostics, 150);
    };

    pollTimer = window.setTimeout(pollNativeDiagnostics, 150);

    return () => {
      cancelled = true;
      if (pollTimer) {
        window.clearTimeout(pollTimer);
      }
    };
  }, []);

  useEffect(() => {
    logNativeAuthDebug('google-auth-mounted', {
      redirectTo,
      backendApiBaseUrl,
      embeddedGoogleClientId: describeGoogleClientId(embeddedGoogleClientId),
      nativeDiagnostics,
    });
  }, [embeddedGoogleClientId, nativeDiagnostics, redirectTo]);

  useEffect(() => {
    if (!nativeBridgeReady) {
      return;
    }

    logNativeAuthDebug('google-auth-native-plugin-diagnostics', {
      nativePluginAvailable,
      nativeDiagnostics,
    });

    let listenerHandle: { remove: () => Promise<void> } | null = null;

    void BirJoyAuth.addListener('googleAuthDebug', (event) => {
      logNativeAuthDebug(`native-plugin-${event.step}`, {
        message: event.message,
        data: event.data,
      });
    })
      .then((listener) => {
        listenerHandle = listener;
      })
      .catch((error) => {
        logNativeAuthDebug('native-plugin-listener-failed', {
          errorMessage: getErrorMessage(error),
        });
      });

    return () => {
      if (listenerHandle) {
        void listenerHandle.remove();
      }
    };
  }, [nativeBridgeReady, nativeDiagnostics, nativePluginAvailable]);

  useEffect(() => {
    if (!backendApiBaseUrl) {
      logNativeAuthDebug('google-auth-config-runtime-skipped', {
        reason: 'backendApiBaseUrl-missing',
        fallbackClientId: describeGoogleClientId(embeddedGoogleClientId),
      });
      setGoogleClientId(embeddedGoogleClientId);
      setConfigState(embeddedGoogleClientId ? 'ready' : 'error');
      return;
    }

    let isActive = true;
    setConfigState('loading');
    logNativeAuthDebug('google-auth-config-fetch-start', {
      url: `${backendApiBaseUrl}/config/public`,
      nativeGoogleAuth,
      nativePluginAvailable,
    });

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

        logNativeAuthDebug('google-auth-config-fetch-success', {
          googleAuthEnabled,
          runtimeGoogleClientId: describeGoogleClientId(runtimeGoogleClientId),
          resolvedGoogleClientId: describeGoogleClientId(resolvedGoogleClientId),
        });
        setGoogleClientId(resolvedGoogleClientId);
        setConfigState(
          googleAuthEnabled && resolvedGoogleClientId
            ? 'ready'
            : googleAuthEnabled
              ? 'error'
              : 'disabled'
        );
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        logNativeAuthDebug('google-auth-config-fetch-failed', {
          errorMessage: getErrorMessage(error),
          fallbackClientId: describeGoogleClientId(embeddedGoogleClientId),
        });
        setGoogleClientId(embeddedGoogleClientId);
        setConfigState(embeddedGoogleClientId ? 'ready' : 'error');
      });

    return () => {
      isActive = false;
    };
  }, [embeddedGoogleClientId, nativeGoogleAuth, nativePluginAvailable]);

  const completeNativeGoogleSignIn = async (
    nativeResult: NativeGoogleSignInResult,
    source: 'plugin-promise' | 'app-restored-result'
  ) => {
    if (!nativeResult.idToken) {
      throw new Error('Google ID token was not returned.');
    }

    logNativeAuthDebug('google-auth-native-token-received', {
      source,
      idTokenLength: nativeResult.idToken.length,
      email: nativeResult.email || '',
      displayName: nativeResult.displayName || '',
    });
    logNativeAuthDebug('google-auth-native-backend-request-start', {
      source,
      url: `${backendApiBaseUrl}/auth/google`,
    });
    const result = await signInWithGoogle(nativeResult.idToken);

    if (!result.ok) {
      logNativeAuthDebug('google-auth-native-backend-failed', {
        source,
        error: result.error,
        message: result.message || '',
      });
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
      return false;
    }

    logNativeAuthDebug('google-auth-native-success', {
      source,
      redirectTo,
    });
    toast({
      title: messages.auth.googleSuccessTitle,
      description: messages.auth.googleSuccessDescription,
    });

    router.replace(redirectTo);
    return true;
  };

  useEffect(() => {
    if (!nativeGoogleAuth) {
      return;
    }

    let cancelled = false;

    const handleRestoredResult = (restoredResult?: NativeAppRestoredResult | null) => {
      if (!restoredResult || !isBirJoyGoogleSignInRestoredResult(restoredResult)) {
        return;
      }

      const restoredResultKey = getRestoredResultKey(restoredResult);

      if (handledRestoredResultKeyRef.current === restoredResultKey) {
        return;
      }

      handledRestoredResultKeyRef.current = restoredResultKey;
      window.__birjoyLastAppRestoredResult = undefined;
      console.info('plugin restored result', {
        success: Boolean(restoredResult.success),
        hasData: Boolean(restoredResult.data),
        hasError: Boolean(restoredResult.error),
      });
      logNativeAuthDebug('google-auth-native-restored-result-received', {
        success: Boolean(restoredResult.success),
        hasData: Boolean(restoredResult.data),
        hasError: Boolean(restoredResult.error),
      });

      void (async () => {
        setIsSubmitting(true);

        try {
          if (!restoredResult.success) {
            const errorMessage =
              getRestoredResultErrorMessage(restoredResult) ||
              'Google sign-in failed after returning from the Android account picker.';

            console.info('plugin rejected', {
              errorMessage,
            });

            if (isGoogleFlowCancellation(errorMessage)) {
              logNativeAuthDebug('google-auth-native-cancelled', {
                source: 'app-restored-result',
                errorMessage,
              });
              return;
            }

            throw new Error(errorMessage);
          }

          const restoredNativeResult = toNativeGoogleSignInResult(restoredResult.data);

          await completeNativeGoogleSignIn(restoredNativeResult, 'app-restored-result');
        } catch (error) {
          logNativeAuthDebug('google-auth-native-failed', {
            source: 'app-restored-result',
            errorMessage: getErrorMessage(error),
          });
          toast({
            title: messages.auth.requestFailedTitle,
            description:
              error instanceof Error ? error.message : messages.auth.requestFailedDescription,
            variant: 'destructive',
          });
        } finally {
          if (!cancelled) {
            setIsSubmitting(false);
          }
        }
      })();
    };

    handleRestoredResult(window.__birjoyLastAppRestoredResult);

    const onRestoredResult = (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        return;
      }

      handleRestoredResult(event.detail as NativeAppRestoredResult);
    };

    window.addEventListener('birjoy:app-restored-result', onRestoredResult);

    return () => {
      cancelled = true;
      window.removeEventListener('birjoy:app-restored-result', onRestoredResult);
    };
  }, [
    completeNativeGoogleSignIn,
    messages.auth.googleSuccessDescription,
    messages.auth.googleSuccessTitle,
    messages.auth.requestFailedDescription,
    messages.auth.requestFailedTitle,
    nativeGoogleAuth,
    redirectTo,
    router,
    toast,
  ]);

  useEffect(() => {
    if (nativeGoogleAuth) {
      logNativeAuthDebug('google-auth-web-flow-skipped', {
        reason: nativeBridgeReady ? 'native-android-detected' : 'native-shell-detected',
        nativePluginAvailable,
        nativeDiagnostics,
      });
      return;
    }

    if (!googleClientId || scriptState !== 'ready' || !window.google || !buttonRef.current) {
      return;
    }

    const container = buttonRef.current;
    const buttonWidth = Math.max(240, Math.round(container.getBoundingClientRect().width || 320));

    logNativeAuthDebug('google-auth-web-button-init', {
      googleClientId: describeGoogleClientId(googleClientId),
      buttonWidth,
    });
    container.innerHTML = '';
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      ux_mode: 'popup',
      cancel_on_tap_outside: true,
      callback: (response) => {
        void (async () => {
          if (!response.credential) {
            logNativeAuthDebug('google-auth-web-credential-missing');
            return;
          }

          logNativeAuthDebug('google-auth-web-credential-received', {
            credentialLength: response.credential.length,
          });
          setIsSubmitting(true);

          const result = await signInWithGoogle(response.credential);

          if (!result.ok) {
            logNativeAuthDebug('google-auth-web-backend-failed', {
              error: result.error,
              message: result.message || '',
            });
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

          logNativeAuthDebug('google-auth-web-success', {
            redirectTo,
          });
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
    logNativeAuthDebug('google-auth-web-button-rendered');

    return () => {
      container.innerHTML = '';
    };
  }, [
    googleClientId,
    messages,
    nativeBridgeReady,
    nativeDiagnostics,
    nativeGoogleAuth,
    nativePluginAvailable,
    redirectTo,
    router,
    scriptState,
    signInWithGoogle,
    toast,
  ]);

  const handleNativeGoogleSignIn = async () => {
    const clickDiagnostics = getNativePlatformDiagnostics();

    console.info('button clicked', {
      redirectTo,
    });
    console.info('isNativeAndroidApp result', clickDiagnostics.isNativeAndroidApp);
    console.info('Capacitor.getPlatform()', clickDiagnostics.platform);
    console.info('Capacitor.isNativePlatform()', clickDiagnostics.isNativePlatform);
    console.info('BirJoyAuth object exists', Boolean(BirJoyAuth));
    logNativeAuthDebug('google-auth-button-clicked', {
      flow: 'native',
      redirectTo,
      googleClientId: describeGoogleClientId(googleClientId),
      nativeDiagnostics: clickDiagnostics,
    });

    if (!googleClientId) {
      logNativeAuthDebug('google-auth-native-client-id-missing');
      toast({
        title: messages.auth.requestFailedTitle,
        description: messages.auth.googleUnavailableDescription,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const readyDiagnostics = await waitForBirJoyAuthPlugin();
      setNativeDiagnostics((currentDiagnostics) =>
        areNativePlatformDiagnosticsEqual(currentDiagnostics, readyDiagnostics)
          ? currentDiagnostics
          : readyDiagnostics
      );

      if (
        !isLikelyNativeAndroidShell(readyDiagnostics) ||
        !readyDiagnostics.birJoyAuthPluginAvailable
      ) {
        throw new Error(
          'BirJoyAuth native bridge is not ready in this WebView yet, so Google sign-in stayed on the frontend and never reached the Android plugin.'
        );
      }

      console.info('calling BirJoyAuth.signInWithGoogle', {
        serverClientIdPresent: Boolean(googleClientId),
      });
      logNativeAuthDebug('google-auth-native-plugin-call-start', {
        googleClientId: describeGoogleClientId(googleClientId),
      });
      const nativeResult = await BirJoyAuth.signInWithGoogle({
        serverClientId: googleClientId,
      });
      console.info('plugin resolved', {
        idTokenLength: nativeResult.idToken?.length || 0,
        email: nativeResult.email || '',
      });

      await completeNativeGoogleSignIn(nativeResult, 'plugin-promise');
    } catch (error) {
      console.info('plugin rejected', {
        errorMessage: getErrorMessage(error),
      });
      if (error instanceof Error && isGoogleFlowCancellation(error.message)) {
        logNativeAuthDebug('google-auth-native-cancelled', {
          errorMessage: error.message,
        });
        return;
      }

      logNativeAuthDebug('google-auth-native-failed', {
        errorMessage: getErrorMessage(error),
      });
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
  const isLoadingGoogle =
    configState !== 'ready' ||
    (nativeGoogleAuth ? !nativeBridgeReady : scriptState !== 'ready');

  return (
    <div className="space-y-4">
      {googleClientId && !nativeGoogleAuth ? (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={() => {
            logNativeAuthDebug('google-auth-web-script-loaded');
            setScriptState('ready');
          }}
          onError={() => {
            logNativeAuthDebug('google-auth-web-script-failed');
            setScriptState('error');
          }}
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
