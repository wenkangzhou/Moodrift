'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export function ServiceWorker() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        logger.log('[SW] Registered:', reg.scope);
      })
      .catch((err) => {
        logger.warn('[SW] Registration failed:', err);
      });
  }, []);

  return null;
}
