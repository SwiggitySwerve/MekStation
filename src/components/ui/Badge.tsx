/**
 * Badge Component
 * Reusable badge/tag component for displaying status, categories, tech bases, etc.
 */
import React from 'react';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';

type BadgeVariant = 
  // Base colors
  | 'blue' 
  | 'emerald' 
  | 'purple' 
  | 'amber' 
  | 'orange' 
  | 'red' 
  | 'cyan' 
  | 'violet' 
  | 'yellow' 
  | 'slate'
  // Extended colors for weapon differentiation
  | 'rose'      // Energy weapons
  | 'sky'       // Missile weapons  
  | 'fuchsia'   // Capital weapons
  | 'teal'      // Alternative to cyan
  | 'lime'      // Alternative green
  | 'pink'      // Light rose for ammo
  // Light variants for ammunition (softer versions)
  | 'orange-light'  // Ballistic ammo
  | 'sky-light'     // Missile ammo
  | 'violet-light'  // Artillery ammo
  | 'rose-light'    // Energy-related ammo
  // Semantic aliases
  | 'muted'
  | 'warning'
  | 'success'
  | 'info';

type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  pill?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  // Base colors
  blue: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  emerald: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
  purple: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  amber: 'bg-accent/20 text-accent border-accent/30',
  orange: 'bg-orange-600/20 text-orange-400 border-orange-600/30',
  red: 'bg-red-600/20 text-red-400 border-red-600/30',
  cyan: 'bg-cyan-600/20 text-cyan-400 border-cyan-600/30',
  violet: 'bg-violet-600/20 text-violet-400 border-violet-600/30',
  yellow: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  slate: 'bg-surface-raised/20 text-text-theme-secondary border-border-theme-subtle/30',
  // Extended colors for weapon differentiation
  rose: 'bg-rose-600/20 text-rose-400 border-rose-600/30',
  sky: 'bg-sky-600/20 text-sky-400 border-sky-600/30',
  fuchsia: 'bg-fuchsia-600/20 text-fuchsia-400 border-fuchsia-600/30',
  teal: 'bg-teal-600/20 text-teal-400 border-teal-600/30',
  lime: 'bg-lime-600/20 text-lime-400 border-lime-600/30',
  pink: 'bg-pink-600/20 text-pink-400 border-pink-600/30',
  // Light variants for ammunition (higher opacity, softer look)
  'orange-light': 'bg-orange-500/10 text-orange-300 border-orange-400/20',
  'sky-light': 'bg-sky-500/10 text-sky-300 border-sky-400/20',
  'violet-light': 'bg-violet-500/10 text-violet-300 border-violet-400/20',
  'rose-light': 'bg-rose-500/10 text-rose-300 border-rose-400/20',
  // Semantic aliases
  muted: 'bg-surface-raised/50 text-text-theme-muted border-border-theme-subtle/30',
  warning: 'bg-accent/20 text-accent border-accent/30',
  success: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
  info: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2 py-1 text-xs',
  lg: 'px-3 py-1 text-sm',
};

export function Badge({
  children,
  variant = 'slate',
  size = 'md',
  pill = false,
  className = '',
}: BadgeProps): React.ReactElement {
  const baseClasses = 'font-medium border inline-flex items-center whitespace-nowrap';
  const shapeClasses = pill ? 'rounded-full' : 'rounded';

  return (
    <span
      className={`${baseClasses} ${shapeClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// Convenience exports for common badge types
export function TechBaseBadge({ techBase }: { techBase: TechBase }): React.ReactElement {
  const variant: BadgeVariant = techBase === TechBase.CLAN ? 'emerald' : 'blue';
  const label = techBase === TechBase.CLAN ? 'Clan' : 'IS';

  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
  );
}

export function WeightClassBadge({ weightClass }: { weightClass: WeightClass }): React.ReactElement {
  const getVariant = (): BadgeVariant => {
    switch (weightClass) {
      case WeightClass.LIGHT: return 'emerald';
      case WeightClass.MEDIUM: return 'amber';
      case WeightClass.HEAVY: return 'orange';
      case WeightClass.ASSAULT: return 'red';
      default: return 'slate';
    }
  };

  const getLabel = (): string => {
    switch (weightClass) {
      case WeightClass.LIGHT: return 'Light';
      case WeightClass.MEDIUM: return 'Medium';
      case WeightClass.HEAVY: return 'Heavy';
      case WeightClass.ASSAULT: return 'Assault';
      default: return String(weightClass);
    }
  };

  return (
    <Badge variant={getVariant()} size="md">
      {getLabel()}
    </Badge>
  );
}

export default Badge;

