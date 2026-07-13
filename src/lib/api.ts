function normalizeBaseUrl(value: string | undefined) {
  return value?.replace(/\/$/, '') || '';
}

const productionBackendOrigin = 'https://birjoy-backend.onrender.com';
const browserBackendProxyBaseUrl = '/api/backend';

function isLocalHostName(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.local')
  );
}

function isLocalUrl(value: string) {
  try {
    return isLocalHostName(new URL(value).hostname);
  } catch {
    return false;
  }
}

function resolveApiBaseUrl(value: string) {
  if (!value) {
    return '';
  }

  if (
    value === browserBackendProxyBaseUrl ||
    value.endsWith('/api') ||
    value.endsWith('/api/backend')
  ) {
    return value;
  }

  return `${value}/api`;
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsedValue = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

const configuredBackendUrl =
  normalizeBaseUrl(process.env.NEXT_PUBLIC_BACKEND_URL) ||
  normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
const isPublicBrowserSession =
  typeof window !== 'undefined' && !isLocalHostName(window.location.hostname);
const safeConfiguredBackendUrl =
  isPublicBrowserSession && isLocalUrl(configuredBackendUrl) ? '' : configuredBackendUrl;
const defaultBackendUrl =
  process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : productionBackendOrigin;
const directBackendBaseUrl = safeConfiguredBackendUrl || defaultBackendUrl;
const backendBaseUrl = directBackendBaseUrl || browserBackendProxyBaseUrl;

const defaultApiTimeoutMs = parsePositiveInteger(
  process.env.NEXT_PUBLIC_API_TIMEOUT_MS,
  15000
);

export const backendApiBaseUrl = resolveApiBaseUrl(backendBaseUrl);

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: {
    timeoutMs?: number;
  }
) {
  const timeoutMs = options?.timeoutMs ?? defaultApiTimeoutMs;

  if (timeoutMs <= 0) {
    return fetch(input, init);
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort(new DOMException('The request timed out.', 'AbortError'));
  }, timeoutMs);
  const externalSignal = init?.signal;

  const abortFromExternalSignal = () => {
    controller.abort(externalSignal?.reason);
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', abortFromExternalSignal, { once: true });
    }
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    globalThis.clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', abortFromExternalSignal);
  }
}
