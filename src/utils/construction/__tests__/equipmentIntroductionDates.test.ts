/**
 * Catalog introduction dates corrected to pinned MegaMek 48fcb2f6 (owner standing approval
 * 2026-11-03). Java introduces equipment at its earliest advancement phase, prototype first
 * (TechAdvancement.java:691-698), five years earlier when that phase is approximate (:720-734).
 * Each fixture under fixtures/java-introduction-dates lists one batch: the catalog record, the
 * date the pinned-Java EquipmentDateProbe reports for its side, the Java type and its source lines.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

interface IntroductionDate {
  readonly file: string;
  readonly id: string;
  readonly year: number;
  readonly java: string;
  readonly citation: string;
}

const fixtures = join(__dirname, 'fixtures', 'java-introduction-dates');
const catalog = join(process.cwd(), 'public/data/equipment/official');
// One JSON row per line, one file per batch.
const rows: IntroductionDate[] = readdirSync(fixtures)
  .filter((file) => file.endsWith('.jsonl'))
  .flatMap((file) =>
    readFileSync(join(fixtures, file), 'utf8')
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line)),
  );

const items = new Map<string, { id: string; introductionYear?: number }[]>();
const itemsOf = (file: string) => {
  if (!items.has(file))
    items.set(
      file,
      JSON.parse(readFileSync(join(catalog, file), 'utf8')).items,
    );
  return items.get(file)!;
};

it.each(
  rows.map((row) => [row.id, row.year, row.java, row.citation, row.file]),
)('%s is introduced in %s (%s, %s)', (id, year, _java, _citation, file) => {
  const copies = itemsOf(file as string).filter((item) => item.id === id);
  expect(copies.length).toBeGreaterThan(0);
  expect(copies.map((item) => item.introductionYear)).toEqual(
    copies.map(() => year),
  );
});
