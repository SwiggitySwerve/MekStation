import Link from 'next/link';
import { useRouter } from 'next/router';
/**
 * MobileBottomNav Component
 * Persistent bottom navigation for mobile devices (md:hidden).
 */
import React, { ReactElement } from 'react';

import {
  HomeIcon,
  BookIcon,
  GameplayIcon,
  GearIcon,
} from './icons/NavigationIcons';

interface NavItem {
  label: string;
  href: string;
  icon: ReactElement;
  matchPaths: string[];
}

const navItems: NavItem[] = [
  {
    label: 'Home',
    href: '/',
    icon: <HomeIcon />,
    matchPaths: ['/'],
  },
  {
    label: 'Browse',
    href: '/compendium',
    icon: <BookIcon />,
    matchPaths: ['/compendium', '/units'],
  },
  {
    label: 'Gameplay',
    href: '/gameplay',
    icon: <GameplayIcon />,
    matchPaths: ['/gameplay'],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: <GearIcon />,
    matchPaths: ['/settings'],
  },
];

export function MobileBottomNav(): ReactElement {
  const router = useRouter();

  const isActive = (item: NavItem): boolean => {
    if (item.href === '/' && router.pathname === '/') {
      return true;
    }
    return item.matchPaths.some(
      (path) => path !== '/' && router.pathname.startsWith(path),
    );
  };

  return (
    <nav
      className="bg-surface-base border-border-theme-subtle fixed right-0 bottom-0 left-0 z-50 border-t md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div
        className="flex items-stretch justify-around"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link key={item.href} href={item.href} legacyBehavior>
              <a
                className={`relative flex min-h-[56px] flex-1 flex-col items-center justify-center px-1 py-2 transition-colors duration-150 ${
                  active
                    ? 'text-accent'
                    : 'text-text-theme-secondary active:text-text-theme-primary'
                } `}
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <div className="bg-accent absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full" />
                )}
                <div className="mb-1 h-6 w-6">{item.icon}</div>
                <span className="max-w-full truncate text-[10px] leading-tight font-medium">
                  {item.label}
                </span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileBottomNav;
