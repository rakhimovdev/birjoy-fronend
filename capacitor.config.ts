import type { CapacitorConfig } from '@capacitor/cli';

const liveSiteUrl = 'https://www.bir-joy.uz';
const apiHost = 'birjoy-backend.onrender.com';

const config: CapacitorConfig = {
  appId: 'uz.birjoy.app',
  appName: 'BirJoy',
  webDir: 'mobile-shell',
  backgroundColor: '#FFFAF2',
  appendUserAgent: ' BirJoyAndroidApp/1.0.0 Capacitor',
  loggingBehavior: 'none',
  server: {
    androidScheme: 'https',
    url: liveSiteUrl,
    cleartext: false,
    allowNavigation: ['www.bir-joy.uz', 'bir-joy.uz', apiHost],
    errorPath: 'offline.html',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#FFFAF2',
    captureInput: true,
    minWebViewVersion: 110,
    resolveServiceWorkerRequests: false,
    webContentsDebuggingEnabled: false,
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
};

export default config;
