import Link from 'next/link';
import { useRouter } from 'next/router';
/**
 * TopBar Navigation Component
 * Google/Facebook-style slim top bar with dropdowns and mobile menu.
 */
import React, { useState, useEffect } from 'react';

import { useMobileSidebarStore } from '@/stores/useNavigationStore';

import {
  MekStationIcon,
  HomeIcon,
  MechIcon,
  BookIcon,
  CustomizerIcon,
  GearIcon,
  CompareIcon,
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
} from './icons/NavigationIcons';
import { DropdownMenu, NavLink, type NavItemConfig } from './TopBarMenu';
import { MobileMenu } from './TopBarMobileMenu';

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
