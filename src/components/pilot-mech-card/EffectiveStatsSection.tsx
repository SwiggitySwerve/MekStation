/**
 * Effective Stats Section Component
 *
 * Displays calculated combat effectiveness including:
 * - Base To-Hit calculation
 * - Consciousness roll target
 * - Any ability modifiers
 *
 * @spec Phase 2 - Gameplay Roadmap
 */

import React from 'react';

import { IPilotMechCardData } from '@/types/pilot/pilot-mech-card';

// =============================================================================
// Types
// =============================================================================

export interface EffectiveStatsSectionProps {
  /** Pilot-mech card data */
  data: IPilotMechCardData;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get consciousness severity color based on target number
 */
function getConsciousnessColor(target: number): string {
  if (target <= 3) return 'text-emerald-400';
  if (target <= 5) return 'text-amber-400';
  if (target <= 7) return 'text-orange-400';
  return 'text-rose-400';
}

/**
 * Get to-hit severity color based on base number
 */
function getToHitColor(baseToHit: number): string {
  if (baseToHit <= 6) return 'text-emerald-400'; // Elite (G2)
  if (baseToHit <= 8) return 'text-text-theme-primary'; // Veteran/Regular (G3-4)
  if (baseToHit <= 10) return 'text-amber-400'; // Green (G5-6)
  return 'text-rose-400'; // Very green (G7+)
}

// =============================================================================
// Component
// =============================================================================

export function EffectiveStatsSection({
  data,
  className = '',
}: EffectiveStatsSectionProps): React.ReactElement {
  const {
    gunnery,
    piloting,
    wounds,
    baseToHit,
    consciousnessTarget,
    abilities,
  } = data;

  // Check for abilities that might modify combat stats
  // These would be resolved from ability definitions in a full implementation
  const hasRelevantAbilities = abilities.some((a) =>
    ['marksman', 'iron-will', 'melee-specialist', 'dodge'].includes(
      a.toLowerCase(),
    ),
  );

  return (
    <div
      className={`bg-surface-base/40 border-border-theme-subtle/50 rounded-lg border ${className}`}
    >
      <div className="border-border-theme-subtle/30 border-b px-4 py-3">
        <h4 className="text-text-theme-primary flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
          <span className="h-4 w-1 rounded-full bg-amber-500" />
          Effective Combat Stats
        </h4>
      </div>

      <div className="space-y-4 p-4">
        {/* Base To-Hit */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-text-theme-secondary text-sm">
              Base To-Hit Number
            </span>
            <span
              className={`font-mono text-lg font-bold ${getToHitColor(baseToHit)}`}
            >
              {baseToHit}+
            </span>
          </div>
          <div className="text-text-theme-muted font-mono text-xs">
            4 (base) + {gunnery} (gunnery) = {baseToHit}
          </div>
          <div className="text-text-theme-muted mt-2 text-xs">
            <span className="text-text-theme-secondary">Note:</span> Additional
            modifiers from range, movement, terrain, etc. are added during
            combat.
          </div>
        </div>

        {/* Divider */}
        <div className="border-border-theme-subtle/30 border-t" />

        {/* Consciousness Roll */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-text-theme-secondary text-sm">
              Consciousness Target
            </span>
            <span
              className={`font-mono text-lg font-bold ${getConsciousnessColor(consciousnessTarget)}`}
            >
              {consciousnessTarget}+
            </span>
          </div>
          <div className="text-text-theme-muted font-mono text-xs">
            3 (base) + {wounds} (wounds) = {consciousnessTarget}
          </div>
          {wounds > 0 && (
            <div className="mt-2">
              <div className="flex items-center gap-1">
                {wounds >= 4 && (
                  <span className="text-xs font-medium text-rose-400">
                    Critical! Roll required each turn.
                  </span>
                )}
                {wounds >= 2 && wounds < 4 && (
                  <span className="text-xs font-medium text-amber-400">
                    Moderate wounds affecting consciousness.
                  </span>
                )}
                {wounds < 2 && (
                  <span className="text-text-theme-muted text-xs">
                    Minor wounds.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Piloting Skill Reference */}
        <div className="border-border-theme-subtle/30 border-t pt-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-text-theme-secondary text-sm">
              Piloting Skill
            </span>
            <span className="text-text-theme-primary font-mono text-lg font-bold">
              {piloting}
            </span>
          </div>
          <div className="text-text-theme-muted text-xs">
            Used for PSRs (Piloting Skill Rolls) to avoid falls and maintain
            balance.
          </div>
        </div>

        {/* Ability Modifiers Hint */}
        {hasRelevantAbilities && (
          <>
            <div className="border-border-theme-subtle/30 border-t pt-4">
              <div className="text-text-theme-secondary mb-2 text-sm">
                Active Ability Modifiers
              </div>
              <div className="text-text-theme-muted text-xs italic">
                Ability effects are applied contextually during gameplay based
                on conditions.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default EffectiveStatsSection;
