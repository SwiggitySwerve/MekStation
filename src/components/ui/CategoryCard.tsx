/**
 * CategoryCard Component
 * Navigation card with colored left border accent, inspired by COMP/CON.
 * Used for category navigation grids (e.g., Compendium, Equipment categories).
 */
import React from 'react';
import Link from 'next/link';

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

const accentClasses: Record<AccentColor, {
  border: string;
  borderHover: string;
  icon: string;
  iconBg: string;
}> = {
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
      className={`
        flex items-center gap-4 p-4
        bg-slate-800/40 border border-slate-700/50 border-l-4 ${colors.border}
        rounded-lg transition-all duration-200
        hover:bg-slate-800/60 hover:border-slate-600 ${colors.borderHover}
        cursor-pointer group
      `}
    >
      {/* Icon container */}
      <div className={`p-2.5 rounded-lg ${colors.iconBg} ${colors.icon}`}>
        {icon}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-category-label text-white group-hover:text-amber-50 transition-colors">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>

      {/* Arrow indicator */}
      <div className="text-slate-600 group-hover:text-slate-400 transition-colors">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-4 h-4"
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

