import Link from 'next/link';
/**
 * CategoryCard Component
 * Navigation card with colored left border accent, inspired by COMP/CON.
 * Used for category navigation grids (e.g., Compendium, Equipment categories).
 */
import React from 'react';

export type AccentColor = 'amber' | 'cyan' | 'emerald' | 'rose' | 'violet';

interface CategoryCardProps {
  /** Icon to display on the left */
  icon: React.ReactNode;
  /** Category title (displayed uppercase) */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Navigation destination */
  href: string;
  /** Accent color for left border and icon */
  accentColor: AccentColor;
  /** Optional click handler (for non-navigation use) */
  onClick?: () => void;
}

const accentClasses: Record<
  AccentColor,
  {
    border: string;
    borderHover: string;
    icon: string;
    iconBg: string;
  }
> = {
  amber: {
    border: 'border-l-amber-500/60',
    borderHover: 'hover:border-l-amber-400',
    icon: 'text-amber-400',
    iconBg: 'bg-amber-500/20',
  },
  cyan: {
    border: 'border-l-cyan-500/60',
    borderHover: 'hover:border-l-cyan-400',
    icon: 'text-cyan-400',
    iconBg: 'bg-cyan-500/20',
  },
  emerald: {
    border: 'border-l-emerald-500/60',
    borderHover: 'hover:border-l-emerald-400',
    icon: 'text-emerald-400',
    iconBg: 'bg-emerald-500/20',
  },
  rose: {
    border: 'border-l-rose-500/60',
    borderHover: 'hover:border-l-rose-400',
    icon: 'text-rose-400',
    iconBg: 'bg-rose-500/20',
  },
  violet: {
    border: 'border-l-violet-500/60',
    borderHover: 'hover:border-l-violet-400',
    icon: 'text-violet-400',
    iconBg: 'bg-violet-500/20',
  },
};

export function CategoryCard({
  icon,
  title,
  subtitle,
  href,
  accentColor,
  onClick,
}: CategoryCardProps): React.ReactElement {
  const colors = accentClasses[accentColor];

  const cardContent = (
    <div
      className={`bg-surface-base/40 border-border-theme-subtle/50 flex items-center gap-4 border border-l-4 p-4 ${colors.border} hover:bg-surface-base/60 hover:border-border-theme rounded-lg transition-all duration-200 ${colors.borderHover} group cursor-pointer`}
    >
      {/* Icon container */}
      <div className={`rounded-lg p-2.5 ${colors.iconBg} ${colors.icon}`}>
        {icon}
      </div>

      {/* Text content */}
      <div className="min-w-0 flex-1">
        <h3 className="text-category-label text-text-theme-primary transition-colors group-hover:text-amber-50">
          {title}
        </h3>
        {subtitle && (
          <p className="text-text-theme-secondary mt-0.5 truncate text-xs">
            {subtitle}
          </p>
        )}
      </div>

      {/* Arrow indicator */}
      <div className="text-border-theme group-hover:text-text-theme-secondary transition-colors">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 4.5l7.5 7.5-7.5 7.5"
          />
        </svg>
      </div>
    </div>
  );

  // If onClick is provided, render as button; otherwise render as Link
  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left">
        {cardContent}
      </button>
    );
  }

  return (
    <Link href={href} className="block">
      {cardContent}
    </Link>
  );
}

export default CategoryCard;
