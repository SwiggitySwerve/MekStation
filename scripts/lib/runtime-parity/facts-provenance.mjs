// Where a set of facts came from, so a baseline can tell when tonight's facts were derived differently.
// Two fingerprints per family: the shared core (facts-core.mjs, `coreDeriverSha`) and the family's own deriver
// (facts-<family>.mjs, `familyDeriverSha`). Both come from fingerprints.mjs, their one owner (dependency-free, so the
// hosted pre-dispatch check calls the same functions before npm ci); this module re-exports them and writes/reads the
// `facts-meta.json` that travels with `facts.ndjson`.
import { z } from 'zod';

import { FACTS_SCHEMA_VERSION } from './facts-core.mjs';
import { coreDeriverSha, familyDeriverSha } from './fingerprints.mjs';

export {
  coreDeriverSha,
  familyDeriverFile,
  familyDeriverSha,
  gitBlobSha,
} from './fingerprints.mjs';

export const FACTS_META_FILE = 'facts-meta.json';

const blob = z.string().regex(/^[a-f0-9]{40}$/);

export const ProvenanceSchema = z.strictObject({
  /** The facts row layout and fact list version (FACTS_SCHEMA_VERSION). */
  factsSchemaVersion: z.int().positive(),
  /** Git blob of facts-core.mjs. */
  coreDeriverSha: blob,
  /** Git blob of facts-<family>.mjs. */
  familyDeriverSha: blob,
  /** sha256 of the committed Java reference (config/reference gzip) the facts were derived against. */
  referenceSha256: z.string().regex(/^[a-f0-9]{64}$/),
});

export const factsProvenance = ({ family, referenceSha256 }) =>
  ProvenanceSchema.parse({
    factsSchemaVersion: FACTS_SCHEMA_VERSION,
    coreDeriverSha: coreDeriverSha(),
    familyDeriverSha: familyDeriverSha(family),
    referenceSha256,
  });

/** 2: per-family fingerprints (`coreDeriverSha`, `familyDeriverSha`) replace the single `factsDeriverBlob`; `family` is required. */
export const FactsMetaSchema = z.strictObject({
  schemaVersion: z.literal(2),
  measure: z.string().min(1),
  family: z.string().min(1),
  ...ProvenanceSchema.shape,
});

export const factsMeta = ({ measure, family, referenceSha256 }) => ({
  schemaVersion: 2,
  measure,
  family,
  ...factsProvenance({ family, referenceSha256 }),
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
