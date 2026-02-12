import React from 'react';

import type { IBattle } from './types';

import { OUTCOME_COLORS, STATUS_COLORS } from './types';

export interface IForcesSectionProps {
  readonly battle: IBattle;
}

export const ForcesSection: React.FC<IForcesSectionProps> = ({ battle }) => {
  return (
    <section aria-label="Forces" data-testid="forces-section">
      <h2
        className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200"
        data-testid="section-heading"
      >
        Forces
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div
          className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          data-testid="player-force"
        >
          <h3 className="mb-2 text-sm font-semibold tracking-wide text-blue-700 uppercase dark:text-blue-300">
            Player Force
          </h3>
          <p
            className="mb-2 text-xs text-gray-500 dark:text-gray-400"
            data-testid="player-bv"
          >
            BV: {battle.forces.player.totalBV.toLocaleString()}
          </p>
          <ul className="space-y-1">
            {battle.forces.player.units.map((unit) => (
              <li
                key={unit.id}
                className="flex items-center justify-between text-sm"
                data-testid={`unit-${unit.id}`}
              >
                <span className="text-gray-800 dark:text-gray-200">
                  {unit.name}
                  <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                    ({unit.pilot})
                  </span>
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[unit.status]}`}
                  data-testid={`unit-status-badge-${unit.id}`}
                >
                  {unit.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div
          className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          data-testid="enemy-force"
        >
          <h3 className="mb-2 text-sm font-semibold tracking-wide text-red-700 uppercase dark:text-red-300">
            Enemy Force
          </h3>
          <p
            className="mb-2 text-xs text-gray-500 dark:text-gray-400"
            data-testid="enemy-bv"
          >
            BV: {battle.forces.enemy.totalBV.toLocaleString()}
          </p>
          <ul className="space-y-1">
            {battle.forces.enemy.units.map((unit) => (
              <li
                key={unit.id}
                className="flex items-center justify-between text-sm"
                data-testid={`unit-${unit.id}`}
              >
                <span className="text-gray-800 dark:text-gray-200">
                  {unit.name}
                  <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                    ({unit.pilot})
                  </span>
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[unit.status]}`}
                  data-testid={`unit-status-badge-${unit.id}`}
                >
                  {unit.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div
        className={`mt-3 rounded-lg p-3 text-center font-semibold ${OUTCOME_COLORS[battle.outcome]}`}
        data-testid="outcome-summary"
      >
        {battle.outcome === 'victory' && '🏆 Victory'}
        {battle.outcome === 'defeat' && '💀 Defeat'}
        {battle.outcome === 'draw' && '🤝 Draw'}
        <span className="ml-3 text-sm font-normal">
          {battle.stats.totalKills} kills · {battle.stats.totalDamage} damage ·{' '}
          {battle.stats.unitsLost} lost
        </span>
      </div>
    </section>
  );
};
