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
  PhysicalAttackLimb,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks/types';

import {
  useGameplaySelector,
  useSelectedUnit,
} from '@/stores/useGameplayStore';
import { usePhysicalAttackPlanStore } from '@/stores/useGameplayStore.combatFlows';
import {
  GamePhase,
  MovementType,
  type IHexCoordinate,
  type IINarcPodState,
} from '@/types/gameplay';
import { hexDistance } from '@/utils/gameplay/hexMath';
import { buildPhysicalElevationContext } from '@/utils/gameplay/physicalAttacks/elevation';
import { getEligiblePhysicalAttacks } from '@/utils/gameplay/physicalAttacks/eligibility';
import { buildPhysicalTerrainContext } from '@/utils/gameplay/physicalAttacks/terrain';
import { isZweihanderPhysicalAttackType } from '@/utils/gameplay/physicalAttacks/types';
import { isAirborneVTOLOrWiGEForPhysicalAttack } from '@/utils/gameplay/physicalAttacks/unitState';
import { hasSPA } from '@/utils/gameplay/spaModifiers';
import {
  buildINarcPodBrushOffTargetOptions,
  iNarcPodDisplayName,
  iNarcPodTargetKey,
  uniqueINarcPodTargets,
} from '@/utils/gameplay/specialWeaponMechanics';

import type { PhysicalAttackIntentVariant } from './overlays/PhysicalAttackIntentArrow';

import { PhysicalAttackForecastModal } from './PhysicalAttackForecastModal';
import {
  attackTypeLabel,
  EMPTY_DAMAGE,
  intentVariantFor,
  REASON_COPY,
} from './PhysicalAttackPanel.helpers';

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

interface MeleeTarget {
  id: string;
  carrierUnitId: string;
  name: string;
  position: IHexCoordinate;
  selectedINarcPod?: IINarcPodState;
}

function armForPhysicalLimb(
  limb: PhysicalAttackLimb | null,
): 'left' | 'right' | undefined {
  if (limb === 'leftArm') return 'left';
  if (limb === 'rightArm') return 'right';
  return undefined;
}

export function PhysicalAttackPanel({
  attackerTonnage = 65,
  meleeWeaponsEquipped,
  onIntentChange,
  className = '',
}: PhysicalAttackPanelProps): React.ReactElement | null {
  const session = useGameplaySelector((s) => s.session);
  const interactiveSession = useGameplaySelector((s) => s.interactiveSession);
  const setSession = useGameplaySelector((s) => s.setSession);
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
  const setPhysicalAttackTwoHandedZweihander = usePhysicalAttackPlanStore(
    (s) => s.setPhysicalAttackTwoHandedZweihander,
  );
  const setPhysicalAttackINarcPod = usePhysicalAttackPlanStore(
    (s) => s.setPhysicalAttackINarcPod,
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
  const physicalGrid = interactiveSession?.getGrid() ?? null;

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
      const carrierName = unitMeta?.name ?? unitId;
      list.push({
        id: unitId,
        carrierUnitId: unitId,
        name: carrierName,
        position: unitState.position,
      });
      list.push(
        ...buildINarcPodBrushOffTargetOptions({
          carrierUnitId: unitId,
          carrierName,
          pods: unitState.iNarcPods,
        }).map((target) => ({
          id: target.id,
          carrierUnitId: target.carrierUnitId,
          name: target.name,
          position: unitState.position,
          selectedINarcPod: target.selectedINarcPod,
        })),
      );
    }
    return list;
  }, [selected, session]);

  const selectedMeleeTarget = useMemo(() => {
    const selectedPodKey =
      physicalAttackPlan.selectedINarcPod !== undefined
        ? iNarcPodTargetKey(physicalAttackPlan.selectedINarcPod)
        : undefined;
    return (
      meleeTargets.find((target) => {
        if (target.carrierUnitId !== physicalAttackPlan.targetUnitId) {
          return false;
        }
        if (target.selectedINarcPod === undefined) {
          return selectedPodKey === undefined;
        }
        return (
          selectedPodKey !== undefined &&
          iNarcPodTargetKey(target.selectedINarcPod) === selectedPodKey
        );
      }) ?? null
    );
  }, [
    meleeTargets,
    physicalAttackPlan.selectedINarcPod,
    physicalAttackPlan.targetUnitId,
  ]);

  const selectedTargetIsINarcPod =
    selectedMeleeTarget?.selectedINarcPod !== undefined;

  /**
   * Current target `IUnitGameState` picked from the store plan. Memoized
   * so the eligibility projection below doesn't recompute on unrelated
   * renders.
   */
  const targetState = useMemo(() => {
    if (!physicalAttackPlan.targetUnitId || !session) return null;
    return session.currentState.units[physicalAttackPlan.targetUnitId] ?? null;
  }, [physicalAttackPlan.targetUnitId, session]);
  const optionalRules = session?.config.optionalRules;
  const targetINarcPods = useMemo(
    () => uniqueINarcPodTargets(targetState?.iNarcPods),
    [targetState?.iNarcPods],
  );
  const selectedINarcPodKey =
    physicalAttackPlan.selectedINarcPod !== undefined
      ? iNarcPodTargetKey(physicalAttackPlan.selectedINarcPod)
      : (targetINarcPods[0] && iNarcPodTargetKey(targetINarcPods[0])) || '';

  /**
   * Per task 3.1-3.3: project the engine's `getEligiblePhysicalAttacks`
   * into one row per attack type. Rows include both eligible and
   * ineligible options — ineligible rows render disabled + with a
   * tooltip (task 4.4).
   */
  const options = useMemo<readonly IPhysicalAttackOption[]>(() => {
    if (!selected || !targetState) return [];
    const targetUnit = session?.units.find(
      (unit) => unit.id === physicalAttackPlan.targetUnitId,
    );
    const projected = getEligiblePhysicalAttacks(selected.state, targetState, {
      attackerTonnage,
      attackerPilotingSkill: selected.unit.piloting,
      targetTonnage: attackerTonnage,
      attackerUnitType: selected.unit.unitType,
      attackerMovementMode: selected.unit.movementMode,
      optionalRules,
      targetUnitType: targetUnit?.unitType,
      targetIsINarcPod: selectedTargetIsINarcPod,
      weaponsFiredFromLeftArm: selected.state.weaponsFiredThisTurn,
      weaponsFiredFromRightArm: selected.state.weaponsFiredThisTurn,
      limbsUsedThisTurn: undefined,
      attackerRanThisTurn: selected.state.movementThisTurn === MovementType.Run,
      attackerJumpedThisTurn:
        selected.state.movementThisTurn === MovementType.Jump,
      meleeWeaponsEquipped,
      elevationContext: physicalGrid
        ? buildPhysicalElevationContext(
            selected.state,
            targetState,
            physicalGrid,
            {
              targetUnit,
            },
          )
        : undefined,
      terrainContext: physicalGrid
        ? buildPhysicalTerrainContext(selected.state, targetState, physicalGrid)
        : undefined,
    });
    return selectedTargetIsINarcPod
      ? projected.filter((option) => option.attackType === 'brush-off')
      : projected;
  }, [
    selected,
    targetState,
    session?.units,
    physicalAttackPlan.targetUnitId,
    attackerTonnage,
    meleeWeaponsEquipped,
    physicalGrid,
    optionalRules,
    selectedTargetIsINarcPod,
  ]);

  /**
   * Build the attack input consumed by the forecast modal when a
   * specific row's Declare button is clicked. The input mirrors the
   * row's attack type + limb, so the modal's TN + damage numbers
   * match the row the player clicked.
   */
  const forecastInput = useMemo<IPhysicalAttackInput | null>(() => {
    if (!selected || !physicalAttackPlan.attackType) return null;
    const targetUnit = session?.units.find(
      (unit) => unit.id === physicalAttackPlan.targetUnitId,
    );
    return {
      attackerTonnage,
      pilotingSkill: selected.unit.piloting,
      componentDamage: selected.state.componentDamage ?? EMPTY_DAMAGE,
      attackType: physicalAttackPlan.attackType,
      limb: physicalAttackPlan.limb ?? undefined,
      arm: armForPhysicalLimb(physicalAttackPlan.limb),
      twoHandedZweihander:
        isZweihanderPhysicalAttackType(physicalAttackPlan.attackType) &&
        physicalAttackPlan.twoHandedZweihander,
      heat: selected.state.heat,
      attackerProne: selected.state.prone,
      attackerUnitType: selected.unit.unitType,
      attackerMovementMode: selected.unit.movementMode,
      attackerConversionMode: selected.state.conversionMode,
      attackerIsAirborneVTOLOrWiGE: isAirborneVTOLOrWiGEForPhysicalAttack(
        selected.state,
        selected.unit.movementMode,
      ),
      optionalRules,
      attackerDestroyedLocations: selected.state.destroyedLocations,
      targetUnitType: targetUnit?.unitType,
      attackerPosition: selected.state.position,
      targetPosition: targetState?.position,
      attackerFacing: selected.state.facing,
      targetProne: targetState?.prone,
      hexesMoved: selected.state.hexesMovedThisTurn,
      weaponsFiredFromArm: selected.state.weaponsFiredThisTurn,
      attackerRanThisTurn: selected.state.movementThisTurn === MovementType.Run,
      attackerJumpedThisTurn:
        selected.state.movementThisTurn === MovementType.Jump,
      elevationContext:
        targetState && physicalGrid
          ? buildPhysicalElevationContext(
              selected.state,
              targetState,
              physicalGrid,
              {
                targetUnit,
              },
            )
          : undefined,
      terrainContext:
        targetState && physicalGrid
          ? buildPhysicalTerrainContext(
              selected.state,
              targetState,
              physicalGrid,
            )
          : undefined,
    };
  }, [
    selected,
    session?.units,
    targetState,
    physicalGrid,
    attackerTonnage,
    physicalAttackPlan.targetUnitId,
    physicalAttackPlan.attackType,
    physicalAttackPlan.limb,
    physicalAttackPlan.twoHandedZweihander,
    optionalRules,
  ]);

  const showZweihanderToggle =
    isZweihanderPhysicalAttackType(physicalAttackPlan.attackType) &&
    hasSPA(selected?.state.abilities ?? [], 'zweihander');

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------

  const handleSelectTarget = useCallback(
    (target: MeleeTarget) => {
      setPhysicalAttackTarget(target.carrierUnitId);
      // Clear any previously-selected attack type when the target
      // changes — the restriction set may differ.
      setPhysicalAttackType(null);
      setPhysicalAttackINarcPod(target.selectedINarcPod);
      onIntentChange?.(null);
    },
    [
      setPhysicalAttackTarget,
      setPhysicalAttackType,
      setPhysicalAttackINarcPod,
      onIntentChange,
    ],
  );

  const handleSelectINarcPod = useCallback(
    (podKey: string) => {
      const selectedPod = targetINarcPods.find(
        (pod) => iNarcPodTargetKey(pod) === podKey,
      );
      setPhysicalAttackINarcPod(selectedPod);
    },
    [setPhysicalAttackINarcPod, targetINarcPods],
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
      setPhysicalAttackType(option.attackType, option.limb ?? null);
      setPhysicalAttackTwoHandedZweihander(false);
      if (
        option.attackType === 'brush-off' &&
        physicalAttackPlan.selectedINarcPod === undefined
      ) {
        setPhysicalAttackINarcPod(targetINarcPods[0]);
      }
      setForecastOpen(true);
    },
    [
      physicalAttackPlan.selectedINarcPod,
      setPhysicalAttackType,
      setPhysicalAttackTwoHandedZweihander,
      setPhysicalAttackINarcPod,
      targetINarcPods,
    ],
  );

  const handleConfirm = useCallback(() => {
    if (!interactiveSession || !selected) return;
    const targetUnit = session?.units.find(
      (unit) => unit.id === physicalAttackPlan.targetUnitId,
    );
    const next = commitPhysicalAttack({
      interactiveSession,
      attackerId: selected.id,
      attackerPiloting: selected.unit.piloting,
      attackerTonnage,
      attackerUnitType: selected.unit.unitType,
      attackerMovementMode: selected.unit.movementMode,
      optionalRules,
      targetUnitType: targetUnit?.unitType,
      hexesMoved: selected.state.hexesMovedThisTurn,
      weaponsFiredFromLeftArm: selected.state.weaponsFiredThisTurn,
      weaponsFiredFromRightArm: selected.state.weaponsFiredThisTurn,
      attackerRanThisTurn: selected.state.movementThisTurn === MovementType.Run,
      attackerJumpedThisTurn:
        selected.state.movementThisTurn === MovementType.Jump,
      elevationContext:
        targetState && physicalGrid
          ? buildPhysicalElevationContext(
              selected.state,
              targetState,
              physicalGrid,
              { targetUnit },
            )
          : undefined,
      terrainContext:
        targetState && physicalGrid
          ? buildPhysicalTerrainContext(
              selected.state,
              targetState,
              physicalGrid,
            )
          : undefined,
    });
    if (next) {
      setSession(next);
      const target = meleeTargets.find((t) => t.id === selectedMeleeTarget?.id);
      setCommittedSummary(
        `Declared ${attackTypeLabel(
          physicalAttackPlan.attackType ?? 'punch',
          physicalAttackPlan.limb ?? undefined,
        )} vs ${target?.name ?? 'target'}`,
      );
    }
    setForecastOpen(false);
    onIntentChange?.(null);
  }, [
    interactiveSession,
    selected,
    session?.units,
    commitPhysicalAttack,
    setSession,
    attackerTonnage,
    meleeTargets,
    physicalAttackPlan.targetUnitId,
    physicalAttackPlan.attackType,
    physicalAttackPlan.limb,
    physicalAttackPlan.twoHandedZweihander,
    selectedMeleeTarget?.id,
    targetState,
    physicalGrid,
    onIntentChange,
    optionalRules,
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
            const isSelected = selectedMeleeTarget?.id === target.id;
            return (
              <li key={target.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelectTarget(target)}
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

      {hasTarget && targetINarcPods.length > 0 && (
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-text-theme-muted">Brush-Off pod</span>
          <select
            value={selectedINarcPodKey}
            onChange={(event) =>
              handleSelectINarcPod(event.currentTarget.value)
            }
            className="border-border-theme-subtle bg-surface-base text-text-theme-primary min-h-[32px] rounded border px-2 py-1"
            data-testid="physical-attack-inarc-pod-select"
          >
            {targetINarcPods.map((pod) => {
              const podKey = iNarcPodTargetKey(pod);
              return (
                <option key={podKey} value={podKey}>
                  {iNarcPodDisplayName(pod)}
                </option>
              );
            })}
          </select>
        </label>
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
          showZweihanderToggle={showZweihanderToggle}
          zweihanderTwoHanded={physicalAttackPlan.twoHandedZweihander}
          onZweihanderTwoHandedChange={setPhysicalAttackTwoHandedZweihander}
        />
      )}
    </section>
  );
}

export default PhysicalAttackPanel;
