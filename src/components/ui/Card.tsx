/**
 * Card Component
 * Reusable card container with multiple variants.
 */
import React from 'react';

type CardVariant = 
  | 'default' 
  | 'dark' 
  | 'header' 
  | 'interactive' 
  | 'gradient'
  | 'accent-left'    // 4px colored left border
  | 'accent-bottom'; // Full-width colored bottom bar

export type CardAccentColor = 'amber' | 'cyan' | 'emerald' | 'rose' | 'violet';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  className?: string;
  onClick?: () => void;
  as?: 'div' | 'section' | 'article';
  /** Accent color for accent-left and accent-bottom variants */
  accentColor?: CardAccentColor;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-slate-800/50 border border-slate-700 rounded-xl p-6',
  dark: 'bg-slate-800/30 border border-slate-700 rounded-xl p-6',
  header: 'bg-slate-800/50 border border-slate-700 rounded-xl p-6',
  interactive: 'bg-slate-800/30 border border-slate-700 rounded-xl p-4 hover:border-slate-600 hover:bg-slate-800/50 transition-all cursor-pointer',
  gradient: 'bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6 transition-all duration-300 hover:border-slate-600 hover:bg-slate-800/60 hover:shadow-xl hover:shadow-amber-900/10',
  'accent-left': 'bg-slate-800/40 border border-slate-700/50 border-l-4 rounded-lg p-4 transition-all hover:bg-slate-800/60',
  'accent-bottom': 'bg-slate-300 rounded-lg overflow-hidden transition-all hover:shadow-lg',
};

// Accent color classes for left border variant
const accentLeftClasses: Record<CardAccentColor, string> = {
  amber: 'border-l-amber-500/70 hover:border-l-amber-400',
  cyan: 'border-l-cyan-500/70 hover:border-l-cyan-400',
  emerald: 'border-l-emerald-500/70 hover:border-l-emerald-400',
  rose: 'border-l-rose-500/70 hover:border-l-rose-400',
  violet: 'border-l-violet-500/70 hover:border-l-violet-400',
};

// Accent color classes for bottom bar variant (COMP/CON grid card style)
const accentBottomClasses: Record<CardAccentColor, string> = {
  amber: 'bg-amber-700',
  cyan: 'bg-cyan-700',
  emerald: 'bg-emerald-700',
  rose: 'bg-rose-700',
  violet: 'bg-violet-700',
};

export function Card({
  children,
  variant = 'default',
  className = '',
  onClick,
  as: Component = 'div',
  accentColor = 'amber',
}: CardProps): React.ReactElement {
  // Build classes based on variant
  let classes = variantClasses[variant];
  
  // Add accent color classes for accent variants
  if (variant === 'accent-left') {
    classes = `${classes} ${accentLeftClasses[accentColor]}`;
  }

  // For accent-bottom, we wrap children with the bottom bar
  if (variant === 'accent-bottom') {
    return (
      <Component
        className={`${classes} ${className}`}
        onClick={onClick}
      >
        <div className="p-4">
          {children}
        </div>
        <div className={`h-8 ${accentBottomClasses[accentColor]} flex items-center px-3`}>
          {/* Bottom bar content area - can be used for category labels */}
        </div>
      </Component>
    );
  }

  return (
    <Component
      className={`${classes} ${className}`}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}

// Card section title - can be used standalone or with children
interface CardSectionProps {
  children?: React.ReactNode;
  title: string;
  titleColor?: 'white' | 'amber' | 'cyan' | 'rose' | 'emerald' | 'violet';
  icon?: React.ReactNode;
  className?: string;
  /** If true, renders as a standalone card. Otherwise just renders title + children inline */
  asCard?: boolean;
}

const titleColorClasses: Record<string, string> = {
  white: 'text-white',
  amber: 'text-amber-400',
  cyan: 'text-cyan-400',
  rose: 'text-rose-400',
  emerald: 'text-emerald-400',
  violet: 'text-violet-400',
};

export function CardSection({
  children,
  title,
  titleColor = 'white',
  icon,
  className = '',
  asCard = false,
}: CardSectionProps): React.ReactElement {
  const content = (
    <>
      <h3 className={`text-lg font-semibold ${children ? 'mb-4' : ''} flex items-center gap-2 ${titleColorClasses[titleColor]}`}>
        {icon}
        {title}
      </h3>
      {children}
    </>
  );

  if (asCard) {
    return <Card className={className}>{content}</Card>;
  }

  return <div className={className}>{content}</div>;
}

export default Card;

