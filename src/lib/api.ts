function normalizeBaseUrl(value: string | undefined) {
  return value?.replace(/\/$/, '') || '';
}

const configuredBackendUrl =
  normalizeBaseUrl(process.env.NEXT_PUBLIC_BACKEND_URL) ||
  normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
const runtimeBackendUrl =
  typeof window !== 'undefined' ? normalizeBaseUrl(window.location.origin) : '';
const defaultBackendUrl =
  process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : runtimeBackendUrl;
const backendBaseUrl = configuredBackendUrl || defaultBackendUrl;

export const backendApiBaseUrl = backendBaseUrl
  ? backendBaseUrl.endsWith('/api')
    ? backendBaseUrl
    : `${backendBaseUrl}/api`
  : '';
