/**
 * PhysicalAttackPanel
 *
 * Per `add-physical-attack-phase-ui`: sibling panel to
 * `CombatPlanningPanel` that the gameplay page mounts during the
 * `GamePhase.PhysicalAttack` phase. Sister panel rather than a child
 * because the brief explicitly scopes us out of editing
 * `CombatPlanningPanel`.
 *
 * Responsibilities:
 *  - List adjacent enemy targets (hex distance == 1) the selected
 *    friendly unit can melee this turn.
 *  - Render `PhysicalAttackTypePicker` so the player can pick punch /
 *    kick / charge / DFA / hatchet / sword / mace.
 *  - Open `PhysicalAttackForecastModal` on "Preview Forecast", and
 *    commit the chosen attack via the dedicated
 *    `usePhysicalAttackPlanStore` (which calls the engine's
 *    `declarePhysicalAttack`).
 *  - On commit, push the updated session back into
 *    `useGameplayStore` so token state, event log, etc. update in
 *    one render.
 */

import React, { useCallback, useMemo, useState } from 'react';

import type {
  IPhysicalAttackInput,
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

import { PhysicalAttackForecastModal } from './PhysicalAttackForecastModal';
import { PhysicalAttackTypePicker } from './PhysicalAttackTypePicker';

export interface PhysicalAttackPanelProps {
  /** Tonnage of the selected attacker (forwarded to the engine helpers). */
  attackerTonnage?: number;
  /** Optional list of melee weapons the attacker has equipped. */
  meleeWeaponsEquipped?: readonly PhysicalAttackType[];
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

export function PhysicalAttackPanel({
  attackerTonnage = 65,
  meleeWeaponsEquipped,
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
   * Build the `IPhysicalAttackInput` the picker + modal both consume.
   * Memoized on the attacker + plan so the modal doesn't recompute
   * per render.
   */
  const attackInput = useMemo<IPhysicalAttackInput | null>(() => {
    if (!selected) return null;
    return {
      attackerTonnage,
      pilotingSkill: selected.unit.piloting,
      componentDamage: selected.state.componentDamage ?? EMPTY_DAMAGE,
      attackType: physicalAttackPlan.attackType ?? 'punch',
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
    },
    [setPhysicalAttackTarget],
  );

  const handleSelectType = useCallback(
    (attackType: PhysicalAttackType) => {
      setPhysicalAttackType(attackType);
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
    if (next) setSession(next);
    setForecastOpen(false);
  }, [
    interactiveSession,
    selected,
    commitPhysicalAttack,
    setSession,
    attackerTonnage,
  ]);

  const handleSkip = useCallback(() => {
    clearPhysicalAttackPlan();
    setForecastOpen(false);
  }, [clearPhysicalAttackPlan]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!session || !selected) return null;
  if (phase !== GamePhase.PhysicalAttack) return null;

  const previewEnabled =
    physicalAttackPlan.targetUnitId !== null &&
    physicalAttackPlan.attackType !== null &&
    attackInput !== null;

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
          Pick an adjacent enemy and a melee attack type.
        </p>
      </header>

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

      {attackInput && (
        <PhysicalAttackTypePicker
          selected={physicalAttackPlan.attackType}
          attackerTonnage={attackerTonnage}
          pilotingSkill={selected.unit.piloting}
          componentDamage={selected.state.componentDamage ?? EMPTY_DAMAGE}
          heat={selected.state.heat}
          attackerProne={selected.state.prone}
          weaponsFiredFromLeftArm={selected.state.weaponsFiredThisTurn}
          weaponsFiredFromRightArm={selected.state.weaponsFiredThisTurn}
          meleeWeaponsEquipped={meleeWeaponsEquipped}
          canCharge={false}
          canDFA={false}
          onSelect={handleSelectType}
        />
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setForecastOpen(true)}
          disabled={!previewEnabled}
          className={`min-h-[44px] flex-1 rounded px-4 py-2 font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
            previewEnabled
              ? 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
              : 'cursor-not-allowed bg-gray-300 text-gray-500'
          }`}
          data-testid="physical-attack-preview-button"
        >
          Preview Forecast
        </button>
        <button
          type="button"
          onClick={handleSkip}
          className="bg-surface-deep text-text-theme-primary hover:bg-surface-base min-h-[44px] rounded px-4 py-2 font-medium focus:ring-2 focus:ring-offset-2 focus:outline-none"
          data-testid="physical-attack-skip-button"
        >
          Skip
        </button>
      </div>

      {attackInput && (
        <PhysicalAttackForecastModal
          open={forecastOpen}
          attackInput={attackInput}
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
