/** @spec openspec/changes/establish-all-unit-data-parity/specs/unit-services/spec.md */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import {
  getUnitTypeRegistry,
  UnitTypeRegistry,
} from '@/services/units/UnitTypeRegistry';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { isSmallCraft } from '@/types/unit/AerospaceInterfaces';
import { isVTOL } from '@/types/unit/VehicleInterfaces';

import { initializeUnitTypeHandlers } from '../initializeHandlers';
import { createProtoMechHandler } from '../ProtoMechUnitHandler';
import { createSmallCraftHandler } from '../SmallCraftUnitHandler';
import { createVTOLHandler } from '../VTOLUnitHandler';
import fixtures from './fixtures/source-load-legality.json';
import { createMockBlkDocument as smallCraftDocument } from './SmallCraftUnitHandler.test-helpers';
import { createMockBlkDocument as vtolDocument } from './VTOLUnitHandler.test-helpers';

const parser = new BlkParserService();
const registry = new UnitTypeRegistry();
registry.register(createVTOLHandler());
registry.register(createSmallCraftHandler());

function load(document: IBlkDocument) {
  const handler = registry.getHandlerForDocument(document);
  if (!handler) throw new Error('Expected a registered source handler');
  return { handler, parsed: handler.parse(document) };
}

describe('source loading separately from construction validity', () => {
  it('publishes existing armor errors on a source that already loads', () => {
    const { handler, parsed } = load(
      vtolDocument({ armor: [999, 0, 0, 0, 0] }),
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const validation = handler.validate(parsed.data.unit);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain(
      'Total armor (999) exceeds maximum (113)',
    );
    expect(parsed.data.unit.isValid).toBe(false);
    expect(parsed.data.unit.validationErrors).toEqual(validation.errors);
  });

  it.each([vtolDocument(), smallCraftDocument()])(
    'keeps construction-valid sources valid',
    (document) => {
      const { handler, parsed } = load(document);
      expect(parsed.success).toBe(true);
      if (!parsed.success) return;
      expect(handler.validate(parsed.data.unit).isValid).toBe(true);
      expect(parsed.data.unit.isValid).toBe(true);
      expect(parsed.data.unit.validationErrors).toEqual([]);
    },
  );

  it.each(fixtures.rows)(
    'retains pinned source $sourceIndex: $path',
    (fixture) => {
      expect(createHash('sha256').update(fixture.content).digest('hex')).toBe(
        fixture.sha256,
      );
      expect(fixtures.mmDataCommit).toBe(
        '50f7efef0c9f775b0258f8283525ed4f906e1985',
      );
      const documentResult = parser.parse(fixture.content);
      if (!documentResult.success)
        throw new Error(documentResult.error.errors.join('; '));
      const document = documentResult.data.document;
      const { handler, parsed } = load(document);
      expect(parsed.success).toBe(true);
      if (!parsed.success) return;
      const unit = parsed.data.unit;
      expect(unit.tonnage).toBe(fixture.tonnage);
      const validation = handler.validate(unit);
      // SuperHeavy VTOLs (31-60 t) are legal in MegaMek, so their rows carry no errors
      expect(validation.isValid).toBe(fixture.constructionErrors.length === 0);
      expect(validation.errors).toEqual(
        expect.arrayContaining(fixture.constructionErrors),
      );
      expect(unit.isValid).toBe(validation.isValid);
      expect(unit.validationErrors).toEqual(validation.errors);
      if (isVTOL(unit)) {
        expect(unit.movement.cruiseMP).toBe(document.cruiseMP);
        expect(unit.armor).toEqual(document.armor);
        expect(unit.equipment.map((item) => item.name)).toEqual(
          Object.values(document.equipmentByLocation).flat(),
        );
      } else if (isSmallCraft(unit)) {
        expect(unit.movement.safeThrust).toBe(document.safeThrust);
        expect(unit.armor).toEqual(document.armor);
        expect(unit.structuralIntegrity).toBe(document.structuralIntegrity);
        expect(unit.equipment.map((item) => item.name)).toEqual(
          Object.values(document.equipmentByLocation).flat(),
        );
      } else throw new Error('Wrong source family');
    },
  );

  it.each([
    {
      name: 'VTOL',
      document: vtolDocument({ cruiseMP: 0 }),
      message: 'VTOLs must have at least 1 cruise MP',
    },
    {
      name: 'SmallCraft',
      document: smallCraftDocument({ safeThrust: 0 }),
      message: undefined,
    },
  ])(
    'retains zero movement and diagnostics for $name',
    ({ document, message }) => {
      const { handler, parsed } = load(document);
      expect(parsed.success).toBe(true);
      if (!parsed.success) return;
      const unit = parsed.data.unit;
      if (isVTOL(unit))
        expect(unit.movement).toEqual({ cruiseMP: 0, flankMP: 0, jumpMP: 0 });
      else if (isSmallCraft(unit))
        expect(unit.movement).toEqual({ safeThrust: 0, maxThrust: 0 });
      const validation = handler.validate(unit);
      if (message) {
        expect(validation.errors).toContain(message);
        expect(unit.isValid).toBe(false);
        expect(unit.validationErrors).toContain(message);
      } else {
        expect(validation.isValid).toBe(true);
        expect(unit.isValid).toBe(true);
        expect(unit.validationErrors).toEqual([]);
      }
    },
  );

  describe.each([
    { name: 'VTOL', make: vtolDocument, movement: 'cruiseMP' },
    { name: 'SmallCraft', make: smallCraftDocument, movement: 'safeThrust' },
  ] as const)('$name unusable input', ({ make, movement }) => {
    it.each([undefined, NaN, Infinity, -Infinity, -1, 1.5])(
      'rejects movement %s',
      (value) => {
        const { parsed } = load(make({ [movement]: value }));
        expect(parsed.success).toBe(false);
        if (!parsed.success)
          expect(parsed.error.errors.join('; ')).toContain(movement);
      },
    );
    it.each([NaN, Infinity, -Infinity, 0, -1])(
      'rejects unusable tonnage %s',
      (tonnage) => {
        expect(load(make({ tonnage })).parsed.success).toBe(false);
      },
    );
    it('retains missing identity failure', () => {
      expect(load(make({ name: '' })).parsed.success).toBe(false);
    });
  });

  it.each(['', 'nonsense', '2junk', 'Infinity', '2\n3'])(
    'rejects malformed raw movement %j',
    (value) => {
      for (const fixture of fixtures.rows) {
        const tag =
          fixture.concreteFamily === 'VTOL' ? 'cruiseMP' : 'SafeThrust';
        const content = fixture.content.replace(
          new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`),
          `<${tag}>\n${value}\n</${tag}>`,
        );
        const result = parser.parse(content);
        expect(result.success).toBe(true);
        if (result.success)
          expect(load(result.data.document).parsed.success).toBe(false);
      }
    },
  );

  it.each(['2junk', 'Infinity', '2\n3', ''])(
    'rejects malformed raw tonnage %j',
    (value) => {
      for (const fixture of fixtures.rows) {
        const content = fixture.content.replace(
          /<tonnage>[\s\S]*?<\/tonnage>/,
          `<tonnage>\n${value}\n</tonnage>`,
        );
        const result = parser.parse(content);
        const loaded = result.success
          ? load(result.data.document).parsed.success
          : false;
        expect(loaded).toBe(false);
      }
    },
  );

  it('retains parser failures and explicit unsupported dispatch', () => {
    expect(parser.parse('malformed')).toMatchObject({ success: false });
    expect(parser.parse('<UnitType>UnknownCraft</UnitType>')).toMatchObject({
      success: false,
    });
    expect(
      parser.parseByUnitType(
        '<UnitType>Warship</UnitType><Name>Unsupported</Name><tonnage>100000</tonnage><year>3050</year>',
      ),
    ).toMatchObject({
      success: true,
      result: { kind: 'unsupported' },
    });
    expect(createVTOLHandler().parse(smallCraftDocument()).success).toBe(false);
  });
});

beforeAll(() => initializeUnitTypeHandlers());

it.each(fixtures.nativeValidity.rows)(
  'matches Java construction validity: $path',
  (row) => {
    expect(createHash('sha256').update(row.content).digest('hex')).toBe(
      row.sha256,
    );
    const document = new BlkParserService().parse(row.content);
    if (!document.success) throw new Error(JSON.stringify(document.error));
    const handler = getUnitTypeRegistry().getHandlerForDocument(
      document.data.document,
    )!;
    const parsed = handler.parse(document.data.document);
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    const validation = handler.validate(parsed.data.unit);
    expect(validation.isValid).toBe(row.valid);
    if (row.diagnostic)
      expect(validation.errors.join('\n')).toContain(row.diagnostic);
    expect(parsed.data.unit.isValid).toBe(validation.isValid);
    expect(parsed.data.unit.validationErrors).toEqual(validation.errors);
  },
);

it('allows a Quad main-gun mount and checks glider running speed', () => {
  const handler = createProtoMechHandler();
  const quad = fixtures.nativeValidity.rows.find((row) =>
    row.path.endsWith('Boggart Ultraheavy ProtoMech.blk'),
  )!;
  const parsed = new BlkParserService().parse(quad.content);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  const unit = handler.parse(parsed.data.document);
  if (!unit.success) throw new Error(JSON.stringify(unit.error));
  expect(
    handler.validate({ ...unit.data.unit, hasMainGun: true, equipment: [] })
      .isValid,
  ).toBe(true);

  const glider = fixtures.nativeValidity.rows.find((row) =>
    row.path.endsWith('SvartAlfa Ultra.blk'),
  )!;
  const document = new BlkParserService().parse(glider.content);
  if (!document.success) throw new Error(JSON.stringify(document.error));
  const slow = handler.parse({
    ...document.data.document,
    cruiseMP: 2,
    rawTags: { ...document.data.document.rawTags, cruiseMP: '2' },
  });
  if (!slow.success) throw new Error(JSON.stringify(slow.error));
  expect(handler.validate(slow.data.unit).errors.join('\n')).toContain(
    'minimum flanking MP of 4',
  );
});

const corpus = process.env.CONSTRUCTION_CORPUS;
it.each([
  [72, true],
  [73, false],
] as const)('checks native mass at %i chemical-laser shots', (shots, valid) => {
  const source = fixtures.nativeValidity.rows.find((row) =>
    row.path.endsWith('Svartalfa 3.blk'),
  )!;
  const document = new BlkParserService().parse(
    source.content.replace(
      'CLMediumChemLaserAmmo (75)',
      `CLMediumChemLaserAmmo (${shots})`,
    ),
  );
  if (!document.success) throw new Error(JSON.stringify(document.error));
  const handler = createProtoMechHandler();
  const parsed = handler.parse(document.data.document);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  const validation = handler.validate(parsed.data.unit);
  expect(validation.isValid).toBe(valid);
  if (!valid)
    expect(validation.errors.join('\n')).toContain(
      'kg is greater than 14000.0 kg',
    );
});

(corpus ? it : it.skip)(
  'measures pinned ProtoMech, aerospace and capital validity',
  () => {
    const parser = new BlkParserService();
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
    const rows = readFileSync(join(corpus!, 'oracle.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map(
        (line) =>
          JSON.parse(line) as {
            path: string;
            sha256: string;
            concreteFamily: string;
            construction: { valid: boolean; diagnostics: string };
          },
      )
      .filter((row) => families.includes(row.concreteFamily));
    const results = rows.map((row) => {
      const content = readFileSync(
        join(corpus!, 'sources', row.path),
        'utf8',
      ).replace(/\r\n/g, '\n');
      expect(createHash('sha256').update(content).digest('hex')).toBe(
        row.sha256,
      );
      const doc = parser.parse(content);
      if (!doc.success) throw new Error(JSON.stringify(doc.error));
      const handler = getUnitTypeRegistry().getHandlerForDocument(
        doc.data.document,
      );
      if (!handler) throw new Error(row.path);
      const parsed = handler.parse(doc.data.document);
      return {
        path: row.path,
        family: row.concreteFamily,
        java: row.construction.valid,
        javaDiagnostics: row.construction.diagnostics,
        loaded: parsed.success,
        local: parsed.success
          ? handler.validate(parsed.data.unit)
          : parsed.error,
        bv: parsed.success ? handler.calculateBV(parsed.data.unit) : null,
      };
    });
    writeFileSync(
      join(corpus!, `${process.env.CONSTRUCTION_PHASE}.json`),
      JSON.stringify(results, null, 2),
    );
    expect(results).toHaveLength(1100);
    if (process.env.CONSTRUCTION_PHASE === 'after') {
      const before = JSON.parse(
        readFileSync(join(corpus!, 'before.json'), 'utf8'),
      ) as Array<{ path: string; loaded: boolean; bv: number | null }>;
      const loadingAndBV = (rows: typeof before) =>
        rows.map(({ path, loaded, bv }) => ({ path, loaded, bv }));
      expect(loadingAndBV(results)).toEqual(loadingAndBV(before));
      expect(
        results.filter(
          (row) =>
            row.family === 'ProtoMek' &&
            (!('isValid' in row.local) || row.java !== row.local.isValid),
        ),
      ).toEqual([]);
    }
  },
);
