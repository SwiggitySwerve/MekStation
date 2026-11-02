import atlas from '../../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';
import { customCombatSnapshotSchema } from '../CustomCombatSnapshot';
import { UnitContract } from '../generated/unit.zod';

const BA_FACTS = {
  weightClass: 'MEDIUM',
  chassisType: 'BIPED',
  motionType: 'JUMP',
  squadSize: 4,
  armorPerTrooper: 9,
  manipulators: { rightArm: null, leftArm: 'BABattleClaw' },
  hasAntiPersonnelMount: true,
  hasModularWeaponMount: false,
  clanChassis: false,
  isExoskeleton: false,
  clanExoWithoutHarJel: false,
  turretSize: 3,
  hasModularTurret: true,
};

it.each(Object.entries(BA_FACTS))(
  'keeps BA %s out of the strict mech boundary',
  (key, value) => {
    const mech = UnitContract.options[0];
    expect(Object.keys(mech.shape)).not.toContain(key);
    expect(mech.strict().safeParse({ ...atlas, [key]: value }).success).toBe(
      false,
    );
    expect(Object.keys(customCombatSnapshotSchema.shape)).not.toContain(key);
  },
);

it.each(['BattleArmor', 'Battle Armor', 'BATTLEARMOR'])(
  'validates BA facts only through %s',
  (unitType) => {
    const unit = {
      id: 'ba-scope',
      unitType,
      ...BA_FACTS,
      movement: { groundMP: 1, jumpMP: 3, umuMP: 0, vtolMP: 0 },
      armor: { type: 'STANDARD', perTrooper: 9, sourceTechLevel: -1 },
      equipment: [
        {
          id: 'ba-gun',
          location: 'BODY',
          unitLocation: 'Squad',
          isDWPMounted: true,
          isSquadSupportWeapon: true,
          isAPMMounted: true,
          shots: 4,
          size: 2.5,
        },
      ],
    };
    expect(UnitContract.safeParse(unit).success).toBe(true);
    expect(UnitContract.safeParse({ ...unit, squadSize: 0 }).success).toBe(
      false,
    );
    expect(
      UnitContract.safeParse({ ...unit, movement: { vtolMP: -1 } }).success,
    ).toBe(false);
    expect(
      UnitContract.safeParse({
        ...unit,
        equipment: [{ ...unit.equipment[0], shots: -1 }],
      }).success,
    ).toBe(false);
  },
);

it('keeps nested BA source facts out of strict mech construction', () => {
  const mech = UnitContract.options[0];
  for (const [key, value] of Object.entries({
    unitLocation: 'Squad',
    isDWPMounted: true,
    isSquadSupportWeapon: true,
    isAPMMounted: true,
    shots: 4,
    size: 2.5,
  })) {
    expect(
      mech.strict().safeParse({
        ...atlas,
        equipment: [{ id: 'test', location: 'HEAD', [key]: value }],
      }).success,
    ).toBe(false);
  }
  for (const key of ['groundMP', 'jumpMP', 'umuMP', 'vtolMP']) {
    expect(
      customCombatSnapshotSchema.shape.movement.safeParse({
        walk: 3,
        jump: 0,
        [key]: 1,
      }).success,
    ).toBe(false);
  }
  expect(
    mech
      .strict()
      .safeParse({ ...atlas, armor: { ...atlas.armor, sourceTechLevel: -1 } })
      .success,
  ).toBe(false);
});

it.each(['Vehicle', 'Support Vehicle', 'DropShip', 'Infantry'])(
  'rejects BA mount and armor annotations on %s',
  (unitType) => {
    const base = { id: 'non-ba-scope', unitType };
    expect(UnitContract.safeParse(base).success).toBe(true);
    expect(
      UnitContract.safeParse({
        ...base,
        equipment: [{ id: 'gear', location: 'BODY', isAPMMounted: true }],
      }).success,
    ).toBe(false);
    expect(
      UnitContract.safeParse({
        ...base,
        armor: { type: 'STANDARD', byArc: { NOSE: 1 }, sourceTechLevel: -1 },
      }).success,
    ).toBe(false);
  },
);
