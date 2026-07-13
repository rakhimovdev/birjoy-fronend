'use client';

import { backendApiBaseUrl, fetchWithTimeout } from '@/lib/api';

export type PublicRuntimeConfig = {
  googleAuthEnabled: boolean;
  googleClientId: string;
  yandexAuthEnabled: boolean;
};

const PUBLIC_CONFIG_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedPublicConfig:
  | {
      data: PublicRuntimeConfig;
      expiresAt: number;
    }
  | null = null;
let inflightPublicConfigRequest: Promise<PublicRuntimeConfig> | null = null;

function normalizePublicConfig(payload?: Partial<PublicRuntimeConfig> | null) {
  return {
    googleAuthEnabled: Boolean(payload?.googleAuthEnabled),
    googleClientId: typeof payload?.googleClientId === 'string' ? payload.googleClientId.trim() : '',
    yandexAuthEnabled: Boolean(payload?.yandexAuthEnabled),
  } satisfies PublicRuntimeConfig;
}

export function invalidatePublicConfigCache() {
  cachedPublicConfig = null;
  inflightPublicConfigRequest = null;
}

export async function fetchPublicRuntimeConfig(options?: { signal?: AbortSignal }) {
  if (!backendApiBaseUrl) {
    return normalizePublicConfig();
  }

  if (cachedPublicConfig && cachedPublicConfig.expiresAt > Date.now()) {
    return cachedPublicConfig.data;
  }

  if (inflightPublicConfigRequest) {
    return inflightPublicConfigRequest;
  }

  inflightPublicConfigRequest = fetchWithTimeout(`${backendApiBaseUrl}/config/public`, {
    cache: 'no-store',
    credentials: 'include',
    signal: options?.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('Failed to load public config.');
      }

      const data = normalizePublicConfig(
        (await response.json().catch(() => ({}))) as Partial<PublicRuntimeConfig>
      );

      cachedPublicConfig = {
        data,
        expiresAt: Date.now() + PUBLIC_CONFIG_CACHE_TTL_MS,
      };

      return data;
    })
    .finally(() => {
      inflightPublicConfigRequest = null;
    });

  return inflightPublicConfigRequest;
}
