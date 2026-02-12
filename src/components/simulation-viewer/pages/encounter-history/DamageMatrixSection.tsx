import React, { useMemo } from 'react';

import { FOCUS_RING_CLASSES } from '@/utils/accessibility';

import type { IBattle } from './types';

import { getDamageIntensityClass, resolveUnitName } from './types';

export interface IDamageMatrixSectionProps {
  readonly battle: IBattle;
  readonly onDrillDown: (
    targetTab: string,
    filter?: Record<string, unknown>,
  ) => void;
}

export const DamageMatrixSection: React.FC<IDamageMatrixSectionProps> = ({
  battle,
  onDrillDown,
}) => {
  const maxDamage = useMemo(() => {
    return Math.max(...battle.damageMatrix.cells.map((c) => c.damage), 0);
  }, [battle]);

  return (
    <section aria-label="Damage matrix" data-testid="damage-matrix-section">
      <h2
        className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200"
        data-testid="section-heading"
      >
        Damage Matrix
      </h2>
      {battle.damageMatrix.cells.length === 0 ? (
        <p
          className="text-sm text-gray-500 italic dark:text-gray-400"
          data-testid="empty-damage-matrix"
        >
          No damage exchanges recorded.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table
            className="border-collapse rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
            data-testid="damage-matrix"
          >
            <thead>
              <tr>
                <th className="border border-gray-200 p-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Attacker ↓ / Target →
                </th>
                {battle.damageMatrix.targets.map((targetId) => (
                  <th
                    key={targetId}
                    className="border border-gray-200 p-2 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
                  >
                    {resolveUnitName(battle, targetId)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {battle.damageMatrix.attackers.map((attackerId) => (
                <tr key={attackerId}>
                  <td className="border border-gray-200 p-2 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">
                    {resolveUnitName(battle, attackerId)}
                  </td>
                  {battle.damageMatrix.targets.map((targetId) => {
                    const cell = battle.damageMatrix.cells.find(
                      (c) =>
                        c.attackerId === attackerId && c.targetId === targetId,
                    );
                    const damage = cell?.damage ?? 0;
                    return (
                      <td
                        key={`${attackerId}-${targetId}`}
                        className={`cursor-pointer border border-gray-200 p-2 text-center font-mono text-xs hover:ring-2 hover:ring-blue-400 dark:border-gray-700 ${FOCUS_RING_CLASSES} ${getDamageIntensityClass(damage, maxDamage)}`}
                        title={`${damage} damage`}
                        aria-label={`${resolveUnitName(battle, attackerId)} dealt ${damage} damage to ${resolveUnitName(battle, targetId)}`}
                        onClick={() =>
                          onDrillDown('encounter-history', {
                            attackerId,
                            targetId,
                            battleId: battle.id,
                          })
                        }
                        data-testid={`damage-cell-${attackerId}-${targetId}`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onDrillDown('encounter-history', {
                              attackerId,
                              targetId,
                              battleId: battle.id,
                            });
                          }
                        }}
                      >
                        {damage}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
