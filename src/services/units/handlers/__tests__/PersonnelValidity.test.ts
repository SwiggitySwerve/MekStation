import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { IBaseUnit } from '@/types/unit/BaseUnitInterfaces';
import { IInfantry } from '@/types/unit/PersonnelInterfaces';
import { IUnitTypeHandler } from '@/types/unit/UnitTypeHandler';

import { createBattleArmorHandler } from '../BattleArmorUnitHandler';
import { createInfantryHandler } from '../InfantryUnitHandler';
import fixtures from './fixtures/personnel-validity.json';
import { createMockBlkDocument } from './InfantryUnitHandler.test-helpers';

const parser = new BlkParserService();
function load(content: string) {
  const document = parser.parse(content);
  if (!document.success) throw new Error(JSON.stringify(document.error));
  return document.data.document.unitType === 'BattleArmor'
    ? inspect(createBattleArmorHandler(), document.data.document)
    : inspect(createInfantryHandler(), document.data.document);
}
function inspect<T extends IBaseUnit>(
  handler: IUnitTypeHandler<T>,
  document: IBlkDocument,
) {
  const parsed = handler.parse(document);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  const unit = parsed.data.unit;
  return {
    unit,
    validation: handler.validate(unit),
    bv: handler.calculateBV(unit),
  };
}

it.each(fixtures.rows)('matches pinned Java validity: $path', (row) => {
  expect(createHash('sha256').update(row.content).digest('hex')).toBe(
    row.sha256,
  );
  const { unit, validation } = load(row.content);
  expect(validation.isValid).toBe(row.valid);
  if (!row.valid)
    expect(validation.errors.join('\n')).toContain(row.diagnostics);
  expect(unit.isValid).toBe(validation.isValid);
  expect(unit.validationErrors).toEqual(validation.errors);
});

it('does not compare computed BA mass to an absent fixed Tonnage tag', () => {
  const document = parser.parse(fixtures.rows[0].content);
  if (!document.success) throw new Error(JSON.stringify(document.error));
  const handler = createBattleArmorHandler();
  const parsed = handler.parse(document.data.document);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  const unit = parsed.data.unit;
  expect(unit.tonnage).toBe(0);
  expect(
    handler.validate({ ...unit, totalWeight: handler.calculateWeight(unit) })
      .isValid,
  ).toBe(true);
});

it.each<[Partial<IInfantry>, string]>([
  [{ squadSize: 11 }, 'Maximum squad size is 10'],
  [{ numberOfSquads: 6 }, 'Maximum squad count is 5'],
  [{ platoonStrength: 31 }, 'Maximum platoon size is 30'],
  [
    { secondaryWeaponCount: 3 },
    'Number of secondary weapons exceeds maximum of 2',
  ],
  [{ armorKitCount: 2 }, 'Infantry may not have more than one armor kit!'],
])('rejects edited infantry configuration %j', (changes, diagnostic) => {
  const handler = createInfantryHandler();
  const result = handler.parse(createMockBlkDocument());
  if (!result.success) throw new Error(JSON.stringify(result.error));
  expect(
    handler.validate({ ...result.data.unit, ...changes }).errors,
  ).toContain(diagnostic);
});

it('counts identical legacy and native armor kits without changing BV', () => {
  const row = fixtures.rows.find((r) => r.path.includes('Motorized AC10'))!;
  const original = load(row.content);
  const duplicate = load(
    row.content + '\n<armorKit>\nFed Suns Infantry Kit (3067+)\n</armorKit>\n',
  );
  expect(duplicate.validation.errors).toContain(
    'Infantry may not have more than one armor kit!',
  );
  expect(duplicate.bv).toBe(original.bv);
});

it('uses the armor introduction year margin and accepts an allocated NIU', () => {
  const water = fixtures.rows.find((r) => r.path.includes('Water Elemental'))!;
  expect(load(water.content.replace('2842', '2858')).validation.isValid).toBe(
    true,
  );
  expect(load(water.content.replace('2842', '2857')).validation.isValid).toBe(
    false,
  );
  const niu = fixtures.rows.find((r) => r.path.includes('Clan Interface'))!;
  expect(
    load(niu.content.replace('BABattleMechNIU', 'BABattleMechNIU:Body'))
      .validation.isValid,
  ).toBe(true);
});

// Optional full pinned corpus measurement; portable fixtures above always run in CI.
const corpus = process.env.PERSONNEL_CORPUS;
(corpus ? it : it.skip)('measures every BA and infantry source', () => {
  const rows = readFileSync(join(corpus!, 'oracle.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map(
      (line) =>
        JSON.parse(line) as {
          path: string;
          concreteFamily: string;
          construction: { valid: boolean; diagnostics: string };
        },
    )
    .filter((r) => ['BattleArmor', 'ConvInfantry'].includes(r.concreteFamily));
  const results = rows.map((r) => {
    const { validation, bv } = load(
      readFileSync(join(corpus!, 'sources', r.path), 'utf8'),
    );
    return {
      path: r.path,
      family: r.concreteFamily,
      java: r.construction.valid,
      local: validation,
      bv,
      javaDiagnostics: r.construction.diagnostics,
    };
  });
  writeFileSync(
    join(corpus!, `${process.env.PERSONNEL_PHASE}.json`),
    JSON.stringify(results, null, 2),
  );
  expect(results).toHaveLength(3008);
  if (process.env.PERSONNEL_PHASE !== 'before') {
    expect(results.filter((r) => r.java !== r.local.isValid)).toEqual([]);
    expect(
      results.filter(
        (r) =>
          !r.java &&
          !r.local.errors.join('\n').includes(r.javaDiagnostics.trim()),
      ),
    ).toEqual([]);
  }
});
