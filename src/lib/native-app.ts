'use client';

import { Capacitor, registerPlugin } from '@capacitor/core';

const APP_SCHEME = 'birjoy:';
const OWNED_HOSTS = new Set(['www.bir-joy.uz', 'bir-joy.uz']);
const NATIVE_USER_AGENT_TOKEN = 'BirJoyAndroidApp';

type BirJoyAuthPlugin = {
  signInWithGoogle(options: {
    serverClientId: string;
  }): Promise<{
    idToken: string;
    displayName?: string;
    email?: string;
    photoUrl?: string;
  }>;
};

export const BirJoyAuth = registerPlugin<BirJoyAuthPlugin>('BirJoyAuth');

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export function isNativeAndroidApp() {
  return isNativeApp() && Capacitor.getPlatform() === 'android';
}

export function isNativeUserAgent(userAgent?: string) {
  if (!userAgent) {
    return false;
  }

  return userAgent.includes(NATIVE_USER_AGENT_TOKEN);
}

export function isOwnedSiteHost(hostname: string) {
  return OWNED_HOSTS.has(hostname);
}

export function isOwnedSiteUrl(url: URL) {
  return isOwnedSiteHost(url.hostname);
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

