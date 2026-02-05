/**
 * Tech Base Badge Component
 *
 * Displays tech base mode with appropriate color coding.
 * Supports IS, Clan, and Mixed tech display.
 *
 * @spec openspec/specs/color-system/spec.md
 */

import React from 'react';

import {
  TechBaseMode,
  TECH_BASE_MODE_LABELS,
} from '@/types/construction/TechBaseConfiguration';
import {
  getTechBaseModeColors,
  getTechBaseModeShortName,
} from '@/utils/colors/techBaseColors';

interface TechBaseBadgeProps {
  /** Tech base mode to display (IS/Clan/Mixed) */
  techBaseMode: TechBaseMode;
  /** Use short name (IS/Clan/Mixed) instead of full name */
  short?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Tech base badge with color coding
 */
export function TechBaseBadge({
  techBaseMode,
  short = true,
  className = '',
}: TechBaseBadgeProps): React.ReactElement {
  const colors = getTechBaseModeColors(techBaseMode);
  const badgeClass = `${colors.badge} px-2 py-0.5 rounded text-xs font-medium`;
  const displayText = short
    ? getTechBaseModeShortName(techBaseMode)
    : TECH_BASE_MODE_LABELS[techBaseMode];

  return <span className={`${badgeClass} ${className}`}>{displayText}</span>;
}
