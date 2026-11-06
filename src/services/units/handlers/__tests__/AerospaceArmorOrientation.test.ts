import { formatAerospaceArmor } from '@/services/conversion/BlkExportServiceCore.formatters';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import { AerospaceLocation } from '@/types/construction/UnitLocation';

import { createAerospaceHandler } from '../AerospaceUnitHandler';
import { createConventionalFighterHandler } from '../ConventionalFighterUnitHandler';
import { createSmallCraftHandler } from '../SmallCraftUnitHandler';

// MegaMek 48fcb2f6 BLKAeroSpaceFighterFile:63-66,186-189,
// BLKConvFighterFile:146-149 and BLKSmallCraftFile:180-183.
// Synthetic asymmetric values distinguish source indices, unlike symmetric catalog armor.
const source = (family: string, armor = [40, 21, 13, 10]) => `
<UnitType>${family}</UnitType>
<Name>Orientation fixture</Name>
<year>3060</year>
<type>IS Level 2</type>
<tonnage>100</tonnage>
<SafeThrust>5</SafeThrust>
<structural_integrity>5</structural_integrity>
<heatsinks>20</heatsinks>
<sink_type>0</sink_type>
<fuel>400</fuel>
<armor>\n${armor.join('\n')}\n</armor>`;

function document(family: string, armor?: number[]) {
  const result = new BlkParserService().parse(source(family, armor));
  if (!result.success) throw new Error(JSON.stringify(result.error));
  return result.data.document;
}

it.each(['Aero', 'AeroSpaceFighter', 'ConvFighter'])(
  '%s keeps right armor at BLK index 1 and left armor at index 2',
  (family) => {
    const doc = document(family);
    const result =
      family === 'ConvFighter'
        ? createConventionalFighterHandler().parse(doc)
        : createAerospaceHandler().parse(doc);
    if (!result.success) throw new Error(JSON.stringify(result.error));
    expect(result.data.unit.armorByArc).toEqual({
      nose: 40,
      rightWing: 21,
      leftWing: 13,
      aft: 10,
    });
    expect(result.data.unit.armor).toEqual([40, 21, 13, 10]);
    expect(result.data.unit.totalArmorPoints).toBe(84);
  },
);

it('keeps small-craft side identities and the original array', () => {
  const result = createSmallCraftHandler().parse(document('SmallCraft'));
  if (!result.success) throw new Error(JSON.stringify(result.error));
  expect(result.data.unit.armorByArc).toEqual({
    nose: 40,
    rightSide: 21,
    leftSide: 13,
    aft: 10,
  });
  expect(result.data.unit.armor).toEqual([40, 21, 13, 10]);
  expect(result.data.unit.totalArmorPoints).toBe(84);
});

const allocation = {
  [AerospaceLocation.NOSE]: 40,
  [AerospaceLocation.RIGHT_WING]: 21,
  [AerospaceLocation.LEFT_WING]: 13,
  [AerospaceLocation.AFT]: 10,
};

it('exports named wing armor in upstream source order', () => {
  expect(formatAerospaceArmor(allocation)).toBe('40\n21\n13\n10');
});

it('does not let matching reader/writer errors conceal an asymmetric round trip', () => {
  const encoded = formatAerospaceArmor(allocation);
  const result = createAerospaceHandler().parse(
    document('AeroSpaceFighter', encoded.split('\n').map(Number)),
  );
  if (!result.success) throw new Error(JSON.stringify(result.error));
  expect(result.data.unit.armor).toEqual([40, 21, 13, 10]);
  expect(result.data.unit.armorByArc).toEqual({
    nose: 40,
    rightWing: 21,
    leftWing: 13,
    aft: 10,
  });
});
