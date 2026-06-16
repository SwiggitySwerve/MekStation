import type { IGameState } from '@/types/gameplay';
import type { IComponentDamageState } from '@/types/gameplay/GameSessionInterfaces';
import type { IUnitDamageState } from '@/utils/gameplay/damage';

import {
  CriticalEffectType,
  GamePhase,
  GameSide,
  GameStatus,
} from '@/types/gameplay';
import {
  applyCriticalHitEffect,
  buildDefaultCriticalSlotManifest,
  type ICriticalSlotEntry,
} from '@/utils/gameplay/criticalHitResolution';
import { resolveDamage } from '@/utils/gameplay/damage';

import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import { applyDamageResultToState } from '../SimulationRunnerState';
import { createMinimalUnitState } from '../SimulationRunnerSupport';

function createDamageState(
  overrides: Partial<IUnitDamageState> = {},
): IUnitDamageState {
  return {
    armor: {
      head: 0,
      center_torso: 0,
      left_torso: 0,
      right_torso: 0,
      left_arm: 0,
      right_arm: 0,
      left_leg: 0,
      right_leg: 0,
      center_torso_rear: 0,
      left_torso_rear: 0,
      right_torso_rear: 0,
    },
    rearArmor: {
      center_torso: 0,
      left_torso: 0,
      right_torso: 0,
    },
    structure: {
      head: 3,
      center_torso: 16,
      left_torso: 12,
      right_torso: 12,
      left_arm: 8,
      right_arm: 8,
      left_leg: 12,
      right_leg: 12,
      center_torso_rear: 16,
      left_torso_rear: 12,
      right_torso_rear: 12,
    },
    destroyedLocations: [],
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    ...overrides,
  };
}

function createGameState(): IGameState {
  return {
    gameId: 'damage-lifecycle-gap-test',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    units: {
      target: createMinimalUnitState('target', GameSide.Opponent, {
        q: 0,
        r: 0,
      }),
    },
    turnEvents: [],
  };
}

function freshComponentDamage(): IComponentDamageState {
  return {
    ...DEFAULT_COMPONENT_DAMAGE,
    actuators: {},
    weaponsDestroyed: [],
  };
}

describe('BattleMech damage lifecycle validation anchors', () => {
  it('persists fatal center-torso and head destruction as cause-specific terminal states', () => {
    const highRoller = () => 6;

    const centerTorsoKill = resolveDamage(
      createDamageState(),
      'center_torso',
      20,
      highRoller,
    );
    const headKill = resolveDamage(createDamageState(), 'head', 20, highRoller);

    expect(centerTorsoKill.result).toMatchObject({
      unitDestroyed: true,
      destructionCause: 'ct_destroyed',
    });
    expect(headKill.result).toMatchObject({
      unitDestroyed: true,
      destructionCause: 'head_destroyed',
    });

    const updated = applyDamageResultToState(
      createGameState(),
      'target',
      centerTorsoKill.state,
      centerTorsoKill.result,
    );

    expect(updated.units.target.destroyed).toBe(true);
    expect(updated.units.target.destructionCause).toBe('ct_destroyed');
  });

  it('persists explicit destruction-cause overrides from runner cascades', () => {
    const centerTorsoKill = resolveDamage(
      createDamageState(),
      'center_torso',
      20,
      () => 6,
    );

    const updated = applyDamageResultToState(
      createGameState(),
      'target',
      centerTorsoKill.state,
      {
        ...centerTorsoKill.result,
        destructionCause: 'ammo_explosion',
      },
    );

    expect(updated.units.target.destroyed).toBe(true);
    expect(updated.units.target.destructionCause).toBe('ammo_explosion');
  });

  it('clears claw and talon modifier state when damage destroys their locations', () => {
    const baseState = createGameState();
    const state: IGameState = {
      ...baseState,
      units: {
        target: {
          ...baseState.units.target,
          leftArmHasClaw: true,
          rightArmHasClaw: true,
          leftLegHasTalons: true,
          rightLegHasTalons: true,
        },
      },
    };

    const afterTorsoCascade = applyDamageResultToState(
      state,
      'target',
      createDamageState(),
      {
        locationDamages: [
          {
            location: 'left_torso',
            armorRemaining: 0,
            structureRemaining: 0,
            destroyed: true,
          },
        ],
        unitDestroyed: false,
      },
    );

    expect(afterTorsoCascade.units.target.destroyedLocations).toEqual([
      'left_torso',
      'left_arm',
    ]);
    expect(afterTorsoCascade.units.target.leftArmHasClaw).toBe(false);
    expect(afterTorsoCascade.units.target.rightArmHasClaw).toBe(true);

    const afterLegDestroyed = applyDamageResultToState(
      afterTorsoCascade,
      'target',
      createDamageState(),
      {
        locationDamages: [
          {
            location: 'right_leg',
            armorRemaining: 0,
            structureRemaining: 0,
            destroyed: true,
          },
        ],
        unitDestroyed: false,
      },
    );

    expect(afterLegDestroyed.units.target.leftLegHasTalons).toBe(true);
    expect(afterLegDestroyed.units.target.rightLegHasTalons).toBe(false);
  });

  it('documents default critical slots and mounted critical-effect boundaries', () => {
    const defaultComponentTypes = Array.from(
      new Set(
        Object.values(buildDefaultCriticalSlotManifest())
          .flat()
          .map((slot) => slot.componentType),
      ),
    ).sort();

    expect(defaultComponentTypes).toEqual([
      'actuator',
      'cockpit',
      'engine',
      'gyro',
      'life_support',
      'sensor',
    ]);

    const weaponSlot = {
      slotIndex: 0,
      componentType: 'weapon',
      componentName: 'PPC',
      destroyed: false,
      weaponId: 'ppc-0',
    } satisfies ICriticalSlotEntry;
    const heatSinkSlot = {
      slotIndex: 1,
      componentType: 'heat_sink',
      componentName: 'Heat Sink',
      destroyed: false,
    } satisfies ICriticalSlotEntry;
    const jumpJetSlot = {
      slotIndex: 2,
      componentType: 'jump_jet',
      componentName: 'Jump Jet',
      destroyed: false,
    } satisfies ICriticalSlotEntry;
    const ammoSlot = {
      slotIndex: 3,
      componentType: 'ammo',
      componentName: 'AC/20 Ammo',
      destroyed: false,
    } satisfies ICriticalSlotEntry;
    const equipmentSlot = {
      slotIndex: 4,
      componentType: 'equipment',
      componentName: 'CASE',
      destroyed: false,
    } satisfies ICriticalSlotEntry;

    const weapon = applyCriticalHitEffect(
      weaponSlot,
      'target',
      'right_torso',
      freshComponentDamage(),
    );
    const heatSink = applyCriticalHitEffect(
      heatSinkSlot,
      'target',
      'right_torso',
      freshComponentDamage(),
    );
    const jumpJet = applyCriticalHitEffect(
      jumpJetSlot,
      'target',
      'right_torso',
      freshComponentDamage(),
    );
    const ammo = applyCriticalHitEffect(
      ammoSlot,
      'target',
      'right_torso',
      freshComponentDamage(),
    );
    const equipment = applyCriticalHitEffect(
      equipmentSlot,
      'target',
      'right_torso',
      freshComponentDamage(),
    );

    expect(weapon.effect.type).toBe(CriticalEffectType.WeaponDestroyed);
    expect(weapon.updatedComponentDamage.weaponsDestroyed).toEqual(['ppc-0']);
    expect(heatSink.effect.type).toBe(CriticalEffectType.HeatSinkDestroyed);
    expect(heatSink.updatedComponentDamage.heatSinksDestroyed).toBe(1);
    expect(jumpJet.effect.type).toBe(CriticalEffectType.JumpJetDestroyed);
    expect(jumpJet.updatedComponentDamage.jumpJetsDestroyed).toBe(1);
    expect(ammo.effect.type).toBe(CriticalEffectType.AmmoExplosion);
    expect(equipment.effect).toEqual({
      type: CriticalEffectType.EquipmentDestroyed,
      equipmentDestroyed: 'CASE',
    });
    expect(equipment.updatedComponentDamage).toEqual(freshComponentDamage());
    expect(equipment.events).toContainEqual(
      expect.objectContaining({
        type: 'critical_hit_resolved',
        payload: expect.objectContaining({
          componentType: 'equipment',
          componentName: 'CASE',
          effect: 'Equipment destroyed: CASE',
        }),
      }),
    );
  });
});
