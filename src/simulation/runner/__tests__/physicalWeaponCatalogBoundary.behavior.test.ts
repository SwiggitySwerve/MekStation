import {
  declarePhysicalIntent,
  toServerIntent,
} from '@/lib/multiplayer/gameIntentMap';
import { asPhysicalPayload } from '@/lib/p2p/intentTranslationPayloads';
import { PHYSICAL_WEAPON_DEFINITIONS } from '@/types/equipment/PhysicalWeaponTypes';
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

import officialPhysicalWeaponCatalog from '../../../../public/data/equipment/official/weapons/physical.json';
import { PHYSICAL_WEAPON_COMBAT_SUPPORT } from '../CombatFeatureSupport';

type PhysicalWeaponSupportId = keyof typeof PHYSICAL_WEAPON_COMBAT_SUPPORT;

const MODIFIER_ONLY_PHYSICAL_WEAPON_IDS = ['claws', 'talons'] as const;

function sorted(values: readonly string[]): readonly string[] {
  return [...values].sort();
}

function officialPhysicalWeaponIds(): readonly string[] {
  return sorted(officialPhysicalWeaponCatalog.items.map((item) => item.id));
}

function constructionPhysicalWeaponIds(): readonly string[] {
  return sorted(
    PHYSICAL_WEAPON_DEFINITIONS.map((definition) =>
      definition.type.toLowerCase().replace(/\s+/g, '-'),
    ),
  );
}

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
  it('partitions every official physical weapon into a runtime attack or modifier helper', () => {
    const officialIds = officialPhysicalWeaponIds();
    const modifierOnlyIds = sorted([...MODIFIER_ONLY_PHYSICAL_WEAPON_IDS]);
    const modifierOnlyIdSet = new Set<string>(modifierOnlyIds);
    const standaloneAttackIds = officialIds.filter(
      (id) => !modifierOnlyIdSet.has(id),
    );

    expect(officialPhysicalWeaponCatalog.count).toBe(
      officialPhysicalWeaponCatalog.items.length,
    );
    expect(constructionPhysicalWeaponIds()).toEqual(officialIds);
    expect(Object.keys(PHYSICAL_WEAPON_COMBAT_SUPPORT).sort()).toEqual(
      officialIds,
    );
    expect(sorted([...SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES])).toEqual(
      standaloneAttackIds,
    );
    expect(
      Object.values(PHYSICAL_WEAPON_COMBAT_SUPPORT)
        .filter((entry) => entry.level !== 'integrated')
        .map((entry) => entry.id),
    ).toEqual([]);
    expect(unsupportedPhysicalWeaponIds()).toEqual([]);
  });

  it('projects all standalone official physical weapons but not modifier-only equipment', () => {
    const unsupportedPhysicalWeapons = unsupportedPhysicalWeaponIds();
    const modifierOnlyPhysicalWeapons = sorted([
      ...MODIFIER_ONLY_PHYSICAL_WEAPON_IDS,
    ]);

    expect(unsupportedPhysicalWeapons).toEqual([]);
    for (const weaponId of SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES) {
      const supportId = weaponId as PhysicalWeaponSupportId;
      expect(SUPPORTED_PHYSICAL_ATTACK_TYPES).toContain(weaponId);
      expect(PHYSICAL_WEAPON_COMBAT_SUPPORT[supportId]).toMatchObject({
        level: 'integrated',
      });
    }
    expect(modifierOnlyPhysicalWeapons).toEqual(['claws', 'talons']);
    expect(PHYSICAL_WEAPON_COMBAT_SUPPORT.claws).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('claw-equipment-lifecycle'),
    });
    expect(PHYSICAL_WEAPON_COMBAT_SUPPORT.talons).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('talon-equipment-lifecycle'),
    });

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
          ...modifierOnlyPhysicalWeapons,
        ] as unknown as readonly PhysicalAttackType[],
      },
    );
    const projectedAttackTypes = options.map((option) => option.attackType);

    expect(projectedAttackTypes).toEqual(
      expect.arrayContaining([...SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES]),
    );
    for (const weaponId of modifierOnlyPhysicalWeapons) {
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

  it('rejects modifier-only physical equipment before runtime action dispatch', () => {
    for (const weaponId of MODIFIER_ONLY_PHYSICAL_WEAPON_IDS) {
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
