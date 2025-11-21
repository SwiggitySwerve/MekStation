/**
 * Skeleton Loading Components
 * Used to prevent field stutter during hydration
 */

import React from 'react';

// Base skeleton input that matches the size of our actual inputs
export const SkeletonInput: React.FC<{ className?: string; width?: string }> = ({ 
  className = '', 
  width = 'w-full' 
}) => (
  <div 
    className={`${width} px-2 py-1 bg-slate-700/50 border border-slate-600/50 rounded animate-pulse ${className}`}
    style={{ height: '32px' }} // Match actual input height
  >
    <div className="h-4 bg-slate-600/50 rounded mt-1"></div>
  </div>
);

// Skeleton select dropdown
export const SkeletonSelect: React.FC<{ className?: string; width?: string }> = ({ 
  className = '', 
  width = 'w-full' 
}) => (
  <div 
    className={`${width} px-2 py-1 bg-slate-700/50 border border-slate-600/50 rounded animate-pulse ${className}`}
    style={{ height: '32px' }}
  >
    <div className="h-4 bg-slate-600/50 rounded mt-1"></div>
  </div>
);

// Skeleton number input with step controls
export const SkeletonNumberInput: React.FC<{ className?: string; width?: string }> = ({ 
  className = '', 
  width = 'w-24' 
}) => (
  <div className="flex items-center gap-1">
    <div 
      className={`${width} px-2 py-1 bg-slate-700/50 border border-slate-600/50 rounded animate-pulse ${className}`}
      style={{ height: '32px' }}
    >
      <div className="h-4 bg-slate-600/50 rounded mt-1"></div>
    </div>
    <div className="flex flex-col">
      <div className="w-4 h-3 bg-slate-600/50 rounded-t animate-pulse"></div>
      <div className="w-4 h-3 bg-slate-600/50 rounded-b animate-pulse"></div>
    </div>
  </div>
);

// Skeleton text display (for calculated values)
export const SkeletonText: React.FC<{ className?: string; width?: string }> = ({ 
  className = '', 
  width = 'w-16' 
}) => (
  <div 
    className={`${width} px-2 py-1 bg-slate-700/50 border border-slate-600/50 rounded animate-pulse ${className}`}
    style={{ height: '32px' }}
  >
    <div className="h-4 bg-slate-600/50 rounded mt-1"></div>
  </div>
);

// Skeleton button
export const SkeletonButton: React.FC<{ className?: string; width?: string }> = ({ 
  className = '', 
  width = 'w-full' 
}) => (
  <div 
    className={`${width} px-2 py-1 bg-slate-600/50 rounded animate-pulse ${className}`}
    style={{ height: '32px' }}
  >
    <div className="h-4 bg-slate-500/50 rounded mt-1"></div>
  </div>
);

// Compound skeleton for form sections
export const SkeletonFormSection: React.FC<{ 
  title: string; 
  children: React.ReactNode; 
  className?: string 
}> = ({ title, children, className = '' }) => (
  <div className={`bg-slate-800 rounded-lg p-4 border border-slate-700 ${className}`}>
    <h3 className="text-slate-100 font-medium text-sm mb-3">{title}</h3>
    {children}
  </div>
);
