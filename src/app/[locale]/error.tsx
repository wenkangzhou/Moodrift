'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/logger';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation('common');

  useEffect(() => {
    // Log to monitoring service in production
    logger.error('[LocaleError]', error);
  }, [error]);

  return (
    <div className="relative z-10 flex h-screen flex-col items-center justify-center px-6 text-center">
      <h2 className="text-2xl font-medium tracking-tight text-foreground mb-2">
        {t('error.title')}
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {t('error.description')}
      </p>
      <button
        onClick={reset}
        className="px-6 py-2 rounded-full bg-primary/90 text-primary-foreground text-sm font-medium hover:bg-primary transition-colors shadow-lg shadow-primary/20"
      >
        {t('error.retry')}
      </button>
    </div>
  );
}
