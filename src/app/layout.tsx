import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { LocaleProvider } from '@/components/providers/LocaleProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { NativeAppBridge } from '@/components/providers/NativeAppBridge';

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
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icon-192.png',
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
  themeColor: '#0B48D6',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body className="font-body antialiased bg-background">
        <AuthProvider>
          <LocaleProvider>
            <NativeAppBridge />
            {children}
            <Toaster />
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
