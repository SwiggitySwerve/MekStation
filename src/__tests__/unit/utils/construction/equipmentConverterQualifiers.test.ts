import {
  getEquipmentEntry,
  normalizeEquipmentId,
  resolveAmmoBV,
} from '@/utils/construction/equipmentBV';

describe('native converted equipment qualifiers and aliases', () => {
  it.each([
    ['cargo:SIZE:0.5', 'cargo'],
    ['communications-equipment:OMNI:SIZE:3.0', 'communications-equipment'],
    ['mash-equipment:SIZE:11.0', 'mash-equipment'],
    ['ladder:SIZE:100.0', 'ladder'],
    ['liquid-storage:SIZE:20.0', 'liquid-storage'],
    ['ISDroneCarrierControlSystem:OMNI:SIZE:6.0', 'dronecarriercontrolsystem'],
    ['lift-hoist-arresting-hoist:OMNI', 'lift-hoist-arresting-hoist'],
    ['lift-hoist-arresting-hoist:OMNI:SIZE:1.0', 'lift-hoist-arresting-hoist'],
    ['(R)ISERMediumLaser (PT):OMNI:SIZE:1.0', 'er-medium-laser'],
    ['r-machine-gunst:OMNI:SIZE:1.0', 'machine-gun'],
  ])('looks up the base identity of %s', (input, id) => {
    expect(normalizeEquipmentId(input)).toBe(id);
    expect(getEquipmentEntry(input)?.id).toBe(id);
  });

  // MiscType factories and EquipmentTypeLookup constants, pinned 48fcb2f6.
  it.each([
    ['HeavyBridgeLayer', 'bridge-layer-heavy'],
    ['Hitch', 'trailer-hitch'],
    ['PintleTurret', 'pintle-mount'],
    ['SponsonTurret', 'vehicular-sponson-turret'],
    ['Tank Sprayer', 'sprayer-vehicular'],
    ['mek-taser:OMNI', 'battlemech-taser'],
  ])('resolves native naming class %s', (input, id) => {
    for (const token of [input, input.replace(/ /g, '-')]) {
      expect(normalizeEquipmentId(token)).toBe(id);
      expect(getEquipmentEntry(token)?.id).toBe(id);
    }
  });

  it('resolves the native AP Gauss ammunition spelling in the ammo catalog', () => {
    expect(normalizeEquipmentId('clapgaussrifle-ammo:OMNI')).toBe(
      'apgaussrifle',
    );
    expect(resolveAmmoBV('clapgaussrifle-ammo:OMNI')).toMatchObject({
      resolved: true,
      battleValue: 3,
    });
    expect(normalizeEquipmentId('CLAPGaussRifle Ammo')).toBe('apgaussrifle');
    expect(getEquipmentEntry('CLAPGaussRifle Ammo')?.id).toBe('apgaussrifle');
  });

  it.each(['cargo:SIZE:bogus', 'cargo:SIZE:-1.0', 'cargo:SIZE:1.0garbage'])(
    'does not invent a catalog identity for %s',
    (input) => {
      expect(getEquipmentEntry(input)).toBeUndefined();
    },
  );
  // Pinned Java registry CLERMediumLaserPrototype, Clan Ammo LRM-15 (Clan) Artemis-capable, InfantryTAG.
  it.each([
    [
      'clermediumlaserprototype:OMNI:SIZE:1.0',
      'clermediumlaserprototype-registry',
      62,
      1.5,
      1,
    ],
    [
      'clan-ammo-lrm-15-clan-artemis-capable:OMNI',
      'clan-ammo-lrm-15-clan-artemis-capable-registry',
      21,
      1,
      1,
    ],
    ['infantrytag:SIZE:1.0', 'infantrytag-registry', 0, 0.02, 0],
  ] as const)(
    'resolves the added qualified Java variant %s',
    (input, id, battleValue, weight, criticalSlots) => {
      expect(getEquipmentEntry(input)).toMatchObject({
        id,
        battleValue,
        weight,
        criticalSlots,
      });
    },
  );
});
