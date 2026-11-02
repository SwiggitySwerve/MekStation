import { BlkParserService } from '@/services/conversion/BlkParserService';

import { createInfantryHandler } from '../InfantryUnitHandler';

const parser = new BlkParserService();
const handler = createInfantryHandler();
// 7 troopers x 4 squads = a platoon of 28.
const validate = (mounts: string) => {
  const parsed = parser.parse(
    `<UnitType>Infantry</UnitType><Name>Field Gun Platoon</Name><year>3067</year><type>IS Level 2</type><motion_type>Leg</motion_type><squad_size>7</squad_size><squadn>4</squadn><Primary>InfantryAssaultRifle</Primary><Field Guns Equipment>${mounts}</Field Guns Equipment>`,
  );
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  const loaded = handler.parse(parsed.data.document);
  if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
  return handler.validate(loaded.data.unit);
};

// TestInfantry.java:295-299 (48fcb2f64): all guns' crew against the platoon.
it('accepts source field guns whose crew fits the platoon but not one squad', () => {
  const result = validate('Autocannon/10\nIS Ammo AC/10\nAutocannon/10');
  expect(result.errors).toEqual([]);
  expect(result.isValid).toBe(true);
});

it('rejects source field guns whose crew exceeds the platoon', () => {
  const result = validate(
    'Autocannon/10\nAutocannon/10\nAutocannon/10\nIS Ammo AC/10',
  );
  expect(result.errors).toEqual([
    'Insufficient troopers to operate the field guns!',
  ]);
});
