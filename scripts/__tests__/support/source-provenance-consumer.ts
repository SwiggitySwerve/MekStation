/** Independent Node consumer of actual Python CLI output; no application stores. */
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { SourceProvenanceContract } from '../../../src/types/contracts/generated/source-provenance.zod';

const document: unknown = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const parsed = SourceProvenanceContract.parse(document);
assert.deepEqual(parsed, document, 'Zod must retain every wire field and row');
const inventory = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) as {
  repository: string;
  commit: string;
  summary: { sourceFiles: number; archiveFiles: number };
  entries: {
    kind: string;
    path: string;
    format: string;
    blob: string;
    sha256: string;
  }[];
};
assert.equal(inventory.summary.archiveFiles, 0);
const expected = inventory.entries.filter((row) => row.kind === 'source');
assert.equal(parsed.sources.length, inventory.summary.sourceFiles);
assert.equal(parsed.sources.length, expected.length);
for (const [index, row] of expected.entries()) {
  assert.deepEqual(parsed.sources[index], {
    source: {
      kind: 'git',
      repository: inventory.repository,
      commit: inventory.commit,
      path: row.path,
      blob: row.blob,
    },
    originalFormat: row.format,
    sha256: row.sha256,
  });
}
console.log(
  JSON.stringify({
    consumer: 'independent-node-zod',
    acceptedRows: parsed.sources.length,
    exactOrderedInventoryProjection: true,
    commit: inventory.commit,
  }),
);
