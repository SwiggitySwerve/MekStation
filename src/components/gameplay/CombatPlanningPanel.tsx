/**
 * CombatPlanningPanel
 *
 * Per `add-combat-phase-ui-flows`: the wrapper component the gameplay
 * page mounts during the Movement and PhysicalAttack phases. It pulls
 * the in-progress plans (`plannedMovement` / `attackPlan`) from
 * `useGameplayStore` and stitches together:
 *
 *   - Movement phase: MovementTypeSwitcher + FacingPicker + CommitMoveButton
 *     (plus the existing MovementHeatPreview chip, wired through
 *     CommitMoveButton).
 *   - Physical-attack phase: PhysicalAttackPlanningSection.
 *
 * WEAPON-ATTACK CONTENT REMOVED (change `attack-phase-intent-composer`,
 * ADR 0002 D9 full replacement): the Attack Intent Composer hosted in the
 * TacticalActionDock is the SOLE weapon-attack declaration surface
 * (Single Attack Authority). The panel renders nothing during the
 * weapon-attack phase — the legacy WeaponSelector / Preview-Forecast /
 * ToHitForecastModal confirm flow is absorbed by the composer's palette,
 * forecast columns, and explicit Fire.
 *
 * Uses `useSelectedUnit` (the previously-orphaned derived selector
 * from `useGameplayStore`) to project the currently-selected unit's
 * `IGameUnit` + `IUnitGameState` in one shot — avoids the prior
 * pattern where panels tracked the id and re-derived the unit + state
 * separately.
 */

import React, { useCallback, useMemo } from 'react';

import type { IWeapon } from '@/simulation/ai/types';
import type { MovementHeatProfile } from '@/types/gameplay';

import {
  useGameplaySelector,
  useSelectedUnit,
} from '@/stores/useGameplayStore';
import { Facing, GamePhase, MovementType } from '@/types/gameplay';

import type { PhysicalAttackIntent } from './PhysicalAttackPanel';

import {
  createMovementPlan,
  isMovementPlanReady,
  movementPlanMetrics,
  selectedWeaponModesForUnit,
} from './CombatPlanningPanel.model';
import {
  MovementPlanningSection,
  PhysicalAttackPlanningSection,
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
  const weaponModesByUnitId = useGameplaySelector((s) => s.weaponModesByUnitId);
  const setPlannedMovement = useGameplaySelector((s) => s.setPlannedMovement);
  const clearPlannedMovement = useGameplaySelector(
    (s) => s.clearPlannedMovement,
  );
  const commitPlannedMovement = useGameplaySelector(
    (s) => s.commitPlannedMovement,
  );

  // The orphan we're now wiring in — projects { id, unit, state } in
  // one shot for the currently selected unit.
  const selected = useSelectedUnit();

  const selectedWeaponModes = selectedWeaponModesForUnit(
    weaponModesByUnitId,
    selected,
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

  // Single Attack Authority (attack-phase-intent-composer, D9): the
  // weapon-attack phase renders NOTHING here — the Attack Intent Composer
  // in the tactical dock is the sole declaration surface, and no second
  // surface may mutate the attack plan or commit declarations.
  if (phase === GamePhase.WeaponAttack) {
    return null;
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
