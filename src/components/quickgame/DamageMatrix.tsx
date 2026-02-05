/**
 * Damage Matrix Component
 * Displays a grid showing unit-to-unit damage totals from combat events.
 * Rows represent attackers, columns represent targets.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { useMemo } from 'react';

import type { IGameEvent } from '@/types/gameplay';
import type { IQuickGameUnit } from '@/types/quickgame/QuickGameInterfaces';

import { projectDamageMatrix } from '@/utils/gameplay/combatStatistics';

export interface DamageMatrixProps {
  readonly events: readonly IGameEvent[];
  readonly units: readonly IQuickGameUnit[];
}

function getUnitName(
  unitId: string,
  unitMap: ReadonlyMap<string, IQuickGameUnit>,
): string {
  const unit = unitMap.get(unitId);
  return unit?.name ?? unitId;
}

function truncateName(name: string, maxLength: number = 14): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength - 1) + '…';
}

export function DamageMatrix({
  events,
  units,
}: DamageMatrixProps): React.ReactElement {
  const unitMap = useMemo(() => {
    const map = new Map<string, IQuickGameUnit>();
    for (const unit of units) {
      map.set(unit.instanceId, unit);
    }
    return map;
  }, [units]);

  const { matrix, totalDealt, totalReceived } = useMemo(
    () => projectDamageMatrix(events),
    [events],
  );

  const attackerIds = useMemo(() => Array.from(matrix.keys()), [matrix]);
  const targetIds = useMemo(() => {
    const targets = new Set<string>();
    for (const targetMap of Array.from(matrix.values())) {
      for (const targetId of Array.from(targetMap.keys())) {
        targets.add(targetId);
      }
    }
    return Array.from(targets);
  }, [matrix]);

  const grandTotal = useMemo(() => {
    let total = 0;
    for (const dealt of Array.from(totalDealt.values())) {
      total += dealt;
    }
    return total;
  }, [totalDealt]);

  if (matrix.size === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        <svg
          className="mx-auto mb-3 h-12 w-12 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-lg font-medium">No damage dealt</p>
        <p className="mt-1 text-sm text-gray-600">
          No combat damage was recorded in this battle.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" data-testid="damage-matrix">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border border-gray-700 bg-gray-800 p-2 text-left font-semibold text-gray-300">
              Attacker ↓ / Target →
            </th>
            {targetIds.map((targetId) => (
              <th
                key={targetId}
                className="min-w-[80px] border border-gray-700 bg-gray-800 p-2 text-center font-semibold text-gray-300"
                title={getUnitName(targetId, unitMap)}
              >
                {truncateName(getUnitName(targetId, unitMap))}
              </th>
            ))}
            <th className="min-w-[80px] border border-gray-700 bg-gray-900 p-2 text-center font-bold text-amber-400">
              Total Dealt
            </th>
          </tr>
        </thead>
        <tbody>
          {attackerIds.map((attackerId) => {
            const attackerTargets = matrix.get(attackerId);
            const attackerDealt = totalDealt.get(attackerId) ?? 0;

            return (
              <tr key={attackerId}>
                <th
                  className="sticky left-0 z-10 border border-gray-700 bg-gray-800 p-2 text-left font-semibold text-gray-300"
                  title={getUnitName(attackerId, unitMap)}
                >
                  {truncateName(getUnitName(attackerId, unitMap))}
                </th>
                {targetIds.map((targetId) => {
                  const damage = attackerTargets?.get(targetId) ?? 0;
                  const isSelfDamage = attackerId === targetId;

                  return (
                    <td
                      key={targetId}
                      className={`border border-gray-700 p-2 text-center font-mono ${
                        isSelfDamage
                          ? 'bg-gray-700 text-gray-400'
                          : damage > 0
                            ? 'bg-gray-800/50 text-white'
                            : 'bg-gray-800/30 text-gray-600'
                      }`}
                      data-testid={
                        isSelfDamage ? 'self-damage-cell' : undefined
                      }
                    >
                      {damage > 0 ? damage : '—'}
                    </td>
                  );
                })}
                <td className="border border-gray-700 bg-gray-900 p-2 text-center font-mono font-bold text-amber-400">
                  {attackerDealt}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th className="sticky left-0 z-10 border border-gray-700 bg-gray-900 p-2 text-left font-bold text-cyan-400">
              Total Received
            </th>
            {targetIds.map((targetId) => {
              const received = totalReceived.get(targetId) ?? 0;
              return (
                <td
                  key={targetId}
                  className="border border-gray-700 bg-gray-900 p-2 text-center font-mono font-bold text-cyan-400"
                >
                  {received}
                </td>
              );
            })}
            <td className="border border-gray-700 bg-gray-950 p-2 text-center font-mono font-bold text-white">
              {grandTotal}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default DamageMatrix;
