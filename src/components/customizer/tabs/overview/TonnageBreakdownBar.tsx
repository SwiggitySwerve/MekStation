import React from 'react';

import { STAT_STATUS_TEXT_CLASS } from '@/components/customizer/shared/unitStatStatus';
import { formatTons } from '@/utils/formatting';

import { type TonnageBreakdown } from './tonnageBreakdown';

interface TonnageBreakdownBarProps {
  readonly breakdown: TonnageBreakdown;
}

/** Red diagonal hatch for the tonnage past the limit (bar segment and legend key). */
const OVER_LIMIT_HATCH: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(135deg, #f87171 0 3px, #7f1d1d 3px 6px)',
};

/**
 * Stacked bar of where the unit's tonnage goes, with a legend that labels
 * every segment with its weight. Overweight units scale the bar to the used
 * weight; the tons past the limit are overlaid as a red hatched segment whose
 * left edge is the limit marker.
 */
export function TonnageBreakdownBar({
  breakdown,
}: TonnageBreakdownBarProps): React.ReactElement {
  const { segments, used, max, free, over } = breakdown;
  const scale = Math.max(used, max);
  const width = (tons: number) =>
    scale > 0 ? `${(tons / scale) * 100}%` : '0%';
  const remainderLabel = over > 0 ? 'Over Limit' : 'Free';
  const remainderTons = over > 0 ? over : free;
  const description = [
    ...segments.map(
      (segment) => `${segment.label} ${formatTons(segment.tons)}`,
    ),
    `${remainderLabel} ${formatTons(remainderTons)}`,
  ].join(', ');

  return (
    <div data-testid="overview-tonnage-breakdown">
      <div
        role="img"
        aria-label={`Tonnage breakdown: ${description}`}
        className="bg-surface-deep ring-border-theme relative flex h-4 w-full overflow-hidden rounded ring-1 ring-inset"
      >
        {segments.map((segment) => (
          <span
            key={segment.id}
            className={`${segment.colorClass} border-surface-base h-full shrink-0 border-r last:border-r-0`}
            style={{ width: width(segment.tons) }}
          />
        ))}
        {over > 0 && (
          <span
            aria-hidden="true"
            data-testid="overview-tonnage-over"
            className="absolute inset-y-0 right-0 border-l-2 border-red-100"
            style={{
              ...OVER_LIMIT_HATCH,
              width: `max(${width(over)}, 6px)`,
            }}
          />
        )}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm @md:grid-cols-3">
        {segments.map((segment) => (
          <li key={segment.id} className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className={`${segment.colorClass} h-2.5 w-2.5 shrink-0 rounded-sm`}
            />
            <span className="text-text-theme-secondary min-w-0 truncate">
              {segment.label}
            </span>
            <span className="text-text-theme-primary ml-auto font-medium tabular-nums">
              {formatTons(segment.tons)}
            </span>
          </li>
        ))}
        <li className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 shrink-0 rounded-sm ${
              over > 0 ? '' : 'border-border-theme border'
            }`}
            style={over > 0 ? OVER_LIMIT_HATCH : undefined}
          />
          <span className="text-text-theme-secondary min-w-0 truncate">
            {remainderLabel}
          </span>
          <span
            className={`ml-auto font-medium tabular-nums ${
              STAT_STATUS_TEXT_CLASS[over > 0 ? 'error' : 'normal']
            }`}
          >
            {formatTons(remainderTons)}
          </span>
        </li>
      </ul>
    </div>
  );
}
