'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function LanguageSwitcher() {
  const pathname = usePathname();
  const currentLocale = pathname.startsWith('/en') ? 'en' : 'zh';

  const switchLocale = currentLocale === 'zh' ? 'en' : 'zh';

  const targetPath = pathname.replace(/^\/(zh|en)/, `/${switchLocale}`);

  return (
    <Link
      href={targetPath || `/${switchLocale}`}
      className="text-xs font-medium tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors duration-300"
    >
      {switchLocale === 'zh' ? '中' : 'EN'}
    </Link>
  );
}
