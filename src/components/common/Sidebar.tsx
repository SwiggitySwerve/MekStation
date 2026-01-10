/**
 * Sidebar Navigation Component
 * COMP/CON-inspired design with amber accents and left border active states.
 */
import React, { ReactElement } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

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
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
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
function NavItem({ href, icon, label, isCollapsed, isActive }: NavItemProps): ReactElement {
  return (
    <Link href={href} legacyBehavior>
      <a
        className={`
          relative flex items-center px-3 py-2.5 mx-2 rounded-lg
          transition-all duration-150 group
          ${isCollapsed ? 'justify-center' : 'gap-3'}
          ${isActive
            ? 'bg-amber-500/15 text-amber-400'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }
        `}
      >
        {/* Active indicator - left border */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r-full" />
        )}
        
        {/* Icon */}
        <span className={`flex-shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-white'}`}>
          {icon}
        </span>
        
        {/* Label */}
        {!isCollapsed && (
          <span className="text-sm font-medium truncate">{label}</span>
        )}
        
        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-sm rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 whitespace-nowrap border border-slate-700">
            {label}
          </div>
        )}
      </a>
    </Link>
  );
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const router = useRouter();
  
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
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
      href: '/equipment',
      icon: <EquipmentIcon />,
      label: 'Equipment',
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
    <aside
      className={`
        bg-slate-900 border-r border-slate-800 text-white
        transition-all duration-300 ease-in-out print:hidden
        ${isCollapsed ? 'w-16' : 'w-56'}
        fixed inset-y-0 left-0 z-30 flex flex-col
      `}
    >
      {/* Header / Brand */}
      <div className={`
        flex items-center h-14 border-b border-slate-800
        ${isCollapsed ? 'justify-center px-2' : 'px-4 gap-3'}
      `}>
        {/* Logo/Icon */}
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center shadow-lg shadow-amber-900/20">
          <MekStationIcon />
        </div>
        
        {/* App name */}
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <span className="text-base font-bold text-white tracking-tight">MekStation</span>
            <span className="block text-[10px] text-slate-500 uppercase tracking-wider">BattleTech Lab</span>
          </div>
        )}
        
        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className={`
            p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50
            transition-colors flex-shrink-0
            ${isCollapsed ? '' : 'ml-auto'}
          `}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
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
            isCollapsed={isCollapsed}
            isActive={isPathActive('/')}
          />
        </div>

        {/* Divider */}
        {!isCollapsed && <div className="mx-4 border-t border-slate-800 mb-4" />}

        {/* Browse Section */}
        <NavSection title="Browse" isCollapsed={isCollapsed}>
          {browseItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              isCollapsed={isCollapsed}
              isActive={isPathActive(item.href)}
            />
          ))}
        </NavSection>

        {/* Divider */}
        {!isCollapsed && <div className="mx-4 border-t border-slate-800 my-4" />}

        {/* Tools Section */}
        <NavSection title="Tools" isCollapsed={isCollapsed}>
          {toolsItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              isCollapsed={isCollapsed}
              isActive={isPathActive(item.href)}
            />
          ))}
        </NavSection>

        {/* Divider */}
        {!isCollapsed && <div className="mx-4 border-t border-slate-800 my-4" />}

        {/* Settings Section */}
        <NavSection isCollapsed={isCollapsed}>
          {settingsItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              isCollapsed={isCollapsed}
              isActive={isPathActive(item.href)}
            />
          ))}
        </NavSection>
      </nav>

      {/* Footer */}
      <div className={`
        border-t border-slate-800 py-3
        ${isCollapsed ? 'px-2 text-center' : 'px-4'}
      `}>
        {isCollapsed ? (
          <span className="text-[10px] text-slate-600">v0.1</span>
        ) : (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>v0.1.0</span>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-amber-400 transition-colors"
            >
              <GithubIcon />
            </a>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;

// ============================================================================
// Icon Components
// ============================================================================

function MekStationIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM8.547 4.505a8.25 8.25 0 1011.672 11.672A8.25 8.25 0 008.547 4.505z" clipRule="evenodd" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function MechIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859" />
    </svg>
  );
}

function EquipmentIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function CustomizerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
    </svg>
  );
}
