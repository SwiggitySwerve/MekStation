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
  IHexCoordinate,
  ITargetState,
} from '@/types/gameplay';
import type { IForecastInput } from '@/utils/gameplay/toHit/forecast';

import { useGameplayStore, useSelectedUnit } from '@/stores/useGameplayStore';
import { Facing, GamePhase, MovementType } from '@/types/gameplay';
import { hexDistance } from '@/utils/gameplay/hexMath';

import { CommitMoveButton } from './CommitMoveButton';
import { FacingPicker } from './FacingPicker';
import { MovementTypeSwitcher } from './MovementTypeSwitcher';
import { ToHitForecastModal } from './ToHitForecastModal';
import { WeaponSelector } from './WeaponSelector';

export interface CombatPlanningPanelProps {
  /** Walk MP for the currently selected unit (provided by parent). */
  walkMP?: number;
  /** Jump MP for the currently selected unit (provided by parent). */
  jumpMP?: number;
  /**
   * Weapons mounted on the currently selected unit (provided by
   * parent). Sourced from the unit's catalog data.
   */
  weapons?: readonly IWeapon[];
  /** Optional className */
  className?: string;
}

/**
 * Map a weapon catalog entry to the `IForecastInput` shape the
 * `buildToHitForecast` helper expects. Stays in this component so we
 * don't pull catalog-knowledge into the pure forecast util.
 */
function weaponToForecastInput(weapon: IWeapon): IForecastInput {
  return {
    weaponId: weapon.id,
    weaponName: weapon.name,
    minRange: weapon.minRange,
    shortRange: weapon.shortRange,
    mediumRange: weapon.mediumRange,
    longRange: weapon.longRange,
  };
}

export function CombatPlanningPanel({
  walkMP = 0,
  jumpMP = 0,
  weapons = [],
  className = '',
}: CombatPlanningPanelProps): React.ReactElement | null {
  // Reasoning: each of these reads is a primitive selector so Zustand
  // can short-circuit re-renders unless the specific slice changes.
  const session = useGameplayStore((s) => s.session);
  const plannedMovement = useGameplayStore((s) => s.plannedMovement);
  const attackPlan = useGameplayStore((s) => s.attackPlan);
  const setPlannedMovement = useGameplayStore((s) => s.setPlannedMovement);
  const clearPlannedMovement = useGameplayStore((s) => s.clearPlannedMovement);
  const commitPlannedMovement = useGameplayStore(
    (s) => s.commitPlannedMovement,
  );
  const togglePlannedWeapon = useGameplayStore((s) => s.togglePlannedWeapon);
  const commitAttack = useGameplayStore((s) => s.commitAttack);

  // The orphan we're now wiring in — projects { id, unit, state } in
  // one shot for the currently selected unit.
  const selected = useSelectedUnit();

  const [forecastOpen, setForecastOpen] = useState(false);

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
      if (selected) {
        setPlannedMovement({
          destination: selected.state.position,
          facing: selected.state.facing,
          movementType: type,
          path: [],
        });
      }
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
    if (!plannedMovement || !selected) return false;
    const samePos =
      plannedMovement.destination.q === selected.state.position.q &&
      plannedMovement.destination.r === selected.state.position.r;
    return !samePos;
  }, [plannedMovement, selected]);

  const movementType = plannedMovement?.movementType ?? MovementType.Walk;
  const mpCost = plannedMovement?.path.length ?? 0;
  const jumpHexes = movementType === MovementType.Jump ? mpCost : undefined;

  // ---------------------------------------------------------------------------
  // Attack-phase callbacks + derived state
  // ---------------------------------------------------------------------------

  /**
   * Range from the attacker (selected unit) to the target. Returns 0
   * when either side is missing — out-of-range badges then fall back
   * to inert defaults.
   */
  const rangeToTarget = useMemo(() => {
    if (!selected || !attackPlan.targetUnitId || !session) return 0;
    const targetState = session.currentState.units[attackPlan.targetUnitId];
    if (!targetState) return 0;
    return hexDistance(
      selected.state.position as IHexCoordinate,
      targetState.position as IHexCoordinate,
    );
  }, [selected, attackPlan.targetUnitId, session]);

  /**
   * Build the IAttackerState the forecast modal needs from the
   * selected unit's live state + their `IGameUnit.gunnery`.
   */
  const attackerState: IAttackerState | null = useMemo(() => {
    if (!selected) return null;
    return {
      gunnery: selected.unit.gunnery,
      movementType: selected.state.movementThisTurn,
      heat: selected.state.heat,
      damageModifiers: [],
    };
  }, [selected]);

  const targetState: ITargetState | null = useMemo(() => {
    if (!attackPlan.targetUnitId || !session) return null;
    const t = session.currentState.units[attackPlan.targetUnitId];
    if (!t) return null;
    return {
      movementType: t.movementThisTurn,
      hexesMoved: t.hexesMovedThisTurn,
      prone: t.prone ?? false,
      immobile: false,
      partialCover: false,
    };
  }, [attackPlan.targetUnitId, session]);

  const forecastWeapons = useMemo(
    () =>
      weapons
        .filter((w) => attackPlan.selectedWeapons.includes(w.id))
        .map(weaponToForecastInput),
    [weapons, attackPlan.selectedWeapons],
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
      <section
        className={`bg-surface-base flex flex-col gap-3 border-t border-gray-200 p-3 ${className}`}
        aria-label="Movement planning"
        data-testid="combat-planning-panel-movement"
      >
        <MovementTypeSwitcher
          active={movementType}
          walkMP={walkMP}
          jumpMP={jumpMP}
          onChange={handleTypeChange}
        />
        <FacingPicker
          selected={plannedMovement?.facing ?? null}
          onSelect={handleFacingSelect}
        />
        <CommitMoveButton
          ready={planReady && plannedMovement?.facing !== undefined}
          mpCost={mpCost}
          movementType={movementType}
          jumpHexes={jumpHexes}
          onCommit={commitPlannedMovement}
        />
      </section>
    );
  }

  if (phase === GamePhase.WeaponAttack) {
    const ammoMap: Record<string, number> = {};
    for (const w of weapons) {
      // Energy weapons (-1 ammo per ton) treated as unlimited; ammo
      // weapons read from the unit's live ammo record.
      ammoMap[w.id] = selected.state.ammo[w.id] ?? -1;
    }
    const previewEnabled =
      attackPlan.targetUnitId !== null &&
      attackPlan.selectedWeapons.length > 0 &&
      attackerState !== null &&
      targetState !== null;

    return (
      <section
        className={`bg-surface-base flex flex-col gap-3 border-t border-gray-200 p-3 ${className}`}
        aria-label="Attack planning"
        data-testid="combat-planning-panel-attack"
      >
        <WeaponSelector
          weapons={weapons}
          rangeToTarget={rangeToTarget}
          selectedWeaponIds={attackPlan.selectedWeapons}
          ammo={ammoMap}
          onToggle={togglePlannedWeapon}
        />
        <button
          type="button"
          onClick={() => setForecastOpen(true)}
          disabled={!previewEnabled}
          className={`min-h-[44px] rounded px-4 py-2 font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
            previewEnabled
              ? 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
              : 'cursor-not-allowed bg-gray-300 text-gray-500'
          }`}
          data-testid="preview-forecast-button"
        >
          Preview Forecast
        </button>
        {attackerState && targetState && (
          <ToHitForecastModal
            open={forecastOpen}
            attacker={attackerState}
            target={targetState}
            range={rangeToTarget}
            weapons={forecastWeapons}
            onConfirm={handleConfirmFire}
            onClose={() => setForecastOpen(false)}
          />
        )}
      </section>
    );
  }

  return null;
}

export default CombatPlanningPanel;
