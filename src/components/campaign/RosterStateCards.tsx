/**
 * RosterStateCards
 *
 * Per `canonicalize-unit-combat-state` PR-B: the unit card consumes the
 * thin `IRosterUnitProjection` for identity + readiness, then reads
 * canonical damage state via a `useShallow`-style memoized selector
 * against `useCampaignStore.campaign.unitCombatStates[unitId]`. The
 * selector returns a derived shape (totalDamage, destroyedCount, names)
 * so unrelated campaign-store writes don't trigger re-renders.
 *
 * @spec openspec/specs/campaign-unit-combat-state/spec.md
 */
import React, { useMemo } from 'react';
import { useStore } from 'zustand';

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type { IUnitCombatState } from '@/types/campaign/UnitCombatState';

import { Badge } from '@/components/ui';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { CampaignPilotStatus } from '@/types/campaign';

// =============================================================================
// Status Helpers
// =============================================================================

/**
 * Map projection readiness to badge styles. Replaces the legacy
 * `getUnitStatusStyles(CampaignUnitStatus)` accessor — `Repairing` and
 * `Salvage` are no longer surfaced here because the projection only
 * carries the three derived readiness values. Repair-bay flow surfaces
 * those states via its own component.
 */
export function getReadinessStyles(unit: IRosterUnitProjection): {
  badge: 'success' | 'warning' | 'red' | 'muted';
  label: string;
} {
  switch (unit.readiness) {
    case 'Ready':
      return { badge: 'success', label: 'Ready' };
    case 'Damaged':
      return { badge: 'warning', label: 'Damaged' };
    case 'Destroyed':
      return { badge: 'red', label: 'Destroyed' };
    default:
      return { badge: 'muted', label: unit.readiness };
  }
}

export function getPilotStatusStyles(status: CampaignPilotStatus): {
  badge: 'success' | 'warning' | 'info' | 'red' | 'muted';
  label: string;
} {
  switch (status) {
    case CampaignPilotStatus.Active:
      return { badge: 'success', label: 'Active' };
    case CampaignPilotStatus.Wounded:
      return { badge: 'warning', label: 'Wounded' };
    case CampaignPilotStatus.Critical:
      return { badge: 'red', label: 'Critical' };
    case CampaignPilotStatus.MIA:
      return { badge: 'info', label: 'MIA' };
    case CampaignPilotStatus.KIA:
      return { badge: 'red', label: 'KIA' };
    default:
      return { badge: 'muted', label: status };
  }
}

// =============================================================================
// Damage Bar Selector — memoized read of canonical combat state
// =============================================================================

/**
 * Derived damage-bar shape returned by the canonical-state selector.
 *
 * Computed once per render against `IUnitCombatState` so the card can
 * re-render only when these specific values change — not on every
 * unrelated campaign-store write (e.g., personnel update, finance
 * transaction). The shallow comparator on the returned object handles
 * the cheap equality check.
 */
interface IDamageBarData {
  /** True when the unit has any destroyed component (binary "took crits"). */
  readonly hasDestroyedComponents: boolean;
  /** Count of destroyed components for the "Destroyed: ..." sub-line. */
  readonly destroyedCount: number;
  /** First three destroyed component names for display. */
  readonly destroyedNames: readonly string[];
  /**
   * Crude total-damage proxy used by the legacy display-bar width
   * calculation. Without an `IUnitMaxState` companion we approximate
   * "how damaged" with destroyed component + location counts. Repair
   * tickets diff against the max-state for accurate values; this is a
   * display heuristic only.
   */
  readonly totalDamage: number;
}

const EMPTY_DAMAGE_BAR: IDamageBarData = {
  hasDestroyedComponents: false,
  destroyedCount: 0,
  destroyedNames: [],
  totalDamage: 0,
};

/**
 * Compute damage-bar inputs from canonical combat state.
 *
 * Pure function — extracted so the selector can call it with a stable
 * input (the slice of state) and produce a stable output (cached via
 * shallow equality on the four fields).
 */
function computeDamageBarData(
  combatState: IUnitCombatState | undefined,
): IDamageBarData {
  if (!combatState) return EMPTY_DAMAGE_BAR;

  const destroyedCount = combatState.destroyedComponents.length;
  const destroyedLocationCount = combatState.destroyedLocations.length;
  // Each destroyed component contributes ~10% damage to the bar so it
  // visibly fills as crits accumulate. The legacy code multiplied
  // damage points × 5 with a 100 cap; this is the canonical-state analog.
  const totalDamage = destroyedCount * 2 + destroyedLocationCount * 4;

  return {
    hasDestroyedComponents: destroyedCount > 0,
    destroyedCount,
    destroyedNames: combatState.destroyedComponents
      .slice(0, 3)
      .map((c) => c.name),
    totalDamage,
  };
}

/**
 * Read damage-bar data for a single unit from canonical combat state.
 *
 * Subscribes to the campaign store via `useStore` and re-computes the
 * selector slice on every store change. The selector body retains its
 * own previous value via closure and returns the previous reference
 * when the four fields are shallow-equal — this is the manual analog of
 * `useShallow` from `zustand/react/shallow`. Prevents the unit card from
 * re-rendering when only unrelated campaign-store fields change (day
 * advance, pending outcomes queue, finance transactions, etc.).
 *
 * Per design.md decision "Selector memoization for damage bar".
 */
function useDamageBarData(unitId: string): IDamageBarData {
  const storeApi = useCampaignStore();
  const selector = useMemo(() => {
    let prev: IDamageBarData = EMPTY_DAMAGE_BAR;
    return (state: ReturnType<typeof storeApi.getState>): IDamageBarData => {
      const next = computeDamageBarData(
        state.campaign?.unitCombatStates[unitId],
      );
      if (
        prev.hasDestroyedComponents === next.hasDestroyedComponents &&
        prev.destroyedCount === next.destroyedCount &&
        prev.totalDamage === next.totalDamage &&
        prev.destroyedNames.length === next.destroyedNames.length &&
        prev.destroyedNames.every((n, i) => n === next.destroyedNames[i])
      ) {
        return prev;
      }
      prev = next;
      return next;
    };
  }, [unitId, storeApi]);

  return useStore(storeApi, selector);
}

// =============================================================================
// Unit Card
// =============================================================================

interface UnitCardProps {
  unit: IRosterUnitProjection;
  onClick?: () => void;
}

export function RosterUnitCard({
  unit,
  onClick,
}: UnitCardProps): React.ReactElement {
  const statusStyles = getReadinessStyles(unit);
  const isDestroyed = unit.readiness === 'Destroyed';
  const damageBar = useDamageBarData(unit.unitId);

  return (
    <div
      className={`bg-surface-deep border-border-theme-subtle rounded-lg border p-4 transition-all ${
        onClick
          ? 'hover:border-accent/50 hover:bg-surface-raised/50 cursor-pointer'
          : ''
      } ${isDestroyed ? 'opacity-50' : ''}`}
      onClick={onClick}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h4 className="text-text-theme-primary truncate font-semibold">
            {unit.unitName}
          </h4>
          <p className="text-text-theme-muted truncate text-xs">
            {unit.unitId.slice(0, 8)}...
          </p>
        </div>
        <Badge variant={statusStyles.badge} size="sm">
          {statusStyles.label}
        </Badge>
      </div>

      {!isDestroyed && (
        <div className="space-y-2">
          {damageBar.totalDamage > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-text-theme-muted w-16 text-xs">Damage</span>
              <div className="bg-surface-raised h-1.5 flex-1 overflow-hidden rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-red-500 transition-all"
                  style={{
                    width: `${Math.min(100, damageBar.totalDamage * 5)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {damageBar.hasDestroyedComponents && (
            <div className="text-xs text-red-400">
              <span className="font-medium">Destroyed:</span>{' '}
              {damageBar.destroyedNames.join(', ')}
              {damageBar.destroyedCount > damageBar.destroyedNames.length &&
                ` +${damageBar.destroyedCount - damageBar.destroyedNames.length} more`}
            </div>
          )}
        </div>
      )}

      {unit.readiness === 'Damaged' && (
        <div className="border-border-theme-subtle mt-3 flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-1.5 text-amber-400">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-xs font-medium">Needs Repair</span>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Pilot Card
// =============================================================================

interface PilotCardProps {
  pilot: ICampaignRosterEntry;
  onClick?: () => void;
}

export function RosterPilotCard({
  pilot,
  onClick,
}: PilotCardProps): React.ReactElement {
  const statusStyles = getPilotStatusStyles(pilot.status);
  const isAvailable = pilot.status === CampaignPilotStatus.Active;
  const isDeceased = pilot.status === CampaignPilotStatus.KIA;

  return (
    <div
      className={`bg-surface-deep border-border-theme-subtle rounded-lg border p-4 transition-all ${
        onClick
          ? 'hover:border-accent/50 hover:bg-surface-raised/50 cursor-pointer'
          : ''
      } ${isDeceased ? 'opacity-50' : ''}`}
      onClick={onClick}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              isAvailable
                ? 'bg-emerald-500/20 text-emerald-400'
                : isDeceased
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-surface-raised text-text-theme-muted'
            }`}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h4 className="text-text-theme-primary truncate font-semibold">
              {pilot.pilotName}
            </h4>
            <p className="text-text-theme-muted text-xs">
              {pilot.campaignMissions} missions
            </p>
          </div>
        </div>
        <Badge variant={statusStyles.badge} size="sm">
          {statusStyles.label}
        </Badge>
      </div>

      {!isDeceased && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="bg-surface-raised rounded p-2 text-center">
            <div className="text-accent text-lg font-bold">{pilot.xp}</div>
            <div className="text-text-theme-muted text-[10px] uppercase">
              XP
            </div>
          </div>
          <div className="bg-surface-raised rounded p-2 text-center">
            <div className="text-lg font-bold text-emerald-400">
              {pilot.campaignKills}
            </div>
            <div className="text-text-theme-muted text-[10px] uppercase">
              Kills
            </div>
          </div>
          <div className="bg-surface-raised rounded p-2 text-center">
            <div
              className={`text-lg font-bold ${pilot.wounds > 0 ? 'text-red-400' : 'text-text-theme-secondary'}`}
            >
              {pilot.wounds}
            </div>
            <div className="text-text-theme-muted text-[10px] uppercase">
              Wounds
            </div>
          </div>
        </div>
      )}

      {pilot.wounds > 0 && !isDeceased && (
        <div className="flex items-center gap-1.5 text-red-400">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="text-xs font-medium">
            {pilot.wounds} wound{pilot.wounds !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {pilot.recoveryTime > 0 && (
        <div className="mt-2 text-xs text-cyan-400">
          <span className="font-medium">Recovery:</span> {pilot.recoveryTime}{' '}
          mission(s)
        </div>
      )}
    </div>
  );
}
