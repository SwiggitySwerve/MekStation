/**
 * StatDisplay Component
 * Reusable components for displaying key-value statistics.
 */
import React from 'react';

// Single stat row
interface StatRowProps {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  mono?: boolean;
  valueColor?: 'white' | 'amber' | 'cyan' | 'emerald' | 'red' | 'orange';
}

const valueColorClasses: Record<string, string> = {
  white: 'text-text-theme-primary',
  amber: 'text-accent',
  cyan: 'text-cyan-400',
  emerald: 'text-emerald-400',
  red: 'text-red-400',
  orange: 'text-orange-400',
};

export function StatRow({
  label,
  value,
  highlight = false,
  mono = true,
  valueColor = 'white',
}: StatRowProps): React.ReactElement {
  const valueClasses = highlight
    ? `${valueColorClasses[valueColor === 'white' ? 'emerald' : valueColor]} ${mono ? 'font-mono' : ''}`
    : `${valueColorClasses[valueColor]} ${mono ? 'font-mono' : ''}`;

  return (
    <div className="flex items-center justify-between">
      <span className="text-text-theme-secondary">{label}</span>
      <span className={valueClasses}>{value}</span>
    </div>
  );
}

// Stat list container
interface StatListProps {
  children: React.ReactNode;
  className?: string;
}

export function StatList({
  children,
  className = '',
}: StatListProps): React.ReactElement {
  return <div className={`space-y-2 ${className}`}>{children}</div>;
}

// Section stat card (with title, icon, and children)
interface StatCardProps {
  title: string;
  icon?: React.ReactNode;
  variant?: 'amber' | 'cyan' | 'emerald' | 'violet' | 'rose';
  children: React.ReactNode;
  className?: string;
}

const titleVariantColors: Record<string, string> = {
  amber: 'text-amber-400',
  cyan: 'text-cyan-400',
  emerald: 'text-emerald-400',
  violet: 'text-violet-400',
  rose: 'text-rose-400',
};

export function StatCard({
  title,
  icon,
  variant = 'amber',
  children,
  className = '',
}: StatCardProps): React.ReactElement {
  return (
    <div
      className={`bg-surface-base/30 border-border-theme-subtle rounded-xl border p-6 ${className}`}
    >
      <h3
        className={`mb-4 flex items-center gap-2 text-lg font-semibold ${titleVariantColors[variant]}`}
      >
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

// Stats grid
interface StatGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}

export function StatGrid({
  children,
  cols = 2,
  className = '',
}: StatGridProps): React.ReactElement {
  const colClasses: Record<number, string> = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${colClasses[cols]} gap-6 ${className}`}>
      {children}
    </div>
  );
}

// Simple stat display card (for home page stats)
interface SimpleStatCardProps {
  value: React.ReactNode;
  label: string;
  loading?: boolean;
  valueColor?: 'amber' | 'cyan' | 'emerald' | 'violet';
}

const simpleCardValueColors: Record<string, string> = {
  amber: 'text-accent',
  cyan: 'text-cyan-400',
  emerald: 'text-emerald-400',
  violet: 'text-violet-400',
};

export function SimpleStatCard({
  value,
  label,
  loading = false,
  valueColor = 'amber',
}: SimpleStatCardProps): React.ReactElement {
  return (
    <div className="bg-surface-base/50 border-border-theme-subtle rounded-xl border p-6 text-center backdrop-blur">
      <div
        className={`mb-1 text-3xl font-bold ${simpleCardValueColors[valueColor]}`}
      >
        {loading ? (
          <span className="bg-surface-raised inline-block h-8 w-16 animate-pulse rounded" />
        ) : (
          value
        )}
      </div>
      <div className="text-text-theme-secondary text-sm tracking-wide uppercase">
        {label}
      </div>
    </div>
  );
}

export default StatRow;
