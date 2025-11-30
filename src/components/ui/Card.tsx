/**
 * Card Component
 * Reusable card container with multiple variants.
 */
import React from 'react';

type CardVariant = 'default' | 'dark' | 'header' | 'interactive' | 'gradient';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  className?: string;
  onClick?: () => void;
  as?: 'div' | 'section' | 'article';
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-slate-800/50 border border-slate-700 rounded-xl p-6',
  dark: 'bg-slate-800/30 border border-slate-700 rounded-xl p-6',
  header: 'bg-slate-800/50 border border-slate-700 rounded-xl p-6',
  interactive: 'bg-slate-800/30 border border-slate-700 rounded-xl p-4 hover:border-slate-600 hover:bg-slate-800/50 transition-all cursor-pointer',
  gradient: 'bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6 transition-all duration-300 hover:border-slate-600 hover:bg-slate-800/60 hover:shadow-xl hover:shadow-amber-900/10',
};

export function Card({
  children,
  variant = 'default',
  className = '',
  onClick,
  as: Component = 'div',
}: CardProps) {
  return (
    <Component
      className={`${variantClasses[variant]} ${className}`}
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
}: CardSectionProps) {
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

