// Where a set of facts came from, so a baseline can tell when tonight's facts were derived differently.
// facts.mjs stays the single pure deriver; this module only fingerprints it (and writes/reads the
// `facts-meta.json` that travels with `facts.ndjson`).
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import { FACTS_SCHEMA_VERSION } from './facts.mjs';

export const FACTS_META_FILE = 'facts-meta.json';

/** The git blob sha of some bytes: sha1("blob <length>\0" + bytes). */
export const gitBlobSha = (bytes) =>
  createHash('sha1')
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest('hex');

/**
 * The git blob sha of facts.mjs, over its LF-normalised bytes (the repo stores LF; a Windows checkout may
 * hold CRLF), so a Windows run and the hosted run agree on one value for one committed file.
 */
export function factsDeriverBlob() {
  const file = fileURLToPath(new URL('./facts.mjs', import.meta.url));
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  return gitBlobSha(Buffer.from(text, 'utf8'));
}

export const ProvenanceSchema = z.strictObject({
  /** The facts row layout and fact list version (FACTS_SCHEMA_VERSION). */
  factsSchemaVersion: z.int().positive(),
  /** Git blob sha of facts.mjs, the deriver. A different value means the facts were read differently. */
  factsDeriverBlob: z.string().regex(/^[a-f0-9]{40}$/),
  /** sha256 of the committed Java reference (config/reference gzip) the facts were derived against. */
  referenceSha256: z.string().regex(/^[a-f0-9]{64}$/),
});

export const factsProvenance = ({ referenceSha256 }) =>
  ProvenanceSchema.parse({
    factsSchemaVersion: FACTS_SCHEMA_VERSION,
    factsDeriverBlob: factsDeriverBlob(),
    referenceSha256,
  });

export const FactsMetaSchema = ProvenanceSchema.extend({
  schemaVersion: z.literal(1),
  measure: z.string().min(1),
});

export const factsMeta = ({ measure, referenceSha256 }) => ({
  schemaVersion: 1,
  measure,
  ...factsProvenance({ referenceSha256 }),
});

/** Parse a facts-meta.json text; throws a plain Error naming the problem. */
export function parseFactsMeta(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`${FACTS_META_FILE} is not JSON: ${error.message}`);
  }
  const result = FactsMetaSchema.safeParse(value);
  if (!result.success)
    throw new Error(
      `${FACTS_META_FILE} is malformed: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    );
  return result.data;
}
