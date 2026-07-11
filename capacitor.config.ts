import type { CapacitorConfig } from '@capacitor/cli';

function normalizeUrl(value: string | undefined) {
  return String(value || '').trim().replace(/\/$/, '');
}

function getHostname(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return '';
  }
}

const liveSiteUrl = normalizeUrl(process.env.CAPACITOR_LIVE_SITE_URL) || 'https://www.bir-joy.uz';
const apiHost = 'birjoy-backend.onrender.com';
const remoteSiteEnabled = String(process.env.CAPACITOR_LOAD_REMOTE_SITE || 'true').trim() !== 'false';
const allowedHosts = [...new Set(['www.bir-joy.uz', 'bir-joy.uz', getHostname(liveSiteUrl), apiHost].filter(Boolean))];

const config: CapacitorConfig = {
  appId: 'uz.birjoy.app',
  appName: 'BirJoy',
  webDir: 'mobile-shell',
  backgroundColor: '#FFFAF2',
  appendUserAgent: ' BirJoyNativeApp/1.0.0 BirJoyAndroidApp/1.0.0 Capacitor',
  loggingBehavior: 'none',
  android: {
    allowMixedContent: false,
    backgroundColor: '#FFFAF2',
    captureInput: true,
    minWebViewVersion: 110,
    resolveServiceWorkerRequests: false,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    backgroundColor: '#FFFAF2',
    contentInset: 'never',
    preferredContentMode: 'mobile',
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1800,
      backgroundColor: '#FFFAF2',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      splashFullScreen: true,
      splashImmersive: true,
    },
    Camera: {},
  },
  ...(remoteSiteEnabled
    ? {
        // The Android app currently needs to open the live BirJoy website in-app.
        // We keep a local mobile shell only for offline/error handling and future
        // migration toward bundled first-party web assets.
        server: {
          androidScheme: 'https',
          iosScheme: 'https',
          url: liveSiteUrl,
          cleartext: false,
          allowNavigation: allowedHosts,
          errorPath: 'offline.html',
        },
      }
    : {}),
};

export default config;
