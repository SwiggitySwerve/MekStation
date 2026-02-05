/**
 * Validation Badge Component
 *
 * Displays validation status with appropriate color coding.
 *
 * @spec openspec/specs/color-system/spec.md
 */

import React from 'react';

import {
  ValidationStatus,
  getValidationColors,
} from '@/utils/colors/statusColors';

interface ValidationBadgeProps {
  /** Validation status */
  status: ValidationStatus;
  /** Optional label text */
  label?: string;
  /** Show icon */
  showIcon?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Validation status badge with color coding
 */
export function ValidationBadge({
  status,
  label,
  showIcon = true,
  className = '',
}: ValidationBadgeProps): React.ReactElement {
  const colors = getValidationColors(status);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border} ${className}`}
    >
      {showIcon && <span>{colors.icon}</span>}
      {label && <span>{label}</span>}
    </span>
  );
}
