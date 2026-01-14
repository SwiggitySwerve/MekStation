/**
 * Shared Diagram Header Component
 *
 * Provides consistent header styling across all armor diagram variants.
 */

import React from 'react';
import { ArmorDiagramQuickSettings } from '../ArmorDiagramQuickSettings';

export interface DiagramHeaderProps {
  /** Title to display */
  title: string;
  /** Optional subtitle to display */
  subtitle?: string;
  /** Whether to show quick settings dropdown (defaults to true) */
  showQuickSettings?: boolean;
  /** Additional CSS classes for the title */
  titleClassName?: string;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * Standard diagram header with title and optional quick settings
 */
export function DiagramHeader({
  title,
  subtitle,
  showQuickSettings = true,
  titleClassName = '',
  className = '',
}: DiagramHeaderProps): React.ReactElement {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div className="flex items-center gap-2">
        <h3 className={`text-lg font-semibold text-text-theme-primary ${titleClassName}`}>
          {title}
        </h3>
        {subtitle && (
          <span className="text-sm text-text-theme-secondary">({subtitle})</span>
        )}
        {showQuickSettings && <ArmorDiagramQuickSettings />}
      </div>
    </div>
  );
}
