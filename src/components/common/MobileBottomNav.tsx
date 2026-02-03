/**
 * MobileBottomNav Component
 * Persistent bottom navigation for mobile devices (md:hidden).
 */
import React, { ReactElement } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
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
      (path) => path !== '/' && router.pathname.startsWith(path)
    );
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-surface-base border-t border-border-theme-subtle"
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
                className={`
                  flex flex-col items-center justify-center flex-1 min-h-[56px] py-2 px-1
                  transition-colors duration-150 relative
                  ${
                    active
                      ? 'text-accent'
                      : 'text-text-theme-secondary active:text-text-theme-primary'
                  }
                `}
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-accent rounded-full" />
                )}
                <div className="w-6 h-6 mb-1">
                  {item.icon}
                </div>
                <span className="text-[10px] font-medium leading-tight truncate max-w-full">
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
