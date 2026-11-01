import fs from 'node:fs';
import path from 'node:path';

import { UnitContract } from '@/types/contracts';

interface IQualifierFixture {
  source: string;
  qualifiers: Record<string, unknown>;
  unit: Record<string, unknown>;
}

const { fixtures }: { fixtures: IQualifierFixture[] } = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      'scripts/__tests__/fixtures/vehicle_source_qualifiers.json',
    ),
    'utf-8',
  ),
);
const schema: { properties: Record<string, unknown> } = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), 'public/data/equipment/_schema/unit-schema.json'),
    'utf-8',
  ),
);

describe('vehicle source qualifier contract (UL-06a)', () => {
  it.each(fixtures)('round-trips $source through UnitContract', (fixture) => {
    // Unknown keys currently pass through. Require declared schema fields so
    // preservation also means a typed, validated cross-language contract.
    for (const key of Object.keys(fixture.qualifiers)) {
      expect(schema.properties).toHaveProperty(key);
    }
    const parsed = UnitContract.parse(fixture.unit);
    expect(
      Object.fromEntries(
        Object.keys(fixture.qualifiers).map((key) => [key, parsed[key]]),
      ),
    ).toEqual(fixture.qualifiers);
    // Existing equipment defaults are added on the first parse; every source
    // field must survive, and the resulting document must then be stable.
    expect(JSON.parse(JSON.stringify(parsed))).toMatchObject(fixture.unit);
    expect(UnitContract.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(
      parsed,
    );
  });
});
