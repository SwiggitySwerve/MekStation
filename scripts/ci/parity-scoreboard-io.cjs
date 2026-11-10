// Shared byte-level artifact I/O for both ESM scoreboard and TypeScript producers.
// oxlint-disable-next-line typescript/no-require-imports -- CommonJS is shared with Jest's CJS transform.
const { createHash } = require('node:crypto');
// oxlint-disable-next-line typescript/no-require-imports -- CommonJS is shared with Jest's CJS transform.
const fs = require('node:fs');
// oxlint-disable-next-line typescript/no-require-imports -- Shared CJS/ESM boundary.
const path = require('node:path');
// oxlint-disable-next-line typescript/no-require-imports -- Shared CJS/ESM boundary.
const { gunzipSync } = require('node:zlib');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const parseRows = (bytes) =>
  bytes.toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const readRows = (file) => parseRows(fs.readFileSync(file));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const compareText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function verifySha256(bytes, expected, label) {
  if (!/^[a-f0-9]{64}$/.test(expected) || sha256(bytes) !== expected)
    throw new Error(`${label} SHA-256 mismatch`);
}

/** One owner for the committed Java reference's three physical-byte checks. */
function loadReference(root, reference) {
  const compressed = fs.readFileSync(path.join(root, reference.file));
  verifySha256(compressed, reference.gzipSha256, 'gzip');
  const bytes = gunzipSync(compressed);
  verifySha256(bytes, reference.sha256, 'reference');
  const sidecar = fs.readFileSync(path.join(root, reference.sidecar));
  verifySha256(sidecar, reference.sidecarSha256, 'sidecar');
  return { bytes, sidecar };
}

module.exports = {
  readJson,
  readRows,
  parseRows,
  sha256,
  verifySha256,
  loadReference,
  compareText,
};
