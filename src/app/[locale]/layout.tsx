import type { Metadata } from 'next';
import '../globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { I18nProvider } from '@/components/providers/i18n-provider';
import { LanguageSwitcher } from '@/components/language-switcher';
import { languages } from '@/i18n/config';

export const metadata: Metadata = {
  title: 'Moodrift',
  description: 'A space for your current mood.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
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
