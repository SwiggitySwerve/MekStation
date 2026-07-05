import { useState } from 'react';

import type { IKeyMoment } from '@/types/simulation-viewer/IKeyMoment';

import { Card } from '@/components/ui';

export function KeyMomentsCard({
  keyMoments,
  emptyStateDetail,
}: {
  readonly keyMoments: readonly IKeyMoment[];
  readonly emptyStateDetail?: string;
}): React.ReactElement {
  const [showLowerTiers, setShowLowerTiers] = useState(false);
  const tier1Moments = keyMoments.filter((moment) => moment.tier === 1);
  const tier2Moments = keyMoments.filter((moment) => moment.tier === 2);
  const tier3Moments = keyMoments.filter((moment) => moment.tier === 3);
  const initialMoments =
    tier1Moments.length > 0 ? tier1Moments : keyMoments.slice(0, 2);
  const initialMomentIds = new Set(initialMoments.map((moment) => moment.id));
  const hiddenMoments = [...tier2Moments, ...tier3Moments].filter(
    (moment) => !initialMomentIds.has(moment.id),
  );

  return (
    <Card>
      <div className="border-b border-gray-700 p-4">
        <h3 className="font-medium text-white">Key Moments</h3>
      </div>
      <div className="space-y-2 p-4">
        {keyMoments.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-400">No key moments recorded.</p>
            {emptyStateDetail ? (
              <div className="rounded-lg border border-gray-700/50 bg-gray-800/30 p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-gray-700 px-1.5 py-0.5 text-xs font-bold text-gray-300">
                    End
                  </span>
                  <span className="text-xs text-gray-400">Outcome event</span>
                </div>
                <p className="mt-1 text-sm text-gray-300">{emptyStateDetail}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            {initialMoments.map((moment) => (
              <KeyMomentRow key={moment.id} moment={moment} />
            ))}
            {hiddenMoments.length > 0 && (
              <>
                {showLowerTiers ? (
                  hiddenMoments.map((moment) => (
                    <KeyMomentRow key={moment.id} moment={moment} />
                  ))
                ) : (
                  <button
                    onClick={() => setShowLowerTiers(true)}
                    className="text-xs text-gray-400 underline hover:text-gray-300"
                  >
                    Show {hiddenMoments.length} more moments
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

function KeyMomentRow({
  moment,
}: {
  readonly moment: IKeyMoment;
}): React.ReactElement {
  const tierStyles = {
    1: {
      container: 'border-amber-700/40 bg-amber-900/20',
      badge: 'bg-amber-600 text-white font-bold',
      text: 'text-white',
    },
    2: {
      container: 'border-gray-700/50 bg-gray-800/30',
      badge: 'bg-gray-600 text-white font-bold',
      text: 'text-gray-300',
    },
    3: {
      container: 'border-gray-700/30 bg-gray-800/20',
      badge: 'bg-gray-700 text-gray-300',
      text: 'text-gray-400',
    },
  }[moment.tier];

  return (
    <div className={`rounded-lg border p-3 ${tierStyles.container}`}>
      <div className="flex items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-xs ${tierStyles.badge}`}>
          T{moment.tier}
        </span>
        <span className="text-xs text-gray-400">Turn {moment.turn}</span>
      </div>
      <p className={`mt-1 text-sm ${tierStyles.text}`}>{moment.description}</p>
    </div>
  );
}
