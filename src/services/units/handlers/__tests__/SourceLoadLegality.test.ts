/** @spec openspec/changes/establish-all-unit-data-parity/specs/unit-services/spec.md */
import { createHash } from 'node:crypto';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { UnitTypeRegistry } from '@/services/units/UnitTypeRegistry';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { isSmallCraft } from '@/types/unit/AerospaceInterfaces';
import { isVTOL } from '@/types/unit/VehicleInterfaces';

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
      message: 'Small craft must have at least 1 safe thrust',
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
      expect(handler.validate(unit).errors).toContain(message);
      expect(unit.isValid).toBe(false);
      expect(unit.validationErrors).toContain(message);
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
