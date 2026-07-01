import type { NextConfig } from 'next';

const isDevelopment = process.env.NODE_ENV !== 'production';
const productionFrontendUrl = 'https://www.bir-joy.uz';
const productionBackendUrl = 'https://birjoy-backend.onrender.com';

function normalizeUrl(value: string | undefined) {
  return String(value || '').trim().replace(/\/$/, '');
}

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

function pickPublicUrl(value: string | undefined, fallback: string) {
  const normalized = normalizeUrl(value);

  if (!normalized) {
    return fallback;
  }

  if (!isDevelopment && isLocalUrl(normalized)) {
    return fallback;
  }

  return normalized;
}

const frontendUrl = pickPublicUrl(
  process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL,
  isDevelopment ? 'http://localhost:9002' : productionFrontendUrl
);
const backendUrl = pickPublicUrl(
  process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL,
  isDevelopment ? 'http://localhost:5000' : productionBackendUrl
);
const googleClientId =
  process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

const nextConfig: NextConfig = {
  experimental: {
    // The production crash points to a useEffectEvent runtime mismatch.
    // Keeping the React compiler off avoids compiler-generated hooks
    // in environments that are still serving an older React runtime.
    reactCompiler: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 390, 412, 768, 800, 1024, 1280, 1366, 1536],
    imageSizes: [48, 64, 96, 128, 160, 192, 256, 320, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_SITE_URL: frontendUrl,
    NEXT_PUBLIC_BACKEND_URL: backendUrl,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: googleClientId,
  },
};

export default nextConfig;
