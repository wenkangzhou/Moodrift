'use client';

import { useEffect } from 'react';
import i18n from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { fallbackLng, languages } from '@/i18n/config';

const i18nInstance = i18n.createInstance();

i18nInstance
  .use(initReactI18next)
  .use(resourcesToBackend((language: string, namespace: string) => import(`@/locales/${language}/${namespace}.json`)))
  .init({
    lng: fallbackLng,
    fallbackLng,
    supportedLngs: languages,
    defaultNS: 'common',
    fallbackNS: 'common',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export function I18nProvider({ children, locale }: { children: React.ReactNode; locale: string }) {
  useEffect(() => {
    if (i18nInstance.language !== locale) {
      i18nInstance.changeLanguage(locale);
    }
  }, [locale]);

  return <I18nextProvider i18n={i18nInstance}>{children}</I18nextProvider>;
}
