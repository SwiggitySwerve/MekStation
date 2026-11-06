import { BlkParserService } from '@/services/conversion/BlkParserService';

import { createAerospaceHandler } from '../AerospaceUnitHandler';
import { createConventionalFighterHandler } from '../ConventionalFighterUnitHandler';

// MegaMek 48fcb2f6 BLKAeroSpaceFighterFile.java:91-95 and
// BLKConvFighterFile.java:86-89 read the stated count without replacing zero.
function parse(family: string, count?: number) {
  const document = new BlkParserService().parse(`
<UnitType>${family}</UnitType>
<Name>Heat sink source fixture</Name>
<type>IS Level 2</type>
<year>3060</year>
<tonnage>50</tonnage>
<SafeThrust>5</SafeThrust>
<engine_type>0</engine_type>
<fuel>400</fuel>
<sink_type>0</sink_type>
${count === undefined ? '' : `<heatsinks>${count}</heatsinks>`}
<armor>10\n10\n10\n10</armor>`);
  if (!document.success) throw new Error(JSON.stringify(document.error));
  const handler =
    family === 'ConvFighter'
      ? createConventionalFighterHandler()
      : createAerospaceHandler();
  const parsed = handler.parse(document.data.document);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  return { parsed: parsed.data.unit, document: document.data.document };
}

it.each(['Aero', 'AeroSpaceFighter', 'ConvFighter'])(
  '%s retains every explicit source count, including zero',
  (family) => {
    for (const count of [0, 1, 9, 10, 20]) {
      const result = parse(family, count);
      expect(result.document.heatsinks).toBe(count);
      expect(result.parsed.heatSinks).toBe(count);
    }
  },
);

it('loads a zero-sink fighter with the existing construction diagnostic', () => {
  const { parsed } = parse('AeroSpaceFighter', 0);
  expect(parsed.heatSinks).toBe(0);
  expect(parsed.isValid).toBe(false);
  expect(parsed.validationErrors).toContain(
    'Aerospace fighters must have at least 10 heat sinks',
  );
});

it.each([
  ['Aero', 10],
  ['AeroSpaceFighter', 10],
  ['ConvFighter', 0],
] as const)(
  '%s preserves its legacy omitted-count fallback of %s',
  (family, expected) => {
    const result = parse(family);
    expect(result.document.heatsinks).toBeUndefined();
    expect(result.parsed.heatSinks).toBe(expected);
  },
);
