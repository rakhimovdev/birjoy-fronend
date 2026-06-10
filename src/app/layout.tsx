import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { LocaleProvider } from '@/components/providers/LocaleProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';

export const metadata: Metadata = {
  title: 'BirJoy | Hammasi Bir Joyda',
  description: 'BirJoy is a multilingual marketplace for buying and selling across Uzbekistan.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
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
            {children}
            <Toaster />
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
