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
  valueColor?: 'white' | 'amber' | 'cyan' | 'emerald' | 'red' | 'orange';
}

const valueColorClasses: Record<string, string> = {
  white: 'text-white',
  amber: 'text-amber-400',
  cyan: 'text-cyan-400',
  emerald: 'text-emerald-400',
  red: 'text-red-400',
  orange: 'text-orange-400',
};

export function StatRow({
  label,
  value,
  highlight = false,
  valueColor = 'white',
}: StatRowProps) {
  const valueClasses = highlight
    ? `${valueColorClasses[valueColor]} font-mono bg-slate-700/50 px-3 py-1 rounded`
    : `${valueColorClasses[valueColor]} font-mono`;

  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-400">{label}</span>
      <span className={valueClasses}>{value}</span>
    </div>
  );
}

// Stat list container
interface StatListProps {
  children: React.ReactNode;
  className?: string;
}

export function StatList({ children, className = '' }: StatListProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {children}
    </div>
  );
}

// Stat card (stat with large number)
interface StatCardProps {
  value: React.ReactNode;
  label: string;
  loading?: boolean;
  valueColor?: 'amber' | 'cyan' | 'emerald' | 'violet';
}

const cardValueColors: Record<string, string> = {
  amber: 'text-amber-400',
  cyan: 'text-cyan-400',
  emerald: 'text-emerald-400',
  violet: 'text-violet-400',
};

export function StatCard({
  value,
  label,
  loading = false,
  valueColor = 'amber',
}: StatCardProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 text-center">
      <div className={`text-3xl font-bold mb-1 ${cardValueColors[valueColor]}`}>
        {loading ? (
          <span className="inline-block w-16 h-8 bg-slate-700 rounded animate-pulse" />
        ) : (
          value
        )}
      </div>
      <div className="text-slate-400 text-sm uppercase tracking-wide">{label}</div>
    </div>
  );
}

// Stats grid
interface StatGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatGrid({ children, columns = 2, className = '' }: StatGridProps) {
  const colClasses: Record<number, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${colClasses[columns]} gap-6 ${className}`}>
      {children}
    </div>
  );
}

export default StatRow;

