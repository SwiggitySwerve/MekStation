import type { ReactElement } from 'react';

import type { IForceStats } from '@/types/force';

/** Both force views label partial subtotals and preserve missing identities. */
export function ForceStatsCompleteness({
  stats,
}: {
  stats: IForceStats;
}): ReactElement | null {
  if (stats.complete !== false) return null;
  return (
    <div
      role="status"
      className="text-text-theme-secondary mt-2 min-w-0 text-sm break-words"
    >
      <p className="font-semibold">Incomplete Totals</p>
      <ul>
        {stats.missingUnits?.map(({ family, id }, index) => (
          <li key={`${family}:${id}:${index}`}>
            Unit not found: ({family}, {id})
          </li>
        ))}
      </ul>
    </div>
  );
}
