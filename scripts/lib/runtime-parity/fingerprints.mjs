// The one owner of the deriver fingerprints: `coreDeriverSha()` for the shared facts core (facts-core.mjs) and
// `familyDeriverSha(family)` for one family's deriver and fact table (facts-<family>.mjs). The census writes exactly
// these values into facts-meta.json and the baseline header (through facts-provenance.mjs, which re-exports them), and
// the hosted pre-dispatch check calls the same functions. They read only the checkout's files, need no run directory,
// and this module imports only Node built-ins and family-names.mjs, so it runs before (and without) npm ci.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { assertFamilyId } from './family-names.mjs';

/** The git blob sha of some bytes: sha1("blob <length>\0" + bytes), i.e. what `git hash-object` prints. */
export const gitBlobSha = (bytes) =>
  createHash('sha1')
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest('hex');

const siblingPath = (name) =>
  fileURLToPath(new URL(`./${name}`, import.meta.url));

/**
 * The git blob sha of a file beside this module, over its LF-normalised bytes (the repo stores LF; a Windows checkout may
 * hold CRLF), so a Windows run and the hosted run agree on one value for one committed file.
 */
function siblingBlob(name) {
  const text = fs
    .readFileSync(siblingPath(name), 'utf8')
    .replace(/\r\n/g, '\n');
  return gitBlobSha(Buffer.from(text, 'utf8'));
}

/** The deriver file of a family: facts-<family>.mjs. A name that is not a family id is refused, never resolved. */
export const familyDeriverFile = (family) =>
  `facts-${assertFamilyId(family)}.mjs`;

/** Git blob of facts-core.mjs: the part every family's facts depend on. A change rebaselines every family. */
/** The shared core's deriver file, beside this module. */
export const CORE_DERIVER_FILE = 'facts-core.mjs';

export const coreDeriverSha = () => siblingBlob(CORE_DERIVER_FILE);

/**
 * Git blob of facts-<family>.mjs: that family's tables and derivers. A change rebaselines that family only. Refuses a
 * name that is not a family id, and a family with no deriver file (it has no facts to fingerprint).
 */
export function familyDeriverSha(family) {
  const file = familyDeriverFile(family);
  if (!fs.existsSync(siblingPath(file)))
    throw new Error(`family ${family} has no deriver (${file})`);
  return siblingBlob(file);
}
