/**
 * Badge Component
 * Reusable badge/tag component for displaying status, categories, tech bases, etc.
 */
import React from 'react';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';

type BadgeVariant = 
  // Colors
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
  // Colors
  blue: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  emerald: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
  purple: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  amber: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
  orange: 'bg-orange-600/20 text-orange-400 border-orange-600/30',
  red: 'bg-red-600/20 text-red-400 border-red-600/30',
  cyan: 'bg-cyan-600/20 text-cyan-400 border-cyan-600/30',
  violet: 'bg-violet-600/20 text-violet-400 border-violet-600/30',
  yellow: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  slate: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
  // Semantic aliases  
  muted: 'bg-slate-600/50 text-slate-300 border-slate-500/30',
  warning: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
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
}: BadgeProps) {
  const baseClasses = 'font-medium border inline-flex items-center';
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
export function TechBaseBadge({ techBase }: { techBase: TechBase }) {
  const variant: BadgeVariant = techBase === TechBase.CLAN ? 'emerald' : 'blue';
  const label = techBase === TechBase.CLAN ? 'Clan' : 'Inner Sphere';

  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
  );
}

export function WeightClassBadge({ weightClass }: { weightClass: WeightClass }) {
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

