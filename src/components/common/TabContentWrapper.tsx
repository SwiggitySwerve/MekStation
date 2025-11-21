/**
 * TabContentWrapper - Minimal wrapper for consistent tab scrolling
 * 
 * Provides the working calc(100vh - 140px) pattern in a reusable component.
 * This is a thin wrapper around the proven scrolling solution.
 */

import React from 'react';
import { TAB_CONTENT_HEIGHT, SCROLLBAR_CLASSES } from '../../utils/layout/constants';

interface TabContentWrapperProps {
  /** Content to be rendered inside the scrollable container */
  children: React.ReactNode;
  
  /** Additional CSS classes to apply */
  className?: string;
}

/**
 * Minimal tab content wrapper that applies the working scrolling pattern.
 * Uses the proven calc(100vh - 140px) approach for consistent behavior.
 */
export const TabContentWrapper: React.FC<TabContentWrapperProps> = ({
  children,
  className = ''
}) => {
  return (
    <div 
      className={`bg-slate-900 overflow-auto ${SCROLLBAR_CLASSES} ${className}`}
      style={{ height: TAB_CONTENT_HEIGHT }}
    >
      {children}
    </div>
  );
};

export default TabContentWrapper;
