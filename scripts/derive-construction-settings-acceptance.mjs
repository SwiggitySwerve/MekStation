/** Reproduce the reviewed D3 data from the W3 report and reference receipt. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const arg = (name) => {
  const index = process.argv.indexOf(name);
  assert(index >= 0 && process.argv[index + 1], `Required: ${name} <file>`);
  return process.argv[index + 1];
};
const reportBytes = fs.readFileSync(arg('--report'));
const sidecarBytes = fs.readFileSync(arg('--sidecar'));
const report = JSON.parse(reportBytes);
const sidecar = JSON.parse(sidecarBytes);
const plan = fs.readFileSync(arg('--plan'), 'utf8');
const citation = plan
  .split(/\r?\n/)
  .find((line) => line.startsWith('- **D3 accepted:**'))
  ?.slice(2);
assert(citation, 'Missing PARITY-PLAN D3 ruling');
const cells = report.settings.inapplicableCandidates.map(
  ({ family, verifierClass, key }) => ({ family, verifierClass, key }),
);
assert.equal(cells.length, 157, 'D3 approves exactly 157 cells');
assert.equal(new Set(cells.map((cell) => JSON.stringify(cell))).size, 157);
assert.equal(report.referenceSha256, sidecar.referenceSha256);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const accepted = {
  ruling: {
    date: '2026-11-09',
    source: 'PARITY-PLAN.md',
    section: '17',
    citation,
  },
  reference: {
    megamekCommit: sidecar.runtime.megamekCommit,
    verifierConfigSha256: sidecar.runtime.verifierConfigSha256,
    referenceSha256: sidecar.referenceSha256,
    sidecar: 'reference-full.jsonl.provenance.json',
    sidecarSha256: sha256(sidecarBytes),
  },
  source: {
    report: 'parity-W3/proof-rev/head/construction-quantity-report.json',
    reportSha256: sha256(reportBytes),
  },
  cells,
};
const target = fileURLToPath(
  new URL('./unit-construction-settings-acceptance.json', import.meta.url),
);
if (process.argv.includes('--check')) {
  assert.deepEqual(
    JSON.parse(fs.readFileSync(target, 'utf8')),
    accepted,
    'Reviewed D3 acceptance differs from derivation',
  );
} else {
  fs.writeFileSync(target, JSON.stringify(accepted, null, 2) + '\n');
}
process.stdout.write(
  `${process.argv.includes('--check') ? 'Verified' : 'Derived'} ${cells.length} unique D3 cells\n`,
);
