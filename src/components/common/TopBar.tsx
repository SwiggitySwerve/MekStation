import Link from 'next/link';
import { useRouter } from 'next/router';
/**
 * TopBar Navigation Component
 * Google/Facebook-style slim top bar with dropdowns and mobile menu.
 */
import React, { ReactElement, useState, useRef, useEffect } from 'react';

import { useMobileSidebarStore } from '@/stores/useNavigationStore';

import {
  MekStationIcon,
  HomeIcon,
  MechIcon,
  BookIcon,
  CustomizerIcon,
  GearIcon,
  CompareIcon,
  ChevronDownIcon,
  GithubIcon,
  PilotIcon,
  ForceIcon,
  CampaignIcon,
  EncounterIcon,
  GameIcon,
  TimelineIcon,
  GameplayIcon,
  QuickGameIcon,
  HamburgerIcon,
  CloseIcon,
} from './icons/NavigationIcons';

interface NavItemConfig {
  href: string;
  icon: ReactElement;
  label: string;
}

interface DropdownProps {
  label: string;
  icon?: ReactElement;
  items: NavItemConfig[];
  isAnyActive: boolean;
  isPathActive: (href: string) => boolean;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  iconOnly?: boolean;
}

// Hook for detecting clicks outside an element
function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  handler: () => void,
): void {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

// Desktop dropdown menu component
function DropdownMenu({
  label,
  icon,
  items,
  isAnyActive,
  isPathActive,
  isOpen,
  onOpen,
  onClose,
  iconOnly = false,
}: DropdownProps): ReactElement {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, onClose);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  return (
    <div ref={dropdownRef} className="group relative">
      <button
        onClick={() => (isOpen ? onClose() : onOpen())}
        onMouseEnter={onOpen}
        className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
          isOpen || isAnyActive
            ? 'text-accent bg-accent/10'
            : 'text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised/50'
        } `}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title={iconOnly ? label : undefined}
      >
        {icon && <span className="h-5 w-5">{icon}</span>}
        {!iconOnly && <span>{label}</span>}
        <ChevronDownIcon
          className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Tooltip for icon-only mode (when not open) */}
      {iconOnly && !isOpen && (
        <div className="bg-surface-raised text-text-theme-primary border-border-theme-subtle pointer-events-none invisible absolute top-full left-1/2 z-40 mt-2 -translate-x-1/2 rounded border px-2 py-1 text-xs whitespace-nowrap opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
          {label}
        </div>
      )}

      {/* Dropdown panel */}
      <div
        className={`bg-surface-base border-border-theme-subtle absolute top-full left-1/2 z-50 mt-1 min-w-[180px] origin-top -translate-x-1/2 rounded-lg border py-1 shadow-lg transition-all duration-150 ${isOpen ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0'} `}
        role="menu"
        onMouseLeave={onClose}
      >
        {items.map((item) => (
          <Link key={item.href} href={item.href} legacyBehavior>
            <a
              className={`flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors duration-150 ${
                isPathActive(item.href)
                  ? 'text-accent bg-accent/10'
                  : 'text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised/50'
              } `}
              role="menuitem"
            >
              <span className="h-5 w-5 flex-shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Simple nav link (non-dropdown)
function NavLink({
  href,
  icon,
  label,
  isActive,
  iconOnly = false,
}: {
  href: string;
  icon: ReactElement;
  label: string;
  isActive: boolean;
  iconOnly?: boolean;
}): ReactElement {
  return (
    <Link href={href} legacyBehavior>
      <a
        className={`group relative flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
          isActive
            ? 'text-accent bg-accent/10'
            : 'text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised/50'
        } `}
        title={iconOnly ? label : undefined}
      >
        <span className="h-5 w-5">{icon}</span>
        {!iconOnly && <span>{label}</span>}
        {/* Tooltip for icon-only mode */}
        {iconOnly && (
          <div className="bg-surface-raised text-text-theme-primary border-border-theme-subtle invisible absolute top-full z-50 mt-2 rounded border px-2 py-1 text-xs whitespace-nowrap opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
            {label}
          </div>
        )}
      </a>
    </Link>
  );
}

// Mobile menu overlay
function MobileMenu({
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

  // Close on route change
  useEffect(() => {
    const handleRouteChange = () => onClose();
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router.events, onClose]);

  // Prevent body scroll when open
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu panel */}
      <div className="bg-surface-deep fixed inset-0 z-50 flex flex-col md:hidden">
        {/* Header */}
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

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {/* Dashboard */}
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

          {/* Settings */}
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

        {/* Footer */}
        <div className="border-border-theme-subtle border-t px-4 py-3">
          <div className="text-text-theme-muted flex items-center justify-between text-xs">
            <span>v0.1.0</span>
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

type DropdownId = 'browse' | 'tools' | 'gameplay' | null;

const TopBar: React.FC = () => {
  const router = useRouter();
  const {
    isOpen: isMobileOpen,
    open: openMobile,
    close: closeMobile,
  } = useMobileSidebarStore();

  // Single state to track which dropdown is open (only one at a time)
  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);

  // Close dropdown on route change
  useEffect(() => {
    const handleRouteChange = () => setOpenDropdown(null);
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router.events]);

  // Check if a path is active
  const isPathActive = (href: string): boolean => {
    if (href === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(href);
  };

  // Navigation config
  const browseItems: NavItemConfig[] = [
    { href: '/units', icon: <MechIcon />, label: 'My Units' },
    { href: '/compendium', icon: <BookIcon />, label: 'Compendium' },
  ];

  const toolsItems: NavItemConfig[] = [
    { href: '/customizer', icon: <CustomizerIcon />, label: 'Customizer' },
    { href: '/compare', icon: <CompareIcon />, label: 'Compare' },
  ];

  const gameplayItems: NavItemConfig[] = [
    { href: '/gameplay/quick', icon: <QuickGameIcon />, label: 'Quick Game' },
    { href: '/gameplay/pilots', icon: <PilotIcon />, label: 'Pilots' },
    { href: '/gameplay/forces', icon: <ForceIcon />, label: 'Forces' },
    { href: '/gameplay/campaigns', icon: <CampaignIcon />, label: 'Campaigns' },
    {
      href: '/gameplay/encounters',
      icon: <EncounterIcon />,
      label: 'Encounters',
    },
    { href: '/gameplay/games', icon: <GameIcon />, label: 'Games' },
  ];

  const historyItems: NavItemConfig[] = [
    { href: '/audit/timeline', icon: <TimelineIcon />, label: 'Timeline' },
  ];

  // Check if any items in a section are active
  const isAnyBrowseActive = browseItems.some((item) => isPathActive(item.href));
  const isAnyToolsActive = toolsItems.some((item) => isPathActive(item.href));
  const isAnyGameplayActive = gameplayItems.some((item) =>
    isPathActive(item.href),
  );

  return (
    <>
      <header className="bg-surface-base border-border-theme-subtle sticky top-0 z-40 h-14 border-b print:hidden">
        <div className="flex h-full items-center px-4">
          {/* Left: Logo + Brand */}
          <Link href="/" legacyBehavior>
            <a className="flex flex-shrink-0 items-center gap-3 transition-opacity hover:opacity-90">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border-b-2 border-cyan-400/60 bg-[#3a3a3c] shadow-lg shadow-cyan-900/30">
                <MekStationIcon />
              </div>
              <div className="hidden sm:block">
                <span className="text-text-theme-primary text-base font-bold tracking-tight">
                  MekStation
                </span>
              </div>
            </a>
          </Link>

          {/* Center: Desktop Navigation (with labels) */}
          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            <NavLink
              href="/"
              icon={<HomeIcon />}
              label="Dashboard"
              isActive={isPathActive('/')}
            />
            <DropdownMenu
              label="Browse"
              icon={<BookIcon />}
              items={browseItems}
              isAnyActive={isAnyBrowseActive}
              isPathActive={isPathActive}
              isOpen={openDropdown === 'browse'}
              onOpen={() => setOpenDropdown('browse')}
              onClose={() => setOpenDropdown(null)}
            />
            <DropdownMenu
              label="Tools"
              icon={<CustomizerIcon />}
              items={toolsItems}
              isAnyActive={isAnyToolsActive}
              isPathActive={isPathActive}
              isOpen={openDropdown === 'tools'}
              onOpen={() => setOpenDropdown('tools')}
              onClose={() => setOpenDropdown(null)}
            />
            <DropdownMenu
              label="Gameplay"
              icon={<GameplayIcon />}
              items={gameplayItems}
              isAnyActive={isAnyGameplayActive}
              isPathActive={isPathActive}
              isOpen={openDropdown === 'gameplay'}
              onOpen={() => setOpenDropdown('gameplay')}
              onClose={() => setOpenDropdown(null)}
            />
            <NavLink
              href="/audit/timeline"
              icon={<TimelineIcon />}
              label="Timeline"
              isActive={isPathActive('/audit/timeline')}
            />
          </nav>

          {/* Center: Tablet Navigation (icons only) */}
          <nav className="hidden flex-1 items-center justify-center gap-1 md:flex lg:hidden">
            <NavLink
              href="/"
              icon={<HomeIcon />}
              label="Dashboard"
              isActive={isPathActive('/')}
              iconOnly
            />
            <DropdownMenu
              label="Browse"
              icon={<BookIcon />}
              items={browseItems}
              isAnyActive={isAnyBrowseActive}
              isPathActive={isPathActive}
              isOpen={openDropdown === 'browse'}
              onOpen={() => setOpenDropdown('browse')}
              onClose={() => setOpenDropdown(null)}
              iconOnly
            />
            <DropdownMenu
              label="Tools"
              icon={<CustomizerIcon />}
              items={toolsItems}
              isAnyActive={isAnyToolsActive}
              isPathActive={isPathActive}
              isOpen={openDropdown === 'tools'}
              onOpen={() => setOpenDropdown('tools')}
              onClose={() => setOpenDropdown(null)}
              iconOnly
            />
            <DropdownMenu
              label="Gameplay"
              icon={<GameplayIcon />}
              items={gameplayItems}
              isAnyActive={isAnyGameplayActive}
              isPathActive={isPathActive}
              isOpen={openDropdown === 'gameplay'}
              onOpen={() => setOpenDropdown('gameplay')}
              onClose={() => setOpenDropdown(null)}
              iconOnly
            />
            <NavLink
              href="/audit/timeline"
              icon={<TimelineIcon />}
              label="Timeline"
              isActive={isPathActive('/audit/timeline')}
              iconOnly
            />
          </nav>

          {/* Right: Actions */}
          <div className="ml-auto flex flex-shrink-0 items-center gap-1">
            {/* Desktop/Tablet: Settings and GitHub */}
            <div className="hidden items-center gap-1 md:flex">
              <Link href="/settings" legacyBehavior>
                <a
                  className={`rounded-lg p-2 transition-colors duration-150 ${
                    isPathActive('/settings')
                      ? 'text-accent bg-accent/10'
                      : 'text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised/50'
                  } `}
                  aria-label="Settings"
                >
                  <GearIcon />
                </a>
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised/50 rounded-lg p-2 transition-colors"
                aria-label="GitHub"
              >
                <GithubIcon />
              </a>
            </div>

            {/* Mobile: Hamburger */}
            <button
              onClick={openMobile}
              className="text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised/50 rounded-lg p-2 transition-colors md:hidden"
              aria-label="Open menu"
            >
              <HamburgerIcon />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileOpen}
        onClose={closeMobile}
        navConfig={{
          browse: browseItems,
          tools: toolsItems,
          gameplay: gameplayItems,
          history: historyItems,
        }}
        isPathActive={isPathActive}
      />
    </>
  );
};

export default TopBar;
