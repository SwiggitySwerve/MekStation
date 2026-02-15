import Link from 'next/link';
import React, { ReactElement, useRef, useEffect } from 'react';

import { ChevronDownIcon } from './icons/NavigationIcons';

export interface NavItemConfig {
  href: string;
  icon: ReactElement;
  label: string;
}

export interface DropdownProps {
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

export function useClickOutside(
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

export function DropdownMenu({
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

      {iconOnly && !isOpen && (
        <div className="bg-surface-raised text-text-theme-primary border-border-theme-subtle pointer-events-none invisible absolute top-full left-1/2 z-40 mt-2 -translate-x-1/2 rounded border px-2 py-1 text-xs whitespace-nowrap opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
          {label}
        </div>
      )}

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

export function NavLink({
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
        {iconOnly && (
          <div className="bg-surface-raised text-text-theme-primary border-border-theme-subtle invisible absolute top-full z-50 mt-2 rounded border px-2 py-1 text-xs whitespace-nowrap opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
            {label}
          </div>
        )}
      </a>
    </Link>
  );
}
