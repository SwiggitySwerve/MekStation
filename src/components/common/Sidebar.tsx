/**
 * Sidebar Navigation Component
 * COMP/CON-inspired design with amber accents and left border active states.
 */
import React, { ReactElement } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMobileSidebarStore } from '@/stores/navigationStore';
import {
  MekStationIcon,
  HomeIcon,
  MechIcon,
  BookIcon,
  CustomizerIcon,
  GearIcon,
  CompareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GithubIcon,
} from './icons/NavigationIcons';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
}

interface NavItemProps {
  href: string;
  icon: ReactElement;
  label: string;
  isCollapsed: boolean;
  isActive: boolean;
  onClick?: () => void;
}

interface NavSectionProps {
  title?: string;
  children: React.ReactNode;
  isCollapsed: boolean;
}

// Navigation section wrapper with optional title
function NavSection({ title, children, isCollapsed }: NavSectionProps): ReactElement {
  return (
    <div className="mb-2">
      {title && !isCollapsed && (
        <div className="px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-theme-muted">
            {title}
          </span>
        </div>
      )}
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  );
}

// Individual navigation item
function NavItem({ href, icon, label, isCollapsed, isActive, onClick }: NavItemProps): ReactElement {
  return (
    <Link href={href} legacyBehavior>
      <a
        onClick={onClick}
        className={`
          relative flex items-center px-3 py-2.5 mx-2 rounded-lg
          transition-all duration-150 group
          ${isCollapsed ? 'justify-center' : 'gap-3'}
          ${isActive
            ? 'bg-accent/15 text-accent'
            : 'text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised/50'
          }
        `}
      >
        {/* Active indicator - left border */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent rounded-r-full" />
        )}
        
        {/* Icon */}
        <span className={`flex-shrink-0 ${isActive ? 'text-accent' : 'text-text-theme-secondary group-hover:text-text-theme-primary'}`}>
          {icon}
        </span>
        
        {/* Label */}
        {!isCollapsed && (
          <span className="text-sm font-medium truncate">{label}</span>
        )}
        
        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-surface-base text-text-theme-primary text-sm rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 whitespace-nowrap border border-border-theme-subtle">
            {label}
          </div>
        )}
      </a>
    </Link>
  );
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isCollapsed, 
  setIsCollapsed,
}) => {
  const router = useRouter();
  
  // Mobile sidebar state from store
  const { isOpen: isMobileOpen, close: closeMobileDrawer } = useMobileSidebarStore();
  
  // On mobile, always show expanded (full labels) regardless of desktop collapsed state
  // This ensures mobile users always see the full navigation
  const effectiveCollapsed = isMobileOpen ? false : isCollapsed;
  
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Close mobile drawer on navigation
  const handleNavClick = () => {
    // Close mobile drawer when navigating (on mobile only)
    if (isMobileOpen) {
      closeMobileDrawer();
    }
  };

  // Check if a path is active (handles nested routes)
  const isPathActive = (href: string): boolean => {
    if (href === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(href);
  };

  // Navigation items organized by section
  const browseItems = [
    {
      href: '/units',
      icon: <MechIcon />,
      label: 'Units',
    },
    {
      href: '/compendium',
      icon: <BookIcon />,
      label: 'Compendium',
    },
  ];

  const toolsItems = [
    {
      href: '/customizer',
      icon: <CustomizerIcon />,
      label: 'Customizer',
    },
    {
      href: '/compare',
      icon: <CompareIcon />,
      label: 'Compare',
    },
  ];

  const settingsItems = [
    {
      href: '/settings',
      icon: <GearIcon />,
      label: 'Settings',
    },
  ];

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
          onClick={closeMobileDrawer}
          aria-hidden="true"
        />
      )}
      
      <aside
        className={`
          bg-surface-deep border-r border-surface-base text-text-theme-primary
          print:hidden flex flex-col
          ${effectiveCollapsed ? 'w-16' : 'w-56'}
          fixed inset-y-0 left-0 z-50
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:z-30 lg:transition-[width]
        `}
      >
      {/* Header / Brand */}
      <div className={`
        flex items-center h-14 border-b border-surface-base
        ${effectiveCollapsed ? 'justify-center px-2' : 'px-4 gap-3'}
      `}>
        {/* Logo/Icon */}
        <div className="flex-shrink-0 w-8 h-8 bg-[#3a3a3c] rounded-lg flex items-center justify-center shadow-lg shadow-cyan-900/30 border-b-2 border-cyan-400/60">
          <MekStationIcon />
        </div>
        
        {/* App name */}
        {!effectiveCollapsed && (
          <div className="flex-1 min-w-0">
            <span className="text-base font-bold text-text-theme-primary tracking-tight">MekStation</span>
            <span className="block text-[10px] text-text-theme-muted uppercase tracking-wider">BattleTech Lab</span>
          </div>
        )}
        
        {/* Collapse toggle - hidden on mobile, only shown on desktop */}
        <button
          onClick={toggleSidebar}
          className={`
            p-1.5 rounded-lg text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised/50
            transition-colors flex-shrink-0 hidden lg:block
            ${effectiveCollapsed ? '' : 'ml-auto'}
          `}
          aria-label={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {effectiveCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-autohide">
        {/* Home */}
        <div className="mb-4">
          <NavItem
            href="/"
            icon={<HomeIcon />}
            label="Dashboard"
            isCollapsed={effectiveCollapsed}
            isActive={isPathActive('/')}
            onClick={handleNavClick}
          />
        </div>

        {/* Divider */}
        {!effectiveCollapsed && <div className="mx-4 border-t border-surface-base mb-4" />}

        {/* Browse Section */}
        <NavSection title="Browse" isCollapsed={effectiveCollapsed}>
          {browseItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              isCollapsed={effectiveCollapsed}
              isActive={isPathActive(item.href)}
              onClick={handleNavClick}
            />
          ))}
        </NavSection>

        {/* Divider */}
        {!effectiveCollapsed && <div className="mx-4 border-t border-surface-base my-4" />}

        {/* Tools Section */}
        <NavSection title="Tools" isCollapsed={effectiveCollapsed}>
          {toolsItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              isCollapsed={effectiveCollapsed}
              isActive={isPathActive(item.href)}
              onClick={handleNavClick}
            />
          ))}
        </NavSection>

        {/* Divider */}
        {!effectiveCollapsed && <div className="mx-4 border-t border-surface-base my-4" />}

        {/* Settings Section */}
        <NavSection isCollapsed={effectiveCollapsed}>
          {settingsItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              isCollapsed={effectiveCollapsed}
              isActive={isPathActive(item.href)}
              onClick={handleNavClick}
            />
          ))}
        </NavSection>
      </nav>

      {/* Footer */}
      <div className={`
        border-t border-surface-base py-3
        ${effectiveCollapsed ? 'px-2 text-center' : 'px-4'}
      `}>
        {effectiveCollapsed ? (
          <span className="text-[10px] text-slate-600">v0.1</span>
        ) : (
          <div className="flex items-center justify-between text-xs text-text-theme-muted">
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
        )}
      </div>
    </aside>
    </>
  );
};

export default Sidebar;

// Re-export icons for backward compatibility
export { HamburgerIcon, CloseIcon } from './icons/NavigationIcons';
