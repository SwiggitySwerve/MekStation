// Shared byte-level artifact I/O for both ESM scoreboard and TypeScript producers.
// oxlint-disable-next-line typescript/no-require-imports -- CommonJS is shared with Jest's CJS transform.
const { createHash } = require('node:crypto');
// oxlint-disable-next-line typescript/no-require-imports -- CommonJS is shared with Jest's CJS transform.
const fs = require('node:fs');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const parseRows = (bytes) =>
  bytes.toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const readRows = (file) => parseRows(fs.readFileSync(file));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function verifySha256(bytes, expected, label) {
  if (!/^[a-f0-9]{64}$/.test(expected) || sha256(bytes) !== expected)
    throw new Error(`${label} SHA-256 mismatch`);
}

module.exports = { readJson, readRows, parseRows, sha256, verifySha256 };
