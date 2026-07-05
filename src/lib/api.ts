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
const backendBaseUrl =
  typeof window !== 'undefined' ? browserBackendProxyBaseUrl : directBackendBaseUrl;

export const backendApiBaseUrl = backendBaseUrl
  ? backendBaseUrl === browserBackendProxyBaseUrl || backendBaseUrl.endsWith('/api')
    ? backendBaseUrl
    : `${backendBaseUrl}/api`
  : '';
