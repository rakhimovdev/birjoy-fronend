export const backendApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:5000/api' : '');
