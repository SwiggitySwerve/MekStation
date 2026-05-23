import {
  declarePhysicalIntent,
  toServerIntent,
} from '@/lib/multiplayer/gameIntentMap';
import { asPhysicalPayload } from '@/lib/p2p/intentTranslationPayloads';
import {
  Facing,
  GameSide,
  type IGameIntent,
  LockState,
  MovementType,
  type IUnitGameState,
} from '@/types/gameplay';
import { PhysicalIntentSchema } from '@/types/multiplayer/Protocol';
import {
  getEligiblePhysicalAttacks,
  SUPPORTED_PHYSICAL_ATTACK_TYPES,
  SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
  type PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks';

import { PHYSICAL_WEAPON_COMBAT_SUPPORT } from '../CombatFeatureSupport';

type PhysicalWeaponSupportId = keyof typeof PHYSICAL_WEAPON_COMBAT_SUPPORT;

function unsupportedPhysicalWeaponIds(): readonly string[] {
  return Object.values(PHYSICAL_WEAPON_COMBAT_SUPPORT)
    .filter((entry) => entry.level === 'unsupported')
    .map((entry) => entry.id);
}

function makeUnit(
  id: string,
  side: GameSide,
  position = { q: 0, r: 0 },
): IUnitGameState {
  return {
    id,
    side,
    position,
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    hasRetreated: false,
    hasEjected: false,
    lockState: LockState.Pending,
    pendingPSRs: [],
    weaponsFiredThisTurn: [],
  };
}

describe('physical weapon catalog runtime boundary', () => {
  it('does not project unsupported catalog-only physical weapons as runtime attack options', () => {
    const unsupportedPhysicalWeapons = unsupportedPhysicalWeaponIds();

    expect(unsupportedPhysicalWeapons).toEqual([
      'claws',
      'flail',
      'retractable-blade',
      'talons',
      'wrecking-ball',
    ]);
    for (const weaponId of unsupportedPhysicalWeapons) {
      const supportId = weaponId as PhysicalWeaponSupportId;
      expect(SUPPORTED_PHYSICAL_ATTACK_TYPES).not.toContain(
        weaponId as PhysicalAttackType,
      );
      expect(PHYSICAL_WEAPON_COMBAT_SUPPORT[supportId]).toMatchObject({
        level: 'unsupported',
        gap: expect.stringContaining('No runtime PhysicalAttackType'),
      });
    }

    const options = getEligiblePhysicalAttacks(
      makeUnit('attacker', GameSide.Player),
      makeUnit('target', GameSide.Opponent, { q: 1, r: 0 }),
      {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        targetTonnage: 75,
        attackerRanThisTurn: true,
        attackerJumpedThisTurn: true,
        pushDestinationValid: true,
        meleeWeaponsEquipped: [
          ...SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
          ...unsupportedPhysicalWeapons,
        ] as unknown as readonly PhysicalAttackType[],
      },
    );
    const projectedAttackTypes = options.map((option) => option.attackType);

    expect(projectedAttackTypes).toEqual(
      expect.arrayContaining([...SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES]),
    );
    for (const weaponId of unsupportedPhysicalWeapons) {
      expect(projectedAttackTypes).not.toContain(weaponId);
    }
  });

  it('accepts every runtime physical attack type through the intent and wire validators', () => {
    for (const attackType of SUPPORTED_PHYSICAL_ATTACK_TYPES) {
      const intent = declarePhysicalIntent('peer-1', {
        attackerId: 'attacker',
        targetId: 'target',
        attackType,
      });
      const wire = toServerIntent(intent);

      expect(wire).toEqual({
        kind: 'Physical',
        attackerId: 'attacker',
        targetId: 'target',
        attackType,
      });
      expect(
        asPhysicalPayload({
          attackerId: 'attacker',
          targetId: 'target',
          attackType,
        }),
      ).toMatchObject({ attackType });
      expect(PhysicalIntentSchema.safeParse(wire).success).toBe(true);
    }
  });

  it('rejects unsupported catalog-only physical weapons before they reach runtime action dispatch', () => {
    for (const weaponId of unsupportedPhysicalWeaponIds()) {
      const intent: IGameIntent = {
        type: 'declarePhysical',
        authorPeerId: 'peer-1',
        payload: {
          attackerId: 'attacker',
          targetId: 'target',
          attackType: weaponId,
        },
      };
      const wirePayload = {
        kind: 'Physical',
        attackerId: 'attacker',
        targetId: 'target',
        attackType: weaponId,
      };

      expect(toServerIntent(intent)).toBeNull();
      expect(asPhysicalPayload(intent.payload)).toBeNull();
      expect(PhysicalIntentSchema.safeParse(wirePayload).success).toBe(false);
    }
  });
});
