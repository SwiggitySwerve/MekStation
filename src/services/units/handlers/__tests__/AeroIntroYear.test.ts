import { createHash } from 'node:crypto';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { getUnitTypeRegistry } from '@/services/units/UnitTypeRegistry';
import { getEquipmentEntry } from '@/utils/construction/equipmentBV';

import { initializeUnitTypeHandlers } from '../initializeHandlers';
import fixtures from './fixtures/aero-intro-year.json';

/**
 * Equipment introduction year against the unit's year, pinned MegaMek 48fcb2f6
 * TestEntity.hasIncorrectIntroYear:1471-1512 (equipment loop, margin 5 from
 * TestXMLOption.introYearMargin:85-86), called for aerospace fighters and
 * conventional fighters by TestAero:828 and for fixed-wing support by
 * TestSupportVehicle:1221. Small craft, DropShips and large craft do not call it.
 *
 * The year in the message is the catalog's introductionYear, which owner-approved
 * catalog batch Q1b (#2592) sets to Java's 3069 and 3115; these rows assert the
 * equipment name so they hold with or without that batch.
 */
beforeAll(() => initializeUnitTypeHandlers());
const parser = new BlkParserService();

function validate(content: string) {
  const document = parser.parse(content);
  if (!document.success) throw new Error(JSON.stringify(document.error));
  const handler = getUnitTypeRegistry().getHandlerForDocument(
    document.data.document,
  )!;
  const parsed = handler.parse(document.data.document);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  return handler.validate(parsed.data.unit);
}

it.each(fixtures.rows)(
  'rejects $path as Java does: $javaDiagnostic',
  ({ content, sha256, javaValid, javaDiagnostic }) => {
    expect(createHash('sha256').update(content).digest('hex')).toBe(sha256);
    const result = validate(content);
    expect(result.isValid).toBe(javaValid);
    const javaPrefix = javaDiagnostic.replace(/\d+$/, '');
    expect(result.errors.filter((e) => e.startsWith(javaPrefix))).toHaveLength(
      1,
    );
  },
);

// A unit year at introduction minus 5 is inside the margin; minus 6 is not.
it.each([
  [5, false],
  [6, true],
])(
  'applies the 5-year margin to the Chaff Pod %i years early',
  (early, bad) => {
    const intro = getEquipmentEntry('ISChaffPod')!.introductionYear!;
    const tsuru = fixtures.rows.find((row) => row.path.includes('Tsuru'))!;
    const result = validate(
      tsuru.content.replace('<year>\n3021\n', `<year>\n${intro - early}\n`),
    );
    expect(result.errors.some((e) => e.startsWith('Chaff Pod has'))).toBe(bad);
  },
);
