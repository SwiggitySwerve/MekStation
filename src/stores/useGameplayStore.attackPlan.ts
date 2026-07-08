import type { WeaponFireMode } from '@/types/gameplay';

import { GamePhase } from '@/types/gameplay';
import { isIndirectFireCapable } from '@/utils/gameplay/indirectFire';

import type { GetFn, SetFn } from './useGameplayStore.combatFlowTypes';

import { InteractivePhase } from './useGameplayStore.helpers';
import { allowIntentInPhase } from './useGameplayStore.phaseGuard';

export function setAttackTargetLogic(unitId: string | null, set: SetFn): void {
  set((state) => ({
    attackPlan: { ...state.attackPlan, targetUnitId: unitId },
    ui: { ...state.ui, targetUnitId: unitId },
  }));
}

export function togglePlannedWeaponLogic(weaponId: string, set: SetFn): void {
  set((state) => {
    const current = state.attackPlan.selectedWeapons;
    const next = current.includes(weaponId)
      ? current.filter((id) => id !== weaponId)
      : [...current, weaponId];
    return {
      attackPlan: { ...state.attackPlan, selectedWeapons: next },
    };
  });
}

export function clearAttackPlanLogic(set: SetFn): void {
  set((state) => ({
    attackPlan: {
      targetUnitId: null,
      selectedWeapons: [],
      weaponModeError: null,
    },
    ui: { ...state.ui, targetUnitId: null },
  }));
}

export function setPlannedWeaponModeLogic(
  weaponId: string,
  mode: WeaponFireMode,
  set: SetFn,
): void {
  set((state) => {
    const selectedUnitId = state.ui.selectedUnitId;
    if (!selectedUnitId) {
      return {
        attackPlan: {
          ...state.attackPlan,
          weaponModeError: 'Select a unit before changing weapon mode',
        },
      };
    }

    const unitModes = state.weaponModesByUnitId[selectedUnitId] ?? {};
    const unitWeapons = state.unitWeapons[selectedUnitId] ?? [];
    const weaponName =
      unitWeapons.find((weapon) => weapon.id === weaponId)?.name ?? weaponId;

    if (mode === 'Indirect' && !isIndirectFireCapable(weaponId)) {
      return {
        attackPlan: {
          ...state.attackPlan,
          weaponModeError: `${weaponName} cannot fire indirectly`,
        },
        weaponModesByUnitId: {
          ...state.weaponModesByUnitId,
          [selectedUnitId]: {
            ...unitModes,
            [weaponId]: 'Direct',
          },
        },
      };
    }

    return {
      attackPlan: {
        ...state.attackPlan,
        weaponModeError: null,
      },
      weaponModesByUnitId: {
        ...state.weaponModesByUnitId,
        [selectedUnitId]: {
          ...unitModes,
          [weaponId]: mode,
        },
      },
    };
  });
}

/**
 * Apply the planned attack via the interactive session (emits
 * `AttackDeclared` + `AttackLocked`) and clear the plan. No-op when
 * any required slice is missing.
 */
export function commitAttackLogic(get: GetFn, set: SetFn): void {
  const { interactiveSession, attackPlan, session, ui } = get();
  if (
    !interactiveSession ||
    !ui.selectedUnitId ||
    !attackPlan.targetUnitId ||
    attackPlan.selectedWeapons.length === 0
  ) {
    return;
  }
  const currentPhase =
    session?.currentState.phase ?? interactiveSession.getState().phase;
  if (
    !allowIntentInPhase({
      currentPhase,
      requiredPhase: GamePhase.WeaponAttack,
      intent: 'attack',
    })
  ) {
    return;
  }

  interactiveSession.applyAttack(
    ui.selectedUnitId,
    attackPlan.targetUnitId,
    attackPlan.selectedWeapons,
    get().weaponModesByUnitId[ui.selectedUnitId] ?? {},
  );

  const gameOver = interactiveSession.isGameOver();

  set((state) => ({
    session: interactiveSession.getSession(),
    interactivePhase: gameOver
      ? InteractivePhase.GameOver
      : InteractivePhase.SelectUnit,
    attackPlan: {
      targetUnitId: null,
      selectedWeapons: [],
      weaponModeError: null,
    },
    validTargetIds: [],
    hitChance: null,
    ui: {
      ...state.ui,
      selectedUnitId: null,
      targetUnitId: null,
      queuedWeaponIds: [],
    },
  }));
}
