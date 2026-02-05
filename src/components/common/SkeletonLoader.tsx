/**
 * Skeleton Loading Components
 * Used to prevent field stutter during hydration
 */

import React from 'react';

// Base skeleton input that matches the size of our actual inputs
export const SkeletonInput: React.FC<{
  className?: string;
  width?: string;
}> = ({ className = '', width = 'w-full' }) => (
  <div
    className={`${width} bg-surface-raised/50 border-border-theme/50 animate-pulse rounded border px-2 py-1 ${className}`}
    style={{ height: '32px' }} // Match actual input height
  >
    <div className="bg-border-theme/50 mt-1 h-4 rounded"></div>
  </div>
);

// Skeleton select dropdown
export const SkeletonSelect: React.FC<{
  className?: string;
  width?: string;
}> = ({ className = '', width = 'w-full' }) => (
  <div
    className={`${width} bg-surface-raised/50 border-border-theme/50 animate-pulse rounded border px-2 py-1 ${className}`}
    style={{ height: '32px' }}
  >
    <div className="bg-border-theme/50 mt-1 h-4 rounded"></div>
  </div>
);

// Skeleton number input with step controls
export const SkeletonNumberInput: React.FC<{
  className?: string;
  width?: string;
}> = ({ className = '', width = 'w-24' }) => (
  <div className="flex items-center gap-1">
    <div
      className={`${width} bg-surface-raised/50 border-border-theme/50 animate-pulse rounded border px-2 py-1 ${className}`}
      style={{ height: '32px' }}
    >
      <div className="bg-border-theme/50 mt-1 h-4 rounded"></div>
    </div>
    <div className="flex flex-col">
      <div className="bg-border-theme/50 h-3 w-4 animate-pulse rounded-t"></div>
      <div className="bg-border-theme/50 h-3 w-4 animate-pulse rounded-b"></div>
    </div>
  </div>
);

// Skeleton text display (for calculated values)
export const SkeletonText: React.FC<{ className?: string; width?: string }> = ({
  className = '',
  width = 'w-16',
}) => (
  <div
    className={`${width} bg-surface-raised/50 border-border-theme/50 animate-pulse rounded border px-2 py-1 ${className}`}
    style={{ height: '32px' }}
  >
    <div className="bg-border-theme/50 mt-1 h-4 rounded"></div>
  </div>
);

// Skeleton button
export const SkeletonButton: React.FC<{
  className?: string;
  width?: string;
}> = ({ className = '', width = 'w-full' }) => (
  <div
    className={`${width} bg-border-theme/50 animate-pulse rounded px-2 py-1 ${className}`}
    style={{ height: '32px' }}
  >
    <div className="bg-border-theme-subtle/50 mt-1 h-4 rounded"></div>
  </div>
);

// Compound skeleton for form sections
export const SkeletonFormSection: React.FC<{
  title: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, children, className = '' }) => (
  <div
    className={`bg-surface-base border-border-theme-subtle rounded-lg border p-4 ${className}`}
  >
    <h3 className="text-text-theme-primary mb-3 text-sm font-medium">
      {title}
    </h3>
    {children}
  </div>
);
