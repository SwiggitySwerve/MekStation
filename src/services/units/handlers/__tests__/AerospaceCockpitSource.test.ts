import { createHash } from 'node:crypto';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { AerospaceCockpitType } from '@/types/unit/AerospaceInterfaces';
import { calculateAerospaceBVFromUnit } from '@/utils/construction/aerospace/aerospaceBVUnitAdapter';

import { createAerospaceHandler } from '../AerospaceUnitHandler';
import { createConventionalFighterHandler } from '../ConventionalFighterUnitHandler';
import { createSmallCraftHandler } from '../SmallCraftUnitHandler';
import fixtures from './fixtures/aerospace-cockpit-source.json';

function document(text: string) {
  const parsed = new BlkParserService().parse(text);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  return parsed.data.document;
}

function source(family: string, code?: number) {
  return `<UnitType>${family}</UnitType>
<Name>Cockpit source fixture</Name><type>IS Level 2</type><year>3060</year>
<tonnage>${family === 'SmallCraft' ? 200 : 50}</tonnage>
<SafeThrust>5</SafeThrust><structural_integrity>10</structural_integrity>
<heatsinks>10</heatsinks><sink_type>0</sink_type><fuel>400</fuel>
<engine_type>0</engine_type><armor>10\n10\n10\n10</armor>
${code === undefined ? '' : `<cockpit_type>${code}</cockpit_type>`}`;
}

function fighter(text: string) {
  const parsedDocument = document(text);
  const handler = createAerospaceHandler();
  const parsed = handler.parse(parsedDocument);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  return { document: parsedDocument, unit: parsed.data.unit, handler };
}

// MegaMek 48fcb2f6 Aero.java:106-109; BLKAeroSpaceFighterFile.java:128-130.
describe.each(['Aero', 'AeroSpaceFighter'])(
  '%s native cockpit source codes',
  (family) => {
    it.each([
      [0, AerospaceCockpitType.STANDARD],
      [1, AerospaceCockpitType.SMALL],
      [2, AerospaceCockpitType.COMMAND_CONSOLE],
      [3, AerospaceCockpitType.PRIMITIVE],
    ] as const)(
      'preserves code %i as %s through the public boundary',
      (code, expected) => {
        const parsed = fighter(source(family, code));
        expect(parsed.document.cockpitType).toBe(code);
        expect(parsed.unit.cockpitType).toBe(expected);
      },
    );

    it.each([undefined, 99])(
      'retains the existing default for code %s',
      (code) => {
        expect(fighter(source(family, code)).unit.cockpitType).toBe(
          AerospaceCockpitType.STANDARD,
        );
      },
    );
  },
);

it.each(fixtures.fixtures)(
  'loads the original cockpit facts for $path',
  (fixture) => {
    expect(
      createHash('sha256')
        .update(Buffer.from(fixture.blk, 'utf8'))
        .digest('hex'),
    ).toBe(fixture.sha256);
    const parsed = fighter(fixture.blk);
    expect(parsed.document.cockpitType).toBe(fixture.cockpitCode);
    expect(parsed.unit.cockpitType).toBe(
      fixture.cockpitCode === 2
        ? AerospaceCockpitType.COMMAND_CONSOLE
        : AerospaceCockpitType.PRIMITIVE,
    );
  },
);

// AeroBVCalculator.java:165-175: console/small qualify; primitive does not.
it.each([
  [0, 1],
  [1, 0.95],
  [2, 0.95],
  [3, 1],
] as const)(
  'passes code %i to the existing BV summary owner',
  (code, expected) => {
    const parsed = fighter(source('AeroSpaceFighter', code));
    const breakdown = calculateAerospaceBVFromUnit(parsed.unit);
    expect(breakdown).toHaveProperty('summaryModifier', expected);
    expect(parsed.handler.calculateBV(parsed.unit)).toBe(breakdown.final);
  },
);

it.each([
  [0, AerospaceCockpitType.STANDARD],
  [1, AerospaceCockpitType.SMALL],
  [2, AerospaceCockpitType.PRIMITIVE],
  [3, AerospaceCockpitType.STANDARD],
] as const)(
  'preserves conventional-fighter compatibility for code %i',
  (code, expected) => {
    const parsed = createConventionalFighterHandler().parse(
      document(source('ConvFighter', code)),
    );
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    expect(parsed.data.unit.cockpitType).toBe(expected);
  },
);

it.each([0, 1, 2, 3])(
  'preserves SmallCraft handling of cockpit code %i',
  (code) => {
    const parsed = createSmallCraftHandler().parse(
      document(source('SmallCraft', code)),
    );
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    expect(parsed.data.unit).not.toHaveProperty('cockpitType');
  },
);
