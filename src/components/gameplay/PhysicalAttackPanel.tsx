/**
 * PhysicalAttackPanel
 *
 * Per `add-physical-attack-phase-ui` tasks 4.x + 5.x + 7.x + 9.x:
 * the sub-panel that mounts under the action bar during
 * `GamePhase.PhysicalAttack`. Owns the target list, the per-row
 * eligibility table (populated by `getEligiblePhysicalAttacks`), and
 * hover-driven intent-arrow emission for the map overlay.
 *
 * Flow:
 *  1. Player picks an adjacent enemy target from the target list.
 *  2. Panel projects `getEligiblePhysicalAttacks(attacker, target, ...)`
 *     into one row per attack type (punch L/R, kick L/R, charge, DFA,
 *     push, + any equipped melee weapons).
 *  3. Each row shows attack type + limb + to-hit TN + damage preview.
 *     Ineligible rows render disabled with a tooltip listing the
 *     blocking restriction codes (task 4.4 + 9.4).
 *  4. Hover on an eligible row emits a variant hint (`charge` | `dfa`
 *     | `push`) via `onIntentChange` so the parent can render the
 *     matching `PhysicalAttackIntentArrow` overlay (task 4.3 + 7.5).
 *  5. Declare button on each eligible row opens the forecast modal
 *     seeded with that row's config. Confirm commits via
 *     `usePhysicalAttackPlanStore.commitPhysicalAttack`, which in turn
 *     calls the engine helper `declarePhysicalAttack` (task 5.3).
 *  6. After a successful commit the panel collapses to a summary line
 *     (task 5.4) until the player advances past the PhysicalAttack
 *     phase.
 *
 * @spec openspec/changes/add-physical-attack-phase-ui/specs/tactical-map-interface/spec.md
 * @spec openspec/changes/add-physical-attack-phase-ui/specs/physical-attack-system/spec.md
 */

import React, { useCallback, useMemo, useState } from 'react';

import type {
  IPhysicalAttackInput,
  IPhysicalAttackOption,
  PhysicalAttackInvalidReason,
  PhysicalAttackLimb,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks/types';

import { useGameplayStore, useSelectedUnit } from '@/stores/useGameplayStore';
import { usePhysicalAttackPlanStore } from '@/stores/useGameplayStore.combatFlows';
import {
  GamePhase,
  type IComponentDamageState,
  type IHexCoordinate,
} from '@/types/gameplay';
import { hexDistance } from '@/utils/gameplay/hexMath';
import { getEligiblePhysicalAttacks } from '@/utils/gameplay/physicalAttacks/eligibility';

import type { PhysicalAttackIntentVariant } from './overlays/PhysicalAttackIntentArrow';

import { PhysicalAttackForecastModal } from './PhysicalAttackForecastModal';

/**
 * Per task 7.5 + `tactical-map-interface` delta "Physical Attack Intent
 * Arrows": the on-hover hint the parent mounts into `HexMapDisplay` as
 * a `<PhysicalAttackIntentArrow>`. `null` clears the overlay.
 */
export interface PhysicalAttackIntent {
  readonly variant: PhysicalAttackIntentVariant;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
}

export interface PhysicalAttackPanelProps {
  /** Tonnage of the selected attacker (forwarded to the engine helpers). */
  attackerTonnage?: number;
  /** Optional list of melee weapons the attacker has equipped. */
  meleeWeaponsEquipped?: readonly PhysicalAttackType[];
  /**
   * Emitted when the player hovers an eligible row whose attack type
   * supports an intent arrow (charge / dfa / push). Parent (typically
   * the gameplay page) threads this to `HexMapDisplay` which mounts the
   * `PhysicalAttackIntentArrow` overlay. `null` clears the arrow.
   */
  onIntentChange?: (intent: PhysicalAttackIntent | null) => void;
  /** Optional className passthrough. */
  className?: string;
}

const EMPTY_DAMAGE: IComponentDamageState = {
  engineHits: 0,
  gyroHits: 0,
  sensorHits: 0,
  lifeSupport: 0,
  cockpitHit: false,
  actuators: {},
  weaponsDestroyed: [],
  heatSinksDestroyed: 0,
  jumpJetsDestroyed: 0,
};

interface MeleeTarget {
  id: string;
  name: string;
  position: IHexCoordinate;
}

/**
 * Per task 9.4: friendly copy for every `PhysicalAttackInvalidReason`
 * so the disabled-row tooltip stays human-readable.
 */
const REASON_COPY: Record<PhysicalAttackInvalidReason, string> = {
  WeaponFiredThisTurn: 'Arm fired a weapon this turn',
  MissingActuator: 'Required actuator is missing',
  HipDestroyed: 'Hip actuator destroyed',
  ShoulderDestroyed: 'Shoulder actuator destroyed',
  SameLimbUsedThisTurn: 'Limb already used for a physical attack',
  NoJumpThisTurn: 'DFA requires jumping this turn',
  NoRunThisTurn: 'Charge requires running this turn',
  LimbMissing: 'Limb is missing',
  AttackerProne: 'Attacker is prone',
  UnsupportedAttackType: 'Attack type is unsupported',
  DestinationBlocked: 'Push destination is blocked',
};

/**
 * Per task 4.2: row-level display helpers. Keeps JSX readable.
 */
function attackTypeLabel(
  attackType: PhysicalAttackType,
  limb?: PhysicalAttackLimb,
): string {
  const base: Record<PhysicalAttackType, string> = {
    punch: 'Punch',
    kick: 'Kick',
    charge: 'Charge',
    dfa: 'Death-from-Above',
    push: 'Push',
    hatchet: 'Hatchet',
    sword: 'Sword',
    mace: 'Mace',
    lance: 'Lance',
  };
  const label = base[attackType];
  if (!limb) return label;
  const limbLabel: Record<PhysicalAttackLimb, string> = {
    leftArm: 'L Arm',
    rightArm: 'R Arm',
    leftLeg: 'L Leg',
    rightLeg: 'R Leg',
  };
  return `${label} (${limbLabel[limb]})`;
}

/**
 * Per task 7.5: the intent-arrow variant for a given row. Rows that
 * don't map to an arrow (punch / kick / melee weapon) return `null` —
 * the parent then keeps the overlay unmounted.
 */
function intentVariantFor(
  attackType: PhysicalAttackType,
): PhysicalAttackIntentVariant | null {
  switch (attackType) {
    case 'charge':
      return 'charge';
    case 'dfa':
      return 'dfa';
    case 'push':
      return 'push';
    default:
      return null;
  }
}

export function PhysicalAttackPanel({
  attackerTonnage = 65,
  meleeWeaponsEquipped,
  onIntentChange,
  className = '',
}: PhysicalAttackPanelProps): React.ReactElement | null {
  const session = useGameplayStore((s) => s.session);
  const interactiveSession = useGameplayStore((s) => s.interactiveSession);
  const setSession = useGameplayStore((s) => s.setSession);
  const selected = useSelectedUnit();

  const physicalAttackPlan = usePhysicalAttackPlanStore(
    (s) => s.physicalAttackPlan,
  );
  const setPhysicalAttackTarget = usePhysicalAttackPlanStore(
    (s) => s.setPhysicalAttackTarget,
  );
  const setPhysicalAttackType = usePhysicalAttackPlanStore(
    (s) => s.setPhysicalAttackType,
  );
  const clearPhysicalAttackPlan = usePhysicalAttackPlanStore(
    (s) => s.clearPhysicalAttackPlan,
  );
  const commitPhysicalAttack = usePhysicalAttackPlanStore(
    (s) => s.commitPhysicalAttack,
  );

  const [forecastOpen, setForecastOpen] = useState(false);
  /**
   * Per task 5.4: sticky summary line after a successful commit so the
   * player sees the locked-in declaration for the rest of the phase.
   * Cleared when the phase changes (effectful `return null` guard).
   */
  const [committedSummary, setCommittedSummary] = useState<string | null>(null);

  const phase = session?.currentState.phase;

  /**
   * Compute the list of adjacent enemy targets for the current
   * attacker. "Adjacent" = `hexDistance(...) === 1`. Destroyed units
   * are excluded — you can't melee a wreck.
   */
  const meleeTargets = useMemo<MeleeTarget[]>(() => {
    if (!selected || !session) return [];
    const list: MeleeTarget[] = [];
    for (const [unitId, unitState] of Object.entries(
      session.currentState.units,
    )) {
      if (unitState.side === selected.unit.side) continue;
      if (unitState.destroyed) continue;
      if (hexDistance(selected.state.position, unitState.position) !== 1)
        continue;
      const unitMeta = session.units.find((u) => u.id === unitId);
      list.push({
        id: unitId,
        name: unitMeta?.name ?? unitId,
        position: unitState.position,
      });
    }
    return list;
  }, [selected, session]);

  /**
   * Current target `IUnitGameState` picked from the store plan. Memoized
   * so the eligibility projection below doesn't recompute on unrelated
   * renders.
   */
  const targetState = useMemo(() => {
    if (!physicalAttackPlan.targetUnitId || !session) return null;
    return session.currentState.units[physicalAttackPlan.targetUnitId] ?? null;
  }, [physicalAttackPlan.targetUnitId, session]);

  /**
   * Per task 3.1-3.3: project the engine's `getEligiblePhysicalAttacks`
   * into one row per attack type. Rows include both eligible and
   * ineligible options — ineligible rows render disabled + with a
   * tooltip (task 4.4).
   */
  const options = useMemo<readonly IPhysicalAttackOption[]>(() => {
    if (!selected || !targetState) return [];
    return getEligiblePhysicalAttacks(selected.state, targetState, {
      attackerTonnage,
      attackerPilotingSkill: selected.unit.piloting,
      targetTonnage: attackerTonnage,
      weaponsFiredFromLeftArm: selected.state.weaponsFiredThisTurn,
      weaponsFiredFromRightArm: selected.state.weaponsFiredThisTurn,
      limbsUsedThisTurn: undefined,
      attackerRanThisTurn: false,
      attackerJumpedThisTurn: false,
      meleeWeaponsEquipped,
    });
  }, [selected, targetState, attackerTonnage, meleeWeaponsEquipped]);

  /**
   * Build the attack input consumed by the forecast modal when a
   * specific row's Declare button is clicked. The input mirrors the
   * row's attack type + limb, so the modal's TN + damage numbers
   * match the row the player clicked.
   */
  const forecastInput = useMemo<IPhysicalAttackInput | null>(() => {
    if (!selected || !physicalAttackPlan.attackType) return null;
    return {
      attackerTonnage,
      pilotingSkill: selected.unit.piloting,
      componentDamage: selected.state.componentDamage ?? EMPTY_DAMAGE,
      attackType: physicalAttackPlan.attackType,
      heat: selected.state.heat,
      attackerProne: selected.state.prone,
      hexesMoved: selected.state.hexesMovedThisTurn,
      weaponsFiredFromArm: selected.state.weaponsFiredThisTurn,
    };
  }, [selected, attackerTonnage, physicalAttackPlan.attackType]);

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------

  const handleSelectTarget = useCallback(
    (unitId: string) => {
      setPhysicalAttackTarget(unitId);
      // Clear any previously-selected attack type when the target
      // changes — the restriction set may differ.
      setPhysicalAttackType(null);
      onIntentChange?.(null);
    },
    [setPhysicalAttackTarget, setPhysicalAttackType, onIntentChange],
  );

  /**
   * Per task 4.3 + 7.5: hover emits the intent variant so the parent
   * can render the overlay. Ignored for rows whose attack type has no
   * arrow variant (punch / kick / melee weapon).
   */
  const handleRowHover = useCallback(
    (option: IPhysicalAttackOption) => {
      if (!selected || !targetState || !onIntentChange) return;
      const variant = intentVariantFor(option.attackType);
      if (!variant) {
        onIntentChange(null);
        return;
      }
      onIntentChange({
        variant,
        from: selected.state.position,
        to: targetState.position,
      });
    },
    [selected, targetState, onIntentChange],
  );

  const handleRowLeave = useCallback(() => {
    onIntentChange?.(null);
  }, [onIntentChange]);

  /**
   * Per task 5.2-5.3: per-row Declare. Stashes the attack type + limb
   * on the plan store and opens the forecast modal. Confirm commits.
   */
  const handleDeclare = useCallback(
    (option: IPhysicalAttackOption) => {
      setPhysicalAttackType(option.attackType);
      setForecastOpen(true);
    },
    [setPhysicalAttackType],
  );

  const handleConfirm = useCallback(() => {
    if (!interactiveSession || !selected) return;
    const next = commitPhysicalAttack({
      interactiveSession,
      attackerId: selected.id,
      attackerPiloting: selected.unit.piloting,
      attackerTonnage,
      hexesMoved: selected.state.hexesMovedThisTurn,
    });
    if (next) {
      setSession(next);
      const target = meleeTargets.find(
        (t) => t.id === physicalAttackPlan.targetUnitId,
      );
      setCommittedSummary(
        `Declared ${attackTypeLabel(physicalAttackPlan.attackType ?? 'punch')} vs ${target?.name ?? 'target'}`,
      );
    }
    setForecastOpen(false);
    onIntentChange?.(null);
  }, [
    interactiveSession,
    selected,
    commitPhysicalAttack,
    setSession,
    attackerTonnage,
    meleeTargets,
    physicalAttackPlan.targetUnitId,
    physicalAttackPlan.attackType,
    onIntentChange,
  ]);

  /**
   * Per task 5.5 + spec "Skip affordance": Skip clears the draft plan
   * so the player can advance past PhysicalAttack without committing.
   * Keeps the committed summary (if any) so the phase banner reflects
   * the real decision.
   */
  const handleSkip = useCallback(() => {
    clearPhysicalAttackPlan();
    setForecastOpen(false);
    onIntentChange?.(null);
  }, [clearPhysicalAttackPlan, onIntentChange]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!session || !selected) return null;
  if (phase !== GamePhase.PhysicalAttack) return null;

  const hasTarget = physicalAttackPlan.targetUnitId !== null;

  // Per task 3.4 + 9.4: count of eligible rows so the aria-live region
  // can announce "Physical Attack phase — N eligible options" when the
  // sub-panel mounts or the option list shifts.
  const eligibleCount = options.filter(
    (o) => o.restrictionsFailed.length === 0,
  ).length;

  // Per task 9.4: `aria-live` copy for screen readers. We keep the
  // message short + factual — the component re-renders when `options`
  // or `meleeTargets` change, so the region speaks whenever the state
  // the player cares about (eligibility) changes.
  const announcement =
    meleeTargets.length === 0
      ? 'Physical Attack phase — no eligible targets in adjacent hexes'
      : !hasTarget
        ? `Physical Attack phase — ${meleeTargets.length} adjacent target${meleeTargets.length === 1 ? '' : 's'}`
        : `Physical Attack phase — ${eligibleCount} eligible option${eligibleCount === 1 ? '' : 's'}`;

  return (
    <section
      className={`bg-surface-base flex flex-col gap-3 border-t border-gray-200 p-3 ${className}`}
      aria-label="Physical attack planning"
      data-testid="physical-attack-panel"
    >
      <header>
        <h3 className="text-text-theme-primary text-sm font-semibold">
          Physical Attacks
        </h3>
        <p className="text-text-theme-muted text-xs">
          Pick an adjacent enemy, then declare an attack from the row list.
        </p>
      </header>

      {/* Per task 9.4: aria-live phase announcement. `aria-live=polite`
          + `role=status` means assistive tech batches updates and reads
          them when the user pauses — avoids interrupting rapid hovers.
          Hidden visually with `sr-only` so sighted players see the
          regular header copy, not a duplicate. */}
      <p
        role="status"
        aria-live="polite"
        className="sr-only"
        data-testid="physical-attack-phase-announcement"
      >
        {announcement}
      </p>

      {committedSummary && (
        <p
          className="rounded border border-green-300 bg-green-50 px-2 py-1 text-xs text-green-900"
          data-testid="physical-attack-committed-summary"
          role="status"
        >
          {committedSummary}
        </p>
      )}

      {meleeTargets.length === 0 ? (
        <p
          className="text-text-theme-muted text-sm"
          data-testid="physical-attack-empty"
        >
          No valid melee targets in adjacent hexes
        </p>
      ) : (
        <ul
          className="flex flex-col gap-1"
          data-testid="physical-attack-target-list"
          role="radiogroup"
          aria-label="Melee target"
        >
          {meleeTargets.map((target) => {
            const isSelected = physicalAttackPlan.targetUnitId === target.id;
            return (
              <li key={target.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelectTarget(target.id)}
                  className={`min-h-[36px] w-full rounded border px-2 py-1 text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'text-text-theme-primary border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                  data-testid={`physical-attack-target-${target.id}`}
                >
                  {target.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {hasTarget && options.length > 0 && (
        <ul
          className="flex flex-col gap-1"
          data-testid="physical-attack-option-list"
          aria-label="Eligible physical attacks"
          aria-live="polite"
        >
          {options.map((option, idx) => {
            const isEligible = option.restrictionsFailed.length === 0;
            const reasonTooltip = option.restrictionsFailed
              .map((r) => REASON_COPY[r])
              .join('; ');
            const rowKey = `${option.attackType}-${option.limb ?? 'body'}-${idx}`;
            return (
              <li
                key={rowKey}
                // Per task 9.3: the row is tabbable so keyboard users
                // can Tab through options; Enter on the focused row
                // declares that attack even if focus is on the wrapper
                // instead of the inner Declare button. Ineligible
                // rows keep tabIndex=-1 to skip them in the tab order.
                tabIndex={isEligible ? 0 : -1}
                role="group"
                aria-label={`${attackTypeLabel(option.attackType, option.limb)} — TN ${option.toHit.finalToHit}+, ${option.damage.targetDamage} damage${isEligible ? '' : ` (disabled: ${reasonTooltip})`}`}
                onMouseEnter={() => isEligible && handleRowHover(option)}
                onMouseLeave={handleRowLeave}
                onFocus={() => isEligible && handleRowHover(option)}
                onBlur={handleRowLeave}
                onKeyDown={(event) => {
                  if (!isEligible) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    // Only fire when focus is on the wrapper itself —
                    // the inner Declare button has its own native
                    // Enter/Space behavior and would double-fire
                    // otherwise.
                    if (event.target === event.currentTarget) {
                      event.preventDefault();
                      handleDeclare(option);
                    }
                  }
                }}
              >
                <div
                  className={`flex items-center justify-between gap-2 rounded border px-2 py-1 ${
                    isEligible
                      ? 'border-gray-200 bg-white'
                      : 'border-gray-200 bg-gray-100 opacity-60'
                  }`}
                  title={reasonTooltip || undefined}
                  data-testid={`physical-attack-option-${option.attackType}-${option.limb ?? 'body'}`}
                  data-eligible={isEligible ? 'true' : 'false'}
                >
                  <div className="flex flex-1 flex-col text-xs">
                    <span
                      className={`font-medium ${
                        isEligible
                          ? 'text-text-theme-primary'
                          : 'text-gray-500 line-through'
                      }`}
                    >
                      {attackTypeLabel(option.attackType, option.limb)}
                    </span>
                    <span className="text-text-theme-muted">
                      TN {option.toHit.finalToHit}+ ·{' '}
                      {option.damage.targetDamage} dmg
                      {option.selfRisk.damageToAttacker > 0 &&
                        ` · self ${option.selfRisk.damageToAttacker}`}
                      {option.selfRisk.onMiss === 'AttackerFalls' &&
                        ' · fall on miss'}
                    </span>
                    {!isEligible && reasonTooltip && (
                      <span className="text-xs text-red-600">
                        {reasonTooltip}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeclare(option)}
                    disabled={!isEligible}
                    aria-label={`Declare ${attackTypeLabel(option.attackType, option.limb)}`}
                    className={`min-h-[32px] rounded px-2 py-1 text-xs font-medium focus:ring-2 focus:ring-offset-2 focus:outline-none ${
                      isEligible
                        ? 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                        : 'cursor-not-allowed bg-gray-300 text-gray-500'
                    }`}
                    data-testid={`physical-attack-declare-${option.attackType}-${option.limb ?? 'body'}`}
                  >
                    Declare
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSkip}
          className="bg-surface-deep text-text-theme-primary hover:bg-surface-base min-h-[44px] flex-1 rounded px-4 py-2 font-medium focus:ring-2 focus:ring-offset-2 focus:outline-none"
          data-testid="physical-attack-skip-button"
        >
          Skip
        </button>
      </div>

      {forecastInput && (
        <PhysicalAttackForecastModal
          open={forecastOpen}
          attackInput={forecastInput}
          targetName={
            meleeTargets.find((t) => t.id === physicalAttackPlan.targetUnitId)
              ?.name
          }
          onConfirm={handleConfirm}
          onClose={() => setForecastOpen(false)}
        />
      )}
    </section>
  );
}

export default PhysicalAttackPanel;
