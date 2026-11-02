import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import {
  getUnitTypeRegistry,
  UnitTypeRegistry,
} from '@/services/units/UnitTypeRegistry';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { validateFixedWingSupport } from '@/utils/construction/aerospace/fixedWingSupport';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';

import { createConventionalFighterHandler } from '../ConventionalFighterUnitHandler';
import { initializeUnitTypeHandlers } from '../initializeHandlers';
import fixtures from './fixtures/fixed-wing-support.json';

beforeAll(() => initializeUnitTypeHandlers());
const parser = new BlkParserService();
it.each(fixtures.rows)('loads and validates native FWS: $path', (row) => {
  expect(createHash('sha256').update(row.content).digest('hex')).toBe(
    row.sha256,
  );
  const document = parser.parse(row.content);
  if (!document.success) throw new Error(row.path);
  const handler = getUnitTypeRegistry().getHandlerForDocument(
    document.data.document,
  )!;
  const parsed = handler.parse(document.data.document);
  expect(parsed.success).toBe(true);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  expect(handler.displayName).toBe('Fixed-Wing Support');
  const result = handler.validate(parsed.data.unit);
  expect(result.isValid).toBe(row.valid);
  if (row.reason) expect(result.errors.join('\n')).toContain(row.reason);
  expect(parsed.data.unit.isValid).toBe(result.isValid);
  const dispatched = calculateBattleValueForUnit(parsed.data.unit);
  expect(dispatched?.kind).toBe('aerospace');
  if (dispatched?.kind !== 'aerospace') throw new Error('Wrong dispatcher');
  expect(dispatched.breakdown.subTypeMultiplier).toBe(1);
  expect(handler.calculateBV(parsed.data.unit)).toBe(
    dispatched.breakdown.final,
  );
});
const evidence = process.env.FWS_EVIDENCE;
(evidence ? it : it.skip)(
  'compares the real source corpus and records dispatcher BV',
  () => {
    const root = readFileSync(
      join(evidence!, 'sources-path.txt'),
      'utf8',
    ).trim();
    const families = [
      'ProtoMek',
      'AeroSpaceFighter',
      'ConvFighter',
      'SmallCraft',
      'FixedWingSupport',
      'Dropship',
      'Jumpship',
      'Warship',
      'SpaceStation',
    ];
    const oracle = readFileSync(join(evidence!, 'oracle.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map(
        (line) =>
          JSON.parse(line) as {
            path: string;
            sha256: string;
            concreteFamily: string;
            construction: { valid: boolean; diagnostics: string };
            battleValue: { total: number };
          },
      )
      .filter((row) => families.includes(row.concreteFamily));
    const rows = oracle.map((row) => {
      const content = readFileSync(join(root, row.path), 'utf8').replace(
        /\r\n/g,
        '\n',
      );
      expect(createHash('sha256').update(content).digest('hex')).toBe(
        row.sha256,
      );
      const document = parser.parse(content);
      if (!document.success) throw new Error(row.path);
      const handler = getUnitTypeRegistry().getHandlerForDocument(
        document.data.document,
      )!;
      const parsed = handler.parse(document.data.document);
      const bv = parsed.success ? handler.calculateBV(parsed.data.unit) : null;
      return {
        path: row.path,
        family: row.concreteFamily,
        java: row.construction.valid,
        javaDiagnostics: row.construction.diagnostics,
        javaBV: row.battleValue.total,
        loaded: parsed.success,
        local: parsed.success
          ? handler.validate(parsed.data.unit)
          : parsed.error,
        bv,
        handler: handler.displayName,
      };
    });
    writeFileSync(
      join(evidence!, `${process.env.FWS_PHASE}.json`),
      JSON.stringify(rows, null, 2),
    );
    expect(rows).toHaveLength(1100);
    if (process.env.FWS_PHASE === 'after') {
      const before = JSON.parse(
        readFileSync(join(evidence!, 'before.json'), 'utf8'),
      ) as typeof rows;
      const admitted = new Set(fixtures.rows.map((r) => r.path));
      rows.forEach((r, i) => {
        if (admitted.has(r.path)) {
          expect(r.loaded).toBe(true);
          expect('isValid' in r.local && r.local.isValid).toBe(r.java);
        } else
          expect({
            loaded: r.loaded,
            valid: 'isValid' in r.local ? r.local.isValid : null,
            bv: r.bv,
          }).toEqual({
            loaded: before[i].loaded,
            valid:
              'isValid' in before[i].local ? before[i].local.isValid : null,
            bv: before[i].bv,
          });
      });
    }
  },
);

function nativeDocument(index = 1) {
  const parsed = parser.parse(fixtures.rows[index].content);
  if (!parsed.success) throw new Error('Invalid fixture');
  return parsed.data.document;
}
it('uses the native support BV type stage for Zugvogel B', () => {
  const index = fixtures.rows.findIndex((row) =>
    row.path.endsWith('Zugvogel Omni Support Aircraft B.blk'),
  );
  expect(index).toBeGreaterThanOrEqual(0);
  const document = nativeDocument(index);
  const handler = getUnitTypeRegistry().getHandlerForDocument(document)!;
  const parsed = handler.parse(document);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  const result = calculateBattleValueForUnit(parsed.data.unit);
  if (result?.kind !== 'aerospace') throw new Error('Wrong dispatcher');
  expect(result.breakdown.final).toBe(fixtures.rows[index].javaBV);
  expect(handler.calculateBV(parsed.data.unit)).toBe(
    fixtures.rows[index].javaBV,
  );
});
it.each([0.001, 4.999, 5, 100, 100.001, 200])(
  'uses FWS size limits at %s tons',
  (tonnage) => {
    const d = {
      ...nativeDocument(),
      tonnage,
      armor: [],
      armorType: 0,
      rawTags: { Tonnage: String(tonnage) },
    };
    const handler = getUnitTypeRegistry().getHandlerForDocument(d)!;
    const parsed = handler.parse(d);
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    expect(handler.validate(parsed.data.unit).isValid).toBe(true);
    expect(parsed.data.unit.unitType).toBe(UnitType.CONVENTIONAL_FIGHTER);
    expect(
      (parsed.data.unit as { isFixedWingSupport?: boolean }).isFixedWingSupport,
    ).toBe(true);
    expect(parsed.data.unit).toMatchObject({
      structuralIntegrity: d.safeThrust,
    });
  },
);
it.each([0, -1, 200.001, Infinity, NaN])(
  'rejects invalid FWS source weight %s',
  (tonnage) => {
    expect(
      validateFixedWingSupport({
        ...nativeDocument(),
        tonnage,
        rawTags: {},
      }).join('\n'),
    ).toContain('Fixed-wing support tonnage');
  },
);
it('retains conventional fighter admission and its five-ton floor', () => {
  const cf = createConventionalFighterHandler();
  expect(
    cf.parse({ ...nativeDocument(), unitType: 'ConvFighter', tonnage: 101 })
      .success,
  ).toBe(false);
  const parsed = cf.parse({
    ...nativeDocument(),
    unitType: 'ConvFighter',
    tonnage: 4,
  });
  if (!parsed.success)
    throw new Error('Expected loaded invalid conventional fighter');
  expect(cf.validate(parsed.data.unit).errors).toContain(
    'Conventional fighter tonnage must be at least 5 tons',
  );
});
it('allows maritime lifeboats with the pinned amphibious chassis alias', () => {
  const d = nativeDocument(0);
  expect(
    validateFixedWingSupport(d).filter((e) => e.includes('requires naval')),
  ).toHaveLength(12);
  expect(
    validateFixedWingSupport({
      ...d,
      rawTags: {
        ...d.rawTags,
        'Body Equipment': ['Lifeboat (Maritime)', 'AmphibiousChassis'],
      },
    }).filter((e) => e.includes('requires naval')),
  ).toEqual([]);
});
function slotDocument(tech = 4, cases = 1) {
  return {
    ...nativeDocument(),
    tonnage: 200,
    armorType: 51,
    rawTags: {
      armor_tech_rating: String(tech),
      'Nose Equipment': [
        'ISGaussRifle',
        'ISGaussRifle',
        'ISGaussRifle',
        ...Array<string>(cases).fill('ISCASE'),
        ...Array<string>(9).fill('IS Gauss Ammo'),
      ],
    },
  };
}
it('counts distinct ammo types once and accepts exactly available slots', () => {
  expect(validateFixedWingSupport(slotDocument())).toEqual([]);
  expect(validateFixedWingSupport(slotDocument(4, 2)).join('\n')).toContain(
    'Using 1 slot(s) too many',
  );
});
it('applies BAR 10 armor technology slots and the floor at the capacity boundary', () => {
  expect(validateFixedWingSupport(slotDocument(4, 3)).join('\n')).toContain(
    'Using 2 slot(s) too many',
  );
  expect(validateFixedWingSupport(slotDocument(5, 3)).join('\n')).toContain(
    'Using 1 slot(s) too many',
  );
  expect(
    validateFixedWingSupport({ ...slotDocument(), tonnage: 199.999 }).join(
      '\n',
    ),
  ).toContain('Available slots: 24');
});

it('routes FWS only while the aerospace handler family is registered', () => {
  const registry = new UnitTypeRegistry();
  expect(registry.getHandlerForDocument(nativeDocument())).toBeUndefined();
  registry.register(createConventionalFighterHandler());
  expect(registry.getHandlerForDocument(nativeDocument())?.displayName).toBe(
    'Fixed-Wing Support',
  );
  registry.clear();
  expect(registry.getHandlerForDocument(nativeDocument())).toBeUndefined();
});

// Hurricane Conventional Fighter pins 85 (was 84): owner ruling 2026-11-02 question 1 corrects the
// half-ton MG bin from BV 0 to 0.5 (pinned AmmoType.java:6665 `createISMGAmmoHalf`, bv = 0.5f). It is the
// only term that moved: fuselageWeaponBV 0 -> 0.5, offense 7.5 -> 8.25 (speed 1.5), 83.95 -> 84.70.
// Java's own per-term trace has the same bin (`ammo.available.MG:2` = 0.5). The total still differs from
// Java's 65 (UL-16b) for other terms: armorBV 72.5 vs 36.25 (BAR, pending the FWS BV lane), the
// unresolved CLRocketLauncher15Prototype, and the 0.9 fire-control factor on weapons and ammo.
it.each(fixtures.legacyRows)(
  'preserves published small/medium FWS: $path',
  (row) => {
    const parsedDocument = parser.parse(row.content);
    if (!parsedDocument.success) throw new Error(row.path);
    expect(createHash('sha256').update(row.content).digest('hex')).toBe(
      row.sha256,
    );
    const handler = getUnitTypeRegistry().getHandlerForDocument(
      parsedDocument.data.document,
    )!;
    expect(handler.displayName).toBe('Fixed-Wing Support');
    expect(
      handler.canHandle({
        ...parsedDocument.data.document,
        unitType: 'ConvFighter',
      }),
    ).toBe(false);
    const parsed = handler.parse(parsedDocument.data.document);
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    expect(handler.validate(parsed.data.unit).isValid).toBe(row.valid);
    expect(handler.calculateBV(parsed.data.unit)).toBe(row.bv);
  },
);
it('starts distinct-ammo slots at five tons', () => {
  const d = {
    ...nativeDocument(),
    tonnage: 5,
    armorType: 0,
    rawTags: {
      'Nose Equipment': ['Medium Laser', ...Array<string>(4).fill('ISCASE')],
      'Body Equipment': ['IS Gauss Ammo'],
    },
  };
  expect(validateFixedWingSupport(d).join('\n')).toContain(
    'Using 1 slot(s) too many',
  );
  expect(validateFixedWingSupport({ ...d, tonnage: 4.999 })).toEqual([]);
});
