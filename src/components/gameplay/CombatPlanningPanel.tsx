/**
 * CombatPlanningPanel
 *
 * Per `add-combat-phase-ui-flows`: the wrapper component the gameplay
 * page mounts during the Movement and WeaponAttack phases. It pulls
 * the in-progress plans (`plannedMovement` / `attackPlan`) from
 * `useGameplayStore` and stitches together:
 *
 *   - Movement phase: MovementTypeSwitcher + FacingPicker + CommitMoveButton
 *     (plus the existing MovementHeatPreview chip, wired through
 *     CommitMoveButton).
 *   - Weapon-attack phase: WeaponSelector + Preview-Forecast button +
 *     ToHitForecastModal.
 *
 * Uses `useSelectedUnit` (the previously-orphaned derived selector
 * from `useGameplayStore`) to project the currently-selected unit's
 * `IGameUnit` + `IUnitGameState` in one shot — avoids the prior
 * pattern where panels tracked the id and re-derived the unit + state
 * separately.
 */

import React, { useCallback, useMemo, useState } from 'react';

import type { IWeapon } from '@/simulation/ai/types';
import type {
  IAttackerState,
  ITargetState,
  MovementHeatProfile,
} from '@/types/gameplay';

import {
  useGameplaySelector,
  useSelectedUnit,
} from '@/stores/useGameplayStore';
import { Facing, GamePhase, MovementType } from '@/types/gameplay';

import type { PhysicalAttackIntent } from './PhysicalAttackPanel';

import {
  attackerStateForSelected,
  combatProjectionForAttackTarget,
  createMovementPlan,
  forecastWeaponsForPlan,
  isMovementPlanReady,
  movementPlanMetrics,
  selectedWeaponModesForUnit,
  targetStateForAttackPlan,
} from './CombatPlanningPanel.model';
import {
  MovementPlanningSection,
  PhysicalAttackPlanningSection,
  WeaponAttackPlanningSection,
} from './CombatPlanningPanel.sections';

export interface CombatPlanningPanelProps {
  /** Walk MP for the currently selected unit (provided by parent). */
  walkMP?: number;
  /** Run MP for the currently selected unit (provided by parent). */
  runMP?: number;
  /** Jump MP for the currently selected unit (provided by parent). */
  jumpMP?: number;
  /** Rules-level movement heat source for the currently selected unit. */
  movementHeatProfile?: MovementHeatProfile;
  /**
   * Weapons mounted on the currently selected unit (provided by
   * parent). Sourced from the unit's catalog data.
   */
  weapons?: readonly IWeapon[];
  /**
   * Per `add-physical-attack-phase-ui` task 1.2 + 7.5: forwarded
   * straight to the nested `PhysicalAttackPanel` during
   * `GamePhase.PhysicalAttack`. Emits the hovered row's intent arrow
   * config so the parent can mount a `PhysicalAttackIntentArrow`
   * overlay on the hex map. `null` clears the overlay. Unused outside
   * the physical phase.
   */
  onPhysicalAttackIntentChange?: (intent: PhysicalAttackIntent | null) => void;
  /**
   * Per `add-physical-attack-phase-ui` task 1.2: tonnage of the
   * currently selected attacker, forwarded to the physical attack
   * panel so the eligibility projection can return correctly sized
   * damage / self-risk numbers. Optional because the weapon / movement
   * sub-panels don't need it.
   */
  attackerTonnage?: number;
  /** Optional className */
  className?: string;
}

export function CombatPlanningPanel({
  walkMP = 0,
  runMP = Math.ceil(walkMP * 1.5),
  jumpMP = 0,
  movementHeatProfile,
  weapons = [],
  onPhysicalAttackIntentChange,
  attackerTonnage,
  className = '',
}: CombatPlanningPanelProps): React.ReactElement | null {
  // Reasoning: each of these reads is a primitive selector so Zustand
  // can short-circuit re-renders unless the specific slice changes.
  const session = useGameplaySelector((s) => s.session);
  const plannedMovement = useGameplaySelector((s) => s.plannedMovement);
  const attackPlan = useGameplaySelector((s) => s.attackPlan);
  const unitWeaponStatusesByUnitId = useGameplaySelector((s) => s.unitWeapons);
  const weaponModesByUnitId = useGameplaySelector((s) => s.weaponModesByUnitId);
  const interactiveSession = useGameplaySelector((s) => s.interactiveSession);
  const setPlannedMovement = useGameplaySelector((s) => s.setPlannedMovement);
  const clearPlannedMovement = useGameplaySelector(
    (s) => s.clearPlannedMovement,
  );
  const commitPlannedMovement = useGameplaySelector(
    (s) => s.commitPlannedMovement,
  );
  const togglePlannedWeapon = useGameplaySelector((s) => s.togglePlannedWeapon);
  const setPlannedWeaponMode = useGameplaySelector(
    (s) => s.setPlannedWeaponMode,
  );
  const commitAttack = useGameplaySelector((s) => s.commitAttack);
  // Per `add-what-if-to-hit-preview` § 8.2: toggle state lives on the
  // store so other surfaces (e.g. ToHitForecastModal) can subscribe to
  // the same flag without prop drilling. Selector is a primitive read
  // so re-renders only fire when the toggle actually flips.
  const previewEnabled = useGameplaySelector((s) => s.previewEnabled);
  const setPreviewEnabled = useGameplaySelector((s) => s.setPreviewEnabled);

  // The orphan we're now wiring in — projects { id, unit, state } in
  // one shot for the currently selected unit.
  const selected = useSelectedUnit();

  const [forecastOpen, setForecastOpen] = useState(false);
  const selectedWeaponModes = selectedWeaponModesForUnit(
    weaponModesByUnitId,
    selected,
  );
  const combatGrid = useMemo(
    () => interactiveSession?.getGrid() ?? null,
    [interactiveSession],
  );

  const phase = session?.currentState.phase;

  // ---------------------------------------------------------------------------
  // Movement-phase callbacks
  // ---------------------------------------------------------------------------

  const handleTypeChange = useCallback(
    (type: MovementType) => {
      // Switching types invalidates the destination + facing the
      // player picked under the previous type — clear the plan and
      // immediately seed an empty plan with the new type so the
      // overlay knows which color to paint reachable hexes.
      clearPlannedMovement();
      const nextPlan = createMovementPlan(type, selected);
      if (nextPlan) setPlannedMovement(nextPlan);
    },
    [clearPlannedMovement, setPlannedMovement, selected],
  );

  const handleFacingSelect = useCallback(
    (facing: Facing) => {
      if (!plannedMovement) return;
      setPlannedMovement({ ...plannedMovement, facing });
    },
    [plannedMovement, setPlannedMovement],
  );

  // Plan is "ready" when the player picked a destination distinct
  // from their starting hex AND a facing. Same-hex destination would
  // mean "no movement" — covered by the Stationary type instead.
  const planReady = useMemo(() => {
    return isMovementPlanReady(plannedMovement, selected);
  }, [plannedMovement, selected]);

  const { movementType, mpCost, jumpHexes } =
    movementPlanMetrics(plannedMovement);

  // ---------------------------------------------------------------------------
  // Attack-phase callbacks + derived state
  // ---------------------------------------------------------------------------

  /**
   * Range from the attacker (selected unit) to the target. Returns 0
   * when either side is missing — out-of-range badges then fall back
   * to inert defaults.
   */
  const targetCombatProjection = useMemo(() => {
    return combatProjectionForAttackTarget({
      selected,
      targetUnitId: attackPlan.targetUnitId,
      session,
      grid: combatGrid,
      unitWeaponStatuses: selected?.id
        ? (unitWeaponStatusesByUnitId[selected.id] ?? [])
        : [],
      selectedWeaponIds: attackPlan.selectedWeapons,
    });
  }, [
    attackPlan.selectedWeapons,
    attackPlan.targetUnitId,
    combatGrid,
    selected,
    session,
    unitWeaponStatusesByUnitId,
  ]);

  const rangeToTarget = targetCombatProjection?.distance ?? 0;

  /**
   * Build the IAttackerState the forecast modal needs from the
   * selected unit's live state + their `IGameUnit.gunnery`.
   */
  const attackerState: IAttackerState | null = useMemo(() => {
    return attackerStateForSelected(selected);
  }, [selected]);

  const targetState: ITargetState | null = useMemo(() => {
    return targetStateForAttackPlan(attackPlan.targetUnitId, session);
  }, [attackPlan.targetUnitId, session]);

  const forecastWeapons = useMemo(
    () => forecastWeaponsForPlan(weapons, attackPlan),
    [weapons, attackPlan],
  );

  const handleConfirmFire = useCallback(() => {
    commitAttack();
    setForecastOpen(false);
  }, [commitAttack]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!session || !selected) {
    return null;
  }

  if (phase === GamePhase.Movement) {
    return (
      <MovementPlanningSection
        className={className}
        movementType={movementType}
        walkMP={walkMP}
        runMP={runMP}
        jumpMP={jumpMP}
        plannedMovement={plannedMovement}
        planReady={planReady}
        mpCost={mpCost}
        jumpHexes={jumpHexes}
        movementHeatProfile={movementHeatProfile}
        onTypeChange={handleTypeChange}
        onFacingSelect={handleFacingSelect}
        onCommit={commitPlannedMovement}
      />
    );
  }

  if (phase === GamePhase.WeaponAttack) {
    return (
      <WeaponAttackPlanningSection
        className={className}
        selected={selected}
        attackPlan={attackPlan}
        weapons={weapons}
        selectedWeaponModes={selectedWeaponModes}
        rangeToTarget={rangeToTarget}
        combatProjectionRangeBracket={targetCombatProjection?.rangeBracket}
        attackerState={attackerState}
        targetState={targetState}
        forecastWeapons={forecastWeapons}
        forecastOpen={forecastOpen}
        events={session.events}
        previewEnabled={previewEnabled}
        onTogglePreview={setPreviewEnabled}
        onToggleWeapon={togglePlannedWeapon}
        onModeChange={setPlannedWeaponMode}
        onOpenForecast={() => setForecastOpen(true)}
        onConfirmFire={handleConfirmFire}
        onCloseForecast={() => setForecastOpen(false)}
        weaponModeError={attackPlan.weaponModeError}
      />
    );
  }

  if (phase === GamePhase.PhysicalAttack) {
    return (
      <PhysicalAttackPlanningSection
        attackerTonnage={attackerTonnage}
        attackPlan={attackPlan}
        className={className}
        onIntentChange={onPhysicalAttackIntentChange}
        selected={selected}
        selectedWeaponModes={selectedWeaponModes}
        weapons={weapons}
      />
    );
  }

  return null;
}

export default CombatPlanningPanel;
