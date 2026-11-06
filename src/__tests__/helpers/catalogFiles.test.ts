import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { readCatalogFiles } from './catalogFiles.test-helpers';

let directory: string;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-files-'));
});

afterEach(() => {
  fs.rmSync(directory, { recursive: true, force: true });
});

it('returns every source byte in index order, including duplicates and malformed JSON', async () => {
  const entries = Array.from({ length: 69 }, (_, index) => ({
    id: `unit-${index}`,
    path: `${index}.json`,
  }));
  for (const [index, entry] of entries.entries())
    fs.writeFileSync(
      path.join(directory, entry.path),
      index === 35 ? '{malformed' : JSON.stringify({ name: `Mék ${index}` }),
    );
  entries.push(entries[0]);
  const actual: { entry: (typeof entries)[number]; text: string }[] = [];
  for await (const { entry, read } of readCatalogFiles(directory, entries))
    actual.push({ entry, text: read() });
  expect(actual).toEqual(
    entries.map((entry) => ({
      entry,
      text: fs.readFileSync(path.join(directory, entry.path), 'utf8'),
    })),
  );
});

it('keeps read failures at their indexed row and continues through every later unit', async () => {
  const entries = [
    { path: 'first.json' },
    { path: 'missing.json' },
    { path: 'last.json' },
  ];
  fs.writeFileSync(path.join(directory, entries[0].path), 'first');
  fs.writeFileSync(path.join(directory, entries[2].path), 'last');
  const actual: unknown[] = [];
  for await (const { entry, read } of readCatalogFiles(directory, entries)) {
    try {
      actual.push([entry.path, read()]);
    } catch (error) {
      actual.push([entry.path, String(error)]);
    }
  }
  expect(actual).toEqual(
    entries.map((entry) => {
      try {
        return [
          entry.path,
          fs.readFileSync(path.join(directory, entry.path), 'utf8'),
        ];
      } catch (error) {
        return [entry.path, String(error)];
      }
    }),
  );
});

it('preserves an empty census', async () => {
  const actual = [];
  for await (const entry of readCatalogFiles(directory, [])) actual.push(entry);
  expect(actual).toEqual([]);
});
