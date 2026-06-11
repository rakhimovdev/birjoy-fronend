const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
const defaultApiBaseUrl =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000/api'
    : 'https://birjoy-backend.onrender.com/api';

export const backendApiBaseUrl = configuredApiBaseUrl || defaultApiBaseUrl;
