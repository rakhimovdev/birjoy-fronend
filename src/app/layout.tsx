import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { LocaleProvider } from '@/components/providers/LocaleProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { NativeAppBridge } from '@/components/providers/NativeAppBridge';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { getThemeInlineScript, themeColorByMode } from '@/lib/theme';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bir-joy.uz';

export const metadata: Metadata = {
  applicationName: 'BirJoy',
  metadataBase: new URL(siteUrl),
  title: 'BirJoy | Hammasi Bir Joyda',
  description: 'BirJoy is a multilingual marketplace for buying and selling across Uzbekistan.',
  alternates: {
    canonical: '/',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BirJoy',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content={themeColorByMode.light} />
        <script dangerouslySetInnerHTML={{ __html: getThemeInlineScript() }} />
      </head>
      <body className="font-body antialiased bg-background">
        <ThemeProvider>
          <AuthProvider>
            <LocaleProvider>
              <NativeAppBridge />
              {children}
              <Toaster />
            </LocaleProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
