import fs from 'node:fs';
import path from 'node:path';

import { UnitContract } from '@/types/contracts';

interface IQualifierFixture {
  source: string;
  qualifiers: Record<string, unknown>;
  armor: Record<string, unknown>;
  unit: Record<string, unknown>;
}

const { fixtures }: { fixtures: IQualifierFixture[] } = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      'scripts/__tests__/fixtures/aerospace_source_qualifiers.json',
    ),
    'utf-8',
  ),
);
const schema: {
  properties: Record<string, unknown> & {
    armor: { properties: Record<string, unknown> };
  };
} = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), 'public/data/equipment/_schema/unit-schema.json'),
    'utf-8',
  ),
);

describe('aerospace source qualifier contract (UL-06b)', () => {
  it.each(fixtures)('round-trips $source through UnitContract', (fixture) => {
    for (const key of Object.keys(fixture.qualifiers)) {
      expect(schema.properties).toHaveProperty(key);
    }
    for (const key of Object.keys(fixture.armor)) {
      expect(schema.properties.armor.properties).toHaveProperty(key);
    }
    const parsed = UnitContract.parse(fixture.unit);
    expect(parsed).toMatchObject(fixture.qualifiers);
    expect(parsed.armor).toMatchObject(fixture.armor);
    expect(JSON.parse(JSON.stringify(parsed))).toMatchObject(fixture.unit);
    expect(UnitContract.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(
      parsed,
    );
  });

  it('validates declared qualifier types and preserves zero and false', () => {
    const unit = { id: 'qualifiers', unitType: 'Aerospace' };
    expect(
      UnitContract.parse({ ...unit, omniPodHeatSinks: 0, clanEngine: false }),
    ).toMatchObject({ omniPodHeatSinks: 0, clanEngine: false });
    for (const omniPodHeatSinks of [-1, 1.5, '2']) {
      expect(
        UnitContract.safeParse({ ...unit, omniPodHeatSinks }).success,
      ).toBe(false);
    }
    expect(
      UnitContract.safeParse({
        ...unit,
        armor: {
          type: 'PATCHWORK',
          byArc: {},
          typeByArc: { NOSE: '0' },
        },
      }).success,
    ).toBe(false);
  });
});
