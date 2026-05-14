'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/stores/useAppStore';
import { languages } from '@/i18n/config';

export function LanguageSwitcher() {
  const pathname = usePathname();
  const currentLocale = useAppStore((s) => s.locale);

  const switchLocale = currentLocale === 'zh' ? 'en' : 'zh';

  const targetPath = pathname.replace(/^\/(zh|en)/, `/${switchLocale}`);

  return (
    <Link
      href={targetPath || `/${switchLocale}`}
      className="text-xs font-medium tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors duration-300"
      onClick={() => useAppStore.getState().setLocale(switchLocale)}
    >
      {switchLocale === 'zh' ? '中' : 'EN'}
    </Link>
  );
}
