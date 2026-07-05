function normalizeBaseUrl(value: string | undefined) {
  return value?.replace(/\/$/, '') || '';
}

const productionFrontendOrigin = 'https://www.bir-joy.uz';
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

const configuredBackendUrl =
  normalizeBaseUrl(process.env.NEXT_PUBLIC_BACKEND_URL) ||
  normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
const configuredFrontendUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL);
const isPublicBrowserSession =
  typeof window !== 'undefined' && !isLocalHostName(window.location.hostname);
const safeConfiguredBackendUrl =
  isPublicBrowserSession && isLocalUrl(configuredBackendUrl) ? '' : configuredBackendUrl;
const safeConfiguredFrontendUrl =
  configuredFrontendUrl && !isLocalUrl(configuredFrontendUrl)
    ? configuredFrontendUrl
    : process.env.NODE_ENV === 'production'
      ? productionFrontendOrigin
      : '';
const defaultBackendUrl =
  process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : productionBackendOrigin;
const directBackendBaseUrl = safeConfiguredBackendUrl || defaultBackendUrl;
const serverBackendProxyBaseUrl = safeConfiguredFrontendUrl
  ? `${safeConfiguredFrontendUrl}${browserBackendProxyBaseUrl}`
  : '';
const backendBaseUrl =
  typeof window !== 'undefined'
    ? browserBackendProxyBaseUrl
    : serverBackendProxyBaseUrl || directBackendBaseUrl;

export const backendApiBaseUrl = resolveApiBaseUrl(backendBaseUrl);
