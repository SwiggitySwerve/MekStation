import { resolveVehicleVariableMass } from '../variableEquipmentMass';

// MegaMek 48fcb2f6 MiscType.java:700-730,820-842; RoundWeight.java:58-68.
it.each([
  ['mash-equipment', 'mash-equipment:size:1.0', 15, 3.5],
  ['mash-equipment', 'mash-equipment:size:3.0', 15, 5.5],
  ['dronecarriercontrolsystem', 'dronecarriercontrolsystem:size:2', 20, 3],
  ['droneoperatingsystem', 'droneoperatingsystem', 20, 2.5],
  ['boobytrap', 'boobytrap', 22, 2.5],
  ['cargo', 'cargo:size:0.1', 2, 0.1],
  ['communications-equipment', 'communications-equipment:size:0.1', 20, 0.5],
])('resolves %s from its source size once', (id, source, tonnage, expected) => {
  expect(
    resolveVehicleVariableMass({ id, weight: 0 }, source, {
      tonnage,
      engineWeight: 2,
      isSupportVehicle: true,
    }),
  ).toBe(expected);
});

it('keeps small combat components at half tons and small support at kilograms', () => {
  const item = { id: 'cargo', weight: 0 };
  expect(
    resolveVehicleVariableMass(item, 'cargo:size:0.1', {
      tonnage: 2,
      isSupportVehicle: false,
    }),
  ).toBe(0.5);
  expect(
    resolveVehicleVariableMass(item, 'cargo:size:0.1', {
      tonnage: 2,
      isSupportVehicle: true,
    }),
  ).toBe(0.1);
});

it('owns the support fire-control mass rule after the weapon basis is known', () => {
  expect(
    resolveVehicleVariableMass(
      { id: 'basic-fire-control', weight: 0 },
      'basic-fire-control',
      { tonnage: 20, isSupportVehicle: true, weaponWeight: 11 },
    ),
  ).toBe(1);
  expect(
    resolveVehicleVariableMass(
      { id: 'advanced-fire-control', weight: 0 },
      'advanced-fire-control',
      { tonnage: 20, isSupportVehicle: true, weaponWeight: 11 },
    ),
  ).toBe(1.5);
});

it('preserves fixed mass and reports an unsupported variable formula', () => {
  const context = { tonnage: 20, isSupportVehicle: true };
  expect(
    resolveVehicleVariableMass({ id: 'fixed', weight: 3 }, 'fixed', context),
  ).toBe(3);
  expect(
    resolveVehicleVariableMass(
      { id: 'unsupported', weight: 0, special: ['Variable weight'] },
      'unsupported',
      context,
    ),
  ).toBeUndefined();
});
