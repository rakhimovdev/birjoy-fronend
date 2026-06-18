const configuredBackendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
const defaultBackendUrl =
  process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : '';
const backendBaseUrl = configuredBackendUrl || defaultBackendUrl;

export const backendApiBaseUrl = backendBaseUrl
  ? backendBaseUrl.endsWith('/api')
    ? backendBaseUrl
    : `${backendBaseUrl}/api`
  : '';
