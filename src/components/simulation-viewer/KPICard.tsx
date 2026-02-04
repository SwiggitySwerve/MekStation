import React from 'react';
import type { IKPICardProps } from '@/components/simulation-viewer/types';

const Sparkline = ({
  data,
  color,
  height,
}: {
  data: number[];
  color: string;
  height: number;
}) => {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      className="w-full"
      role="img"
      aria-label="Trend sparkline"
      data-testid="sparkline"
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
};

const DIRECTION_CONFIG = {
  up: {
    color: 'text-green-600',
    strokeColor: '#16a34a',
    arrow: '↑',
  },
  down: {
    color: 'text-red-600',
    strokeColor: '#dc2626',
    arrow: '↓',
  },
  neutral: {
    color: 'text-gray-600',
    strokeColor: '#4b5563',
    arrow: '→',
  },
} as const;

export const KPICard: React.FC<IKPICardProps> = ({
  label,
  value,
  comparison,
  comparisonDirection = 'neutral',
  trend,
  onClick,
  className = '',
}) => {
  const isClickable = typeof onClick === 'function';
  const dirConfig = DIRECTION_CONFIG[comparisonDirection];

  const cardClasses = [
    'bg-white dark:bg-gray-800',
    'rounded-lg',
    'shadow-md hover:shadow-lg',
    'transition-shadow duration-200',
    'p-4 md:p-6',
    isClickable ? 'cursor-pointer' : 'cursor-default',
    isClickable
      ? 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
      : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      className={cardClasses}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      data-testid="kpi-card"
    >
      <p
        className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide"
        data-testid="kpi-label"
      >
        {label}
      </p>

      <p
        className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1"
        data-testid="kpi-value"
      >
        {value}
      </p>

      {comparison && (
        <p
          className={`text-sm ${dirConfig.color} mt-1`}
          data-testid="kpi-comparison"
        >
          <span aria-hidden="true">{dirConfig.arrow}</span> {comparison}
        </p>
      )}

      {trend && trend.length > 0 && (
        <div className="mt-2 h-8 md:h-10" data-testid="kpi-trend">
          <Sparkline
            data={trend}
            color={dirConfig.strokeColor}
            height={40}
          />
        </div>
      )}
    </div>
  );
};
