/**
 * Armor Legend Component
 * 
 * Color legend for the armor diagram.
 * 
 * @spec openspec/specs/armor-diagram/spec.md
 */

import React from 'react';

interface ArmorLegendProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Legend for armor diagram colors
 */
export function ArmorLegend({ className = '' }: ArmorLegendProps): React.ReactElement {
  const items = [
    { color: 'bg-green-600', label: 'Head' },
    { color: 'bg-amber-600', label: 'Torso/Limbs' },
    { color: 'bg-amber-800', label: 'Rear Armor' },
    { color: 'bg-blue-600', label: 'Selected' },
  ];
  
  return (
    <div className={`flex flex-wrap justify-center gap-4 ${className}`}>
      {items.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded ${color}`} />
          <span className="text-xs text-text-theme-secondary">{label}</span>
        </div>
      ))}
    </div>
  );
}

