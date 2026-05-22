import type { Metadata, Viewport } from 'next';
import '../globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { I18nProvider } from '@/components/providers/i18n-provider';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ServiceWorker } from '@/components/service-worker';
import { languages } from '@/i18n/config';

export const metadata: Metadata = {
  title: 'Moodrift',
  description: 'A space for your current mood.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Moodrift',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export function generateStaticParams() {
  return languages.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <html lang={locale} className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground font-sans">
        <ServiceWorker />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <I18nProvider locale={locale}>
            <div className="fixed top-6 right-6 z-50">
              <LanguageSwitcher />
            </div>
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
