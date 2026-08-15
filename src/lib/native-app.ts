'use client';

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

const APP_SCHEME = 'birjoy:';
const OWNED_HOSTS = new Set(['www.bir-joy.uz', 'bir-joy.uz']);
const NATIVE_USER_AGENT_TOKENS = ['BirJoyNativeApp', 'BirJoyAndroidApp'];
const shouldLogNativeAuthInBrowser = process.env.NODE_ENV !== 'production';

export type NativeGoogleAuthDebugEvent = {
  step: string;
  message: string;
  data?: Record<string, unknown>;
};

export type NativeAppRestoredResult = {
  pluginId?: string;
  methodName?: string;
  success?: boolean;
  data?: Record<string, unknown>;
  error?: {
    message?: string;
    code?: string;
    data?: Record<string, unknown>;
  };
  receivedAt?: number;
};

export type NativePlatformDiagnostics = {
  platform: string;
  isNativePlatform: boolean;
  isNativeAndroidApp: boolean;
  isNativeIosApp: boolean;
  userAgentHasNativeToken: boolean;
  hasAndroidBridge: boolean;
  hasCapacitorObject: boolean;
  pluginHeaderNames: string[];
  birJoyAuthHeaderPresent: boolean;
  birJoyAuthPluginAvailable: boolean;
  locationHref: string;
};

type BirJoyAuthPlugin = {
  signInWithGoogle(options: {
    serverClientId: string;
  }): Promise<{
    idToken: string;
    displayName?: string;
    email?: string;
    photoUrl?: string;
  }>;
  signInWithApple(options?: {
    // Optionally allow passing requested scopes or state if needed
    scopes?: string[];
  }): Promise<{
    identityToken?: string;
    authorizationCode?: string;
    email?: string;
    fullName?: string;
  }>;
  addListener(
    eventName: 'googleAuthDebug',
    listenerFunc: (event: NativeGoogleAuthDebugEvent) => void
  ): Promise<PluginListenerHandle>;
};

export const BirJoyAuth = registerPlugin<BirJoyAuthPlugin>('BirJoyAuth');

function hasWindowObject() {
  return typeof window !== 'undefined';
}

type CapacitorPluginHeader = {
  name?: string;
};

declare global {
  interface Window {
    Capacitor?: {
      PluginHeaders?: CapacitorPluginHeader[];
    };
    __birjoyLastAppRestoredResult?: NativeAppRestoredResult;
  }
}

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export function isNativeAndroidApp() {
  return isNativeApp() && Capacitor.getPlatform() === 'android';
}

export function isNativeIosApp() {
  return isNativeApp() && Capacitor.getPlatform() === 'ios';
}

export function isNativeUserAgent(userAgent?: string) {
  if (!userAgent) {
    return false;
  }

  return NATIVE_USER_AGENT_TOKENS.some((token) => userAgent.includes(token));
}

export function isOwnedSiteHost(hostname: string) {
  return OWNED_HOSTS.has(hostname);
}

export function isOwnedSiteUrl(url: URL) {
  return isOwnedSiteHost(url.hostname);
}

export function getNativePlatformDiagnostics(): NativePlatformDiagnostics {
  const userAgent = hasWindowObject() ? window.navigator.userAgent : '';
  const pluginHeaders =
    hasWindowObject() && Array.isArray(window.Capacitor?.PluginHeaders)
      ? window.Capacitor.PluginHeaders
      : [];

  return {
    platform: Capacitor.getPlatform(),
    isNativePlatform: Capacitor.isNativePlatform(),
    isNativeAndroidApp: isNativeAndroidApp(),
    isNativeIosApp: isNativeIosApp(),
    userAgentHasNativeToken: isNativeUserAgent(userAgent),
    hasAndroidBridge: hasWindowObject() && 'androidBridge' in window,
    hasCapacitorObject: hasWindowObject() && typeof window.Capacitor !== 'undefined',
    pluginHeaderNames: pluginHeaders
      .map((header: CapacitorPluginHeader) => header?.name)
      .filter((headerName): headerName is string => Boolean(headerName)),
    birJoyAuthHeaderPresent: pluginHeaders.some(
      (header: CapacitorPluginHeader) => header?.name === 'BirJoyAuth'
    ),
    birJoyAuthPluginAvailable: Capacitor.isPluginAvailable('BirJoyAuth'),
    locationHref: hasWindowObject() ? window.location.href : '',
  };
}

export function areNativePlatformDiagnosticsEqual(
  current: NativePlatformDiagnostics,
  next: NativePlatformDiagnostics
) {
  return (
    current.platform === next.platform &&
    current.isNativePlatform === next.isNativePlatform &&
    current.isNativeAndroidApp === next.isNativeAndroidApp &&
    current.isNativeIosApp === next.isNativeIosApp &&
    current.userAgentHasNativeToken === next.userAgentHasNativeToken &&
    current.hasAndroidBridge === next.hasAndroidBridge &&
    current.hasCapacitorObject === next.hasCapacitorObject &&
    current.birJoyAuthHeaderPresent === next.birJoyAuthHeaderPresent &&
    current.birJoyAuthPluginAvailable === next.birJoyAuthPluginAvailable &&
    current.locationHref === next.locationHref &&
    current.pluginHeaderNames.join(',') === next.pluginHeaderNames.join(',')
  );
}

export function isLikelyNativeAndroidShell(
  diagnostics: NativePlatformDiagnostics = getNativePlatformDiagnostics()
) {
  return (
    diagnostics.isNativeAndroidApp ||
    diagnostics.hasAndroidBridge ||
    diagnostics.birJoyAuthHeaderPresent
  );
}

export function isLikelyNativeShell(
  diagnostics: NativePlatformDiagnostics = getNativePlatformDiagnostics()
) {
  return (
    diagnostics.isNativePlatform ||
    diagnostics.userAgentHasNativeToken ||
    isLikelyNativeAndroidShell(diagnostics)
  );
}

export async function waitForBirJoyAuthPlugin(options?: {
  timeoutMs?: number;
  pollIntervalMs?: number;
}) {
  if (!hasWindowObject()) {
    return getNativePlatformDiagnostics();
  }

  const timeoutMs = options?.timeoutMs ?? 4000;
  const pollIntervalMs = options?.pollIntervalMs ?? 120;
  const startedAt = Date.now();
  let diagnostics = getNativePlatformDiagnostics();

  while (Date.now() - startedAt < timeoutMs) {
    if (isLikelyNativeAndroidShell(diagnostics) && diagnostics.birJoyAuthPluginAvailable) {
      return diagnostics;
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, pollIntervalMs);
    });
    diagnostics = getNativePlatformDiagnostics();
  }

  return diagnostics;
}

export function logNativeAuthDebug(step: string, data?: Record<string, unknown>) {
  if (!hasWindowObject() || !shouldLogNativeAuthInBrowser) {
    return;
  }

  console.info('[BirJoyAuth]', step, data || {});
}

export function extractInAppPath(urlValue: string) {
  try {
    const url = new URL(urlValue);

    if (url.protocol === APP_SCHEME) {
      const path = url.pathname.startsWith('/') ? url.pathname : `/${url.pathname}`;
      return `${path}${url.search}${url.hash}`;
    }

    if (!isOwnedSiteUrl(url)) {
      return '';
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '';
  }
}
