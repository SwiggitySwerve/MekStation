import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { ReactElement, useEffect } from 'react';

import { APP_VERSION_LABEL } from '@/constants/appVersion';

import type { NavItemConfig } from './TopBarMenu';

import {
  MekStationIcon,
  HomeIcon,
  GearIcon,
  GithubIcon,
  CloseIcon,
} from './icons/NavigationIcons';

export function MobileMenu({
  isOpen,
  onClose,
  navConfig,
  isPathActive,
}: {
  isOpen: boolean;
  onClose: () => void;
  navConfig: {
    browse: NavItemConfig[];
    tools: NavItemConfig[];
    gameplay: NavItemConfig[];
    history: NavItemConfig[];
  };
  isPathActive: (href: string) => boolean;
}): ReactElement | null {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = () => onClose();
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router.events, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const renderSection = (title: string, items: NavItemConfig[]) => (
    <div className="py-2">
      <div className="px-4 py-2">
        <span className="text-text-theme-muted text-[10px] font-semibold tracking-wider uppercase">
          {title}
        </span>
      </div>
      {items.map((item) => (
        <Link key={item.href} href={item.href} legacyBehavior>
          <a
            className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors duration-150 ${
              isPathActive(item.href)
                ? 'text-accent bg-accent/10'
                : 'text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised/50'
            } `}
          >
            <span className="h-5 w-5 flex-shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        </Link>
      ))}
    </div>
  );

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="bg-surface-deep fixed inset-0 z-50 flex flex-col md:hidden">
        <div className="border-border-theme-subtle bg-surface-base flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border-b-2 border-cyan-400/60 bg-[#3a3a3c] shadow-lg shadow-cyan-900/30">
              <MekStationIcon />
            </div>
            <span className="text-text-theme-primary text-base font-bold">
              MekStation
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised/50 rounded-lg p-2 transition-colors"
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          <Link href="/" legacyBehavior>
            <a
              className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors duration-150 ${
                isPathActive('/')
                  ? 'text-accent bg-accent/10'
                  : 'text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised/50'
              } `}
            >
              <span className="h-5 w-5">
                <HomeIcon />
              </span>
              <span>Dashboard</span>
            </a>
          </Link>

          <div className="border-border-theme-subtle mx-4 my-2 border-t" />

          {renderSection('Browse', navConfig.browse)}

          <div className="border-border-theme-subtle mx-4 my-2 border-t" />

          {renderSection('Tools', navConfig.tools)}

          <div className="border-border-theme-subtle mx-4 my-2 border-t" />

          {renderSection('Gameplay', navConfig.gameplay)}

          <div className="border-border-theme-subtle mx-4 my-2 border-t" />

          {renderSection('History', navConfig.history)}

          <div className="border-border-theme-subtle mx-4 my-2 border-t" />

          <Link href="/settings" legacyBehavior>
            <a
              className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors duration-150 ${
                isPathActive('/settings')
                  ? 'text-accent bg-accent/10'
                  : 'text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised/50'
              } `}
            >
              <span className="h-5 w-5">
                <GearIcon />
              </span>
              <span>Settings</span>
            </a>
          </Link>
        </nav>

        <div className="border-border-theme-subtle border-t px-4 py-3">
          <div className="text-text-theme-muted flex items-center justify-between text-xs">
            <span>{APP_VERSION_LABEL}</span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              <GithubIcon />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
