import React, { memo } from 'react';
import { PartQuality, getQualityColor, getQualityDisplayName } from '@/types/campaign/quality';

interface QualityBadgeProps {
  quality: PartQuality;
  showLabel?: boolean;
  className?: string;
}

export const QualityBadge = memo(function QualityBadge({
  quality,
  showLabel = false,
  className = '',
}: QualityBadgeProps) {
  const color = getQualityColor(quality);
  const displayName = getQualityDisplayName(quality);

  return (
    <span
      data-testid="quality-badge"
      className={`inline-flex items-center justify-center rounded font-mono font-semibold text-xs leading-none ${className}`}
      style={{
        color,
        backgroundColor: `${color}1a`,
        border: `1px solid ${color}40`,
        padding: showLabel ? '2px 6px' : '2px 5px',
      }}
      title={displayName}
      aria-label={`Quality: ${displayName}`}
    >
      {showLabel ? displayName : quality}
    </span>
  );
});
