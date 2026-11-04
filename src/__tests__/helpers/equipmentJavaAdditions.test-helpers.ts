import rawRows from '../../../scripts/equipment-catalog/java-additions.json';

interface IJavaCatalogAddition {
  native: string;
  kind: string;
  source: string;
  values: Record<string, unknown>;
  java: {
    damage?: number;
    rackSize?: number;
    bv: number;
    tons: number;
    criticalSlots: number;
  };
}
export const javaCatalogAdditions: readonly IJavaCatalogAddition[] = rawRows;
export const javaCatalogAdditionById = new Map(
  javaCatalogAdditions.map((row) => [String(row.values.id), row]),
);
/**
 * Combat-runner damage a generated weapon must reach: its fixed Java damage,
 * or the pinned handler damage per hit times the Java rack size for
 * cluster-table launchers (follow-up 95). Other Java sentinels stay 0.
 */
export function javaAdditionRunnerDamage(row: IJavaCatalogAddition): number {
  const damage = row.values.damage;
  if (typeof damage === 'number') return damage;
  const perHit = /^(\d+)\/missile$/.exec(String(damage));
  return perHit ? Number(perHit[1]) * Number(row.java.rackSize) : 0;
}
/** Values come from pinned Java registry/facts; each fixture retains its native record and source citation. */
export function expectJavaCatalogAddition(
  item: unknown,
  projection?: 'bv',
): IJavaCatalogAddition {
  if (!item || typeof item !== 'object')
    throw Error('Missing generated catalog entry');
  const data = item as Record<string, unknown>;
  const row = javaCatalogAdditionById.get(String(data.id));
  if (!row)
    throw Error('Entry was not added by this generator: ' + String(data.id));
  const exposed = [
    'id',
    'name',
    'battleValue',
    'weight',
    'criticalSlots',
    'shotsPerTon',
    'techBase',
    'damage',
    'heat',
    'subType',
    'special',
    'category',
  ];
  const expected =
    projection === 'bv'
      ? Object.fromEntries(
          Object.entries(row.values).filter(([key]) => exposed.includes(key)),
        )
      : row.values;
  expect(data).toMatchObject(expected);
  expect(data.special).toEqual(expect.arrayContaining([row.source]));
  return row;
}
