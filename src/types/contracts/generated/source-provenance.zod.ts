// @generated — do not edit; run `npm run schema:gen` to regenerate.
// Source: public/data/equipment/_schema/source-provenance-schema.json
// Regeneration: `node scripts/generate-zod-schemas.mjs` (see `scripts/generate-zod-schemas.mjs`).
//
// PR-A1 ships only the weapon shape through round-trip tests + loader
// validation; PR-A2 wires the rest. The schema-bridge CI job verifies
// these files match the JSON Schema source via `--check` mode.

import { z } from 'zod';

export const SourceProvenanceContract = z
  .object({
    format: z.literal('battletech-source-provenance'),
    version: z.literal('1.0.0'),
    sources: z
      .array(
        z
          .object({
            source: z.union([
              z
                .object({
                  kind: z.literal('git'),
                  repository: z
                    .string()
                    .regex(
                      new RegExp(
                        '^https://[a-z0-9]+(?:[.-][a-z0-9]+)*(?:/[A-Za-z0-9_-][A-Za-z0-9._~-]*)+(?![\\s\\S])',
                      ),
                    )
                    .describe(
                      'Stable credential-free HTTPS repository identity, including repository path; no query, fragment or trailing slash. Identity is asserted, not fetched by validation.',
                    ),
                  commit: z
                    .string()
                    .regex(new RegExp('^[0-9a-f]{40}(?![\\s\\S])'))
                    .describe(
                      'Resolved full lowercase Git commit object ID, never a ref or abbreviation.',
                    ),
                  path: z
                    .string()
                    .regex(
                      new RegExp(
                        '^(?![\\s\\S]*[\\\\:\u0000-\u001f])(?!/)(?![\\s\\S]*(?:^|/)\\.{1,2}(?:/|(?![\\s\\S])))[^/]+(?:/[^/]+)*(?![\\s\\S])',
                      ),
                    )
                    .describe(
                      'Exact case-sensitive repository-relative POSIX path. No absolute paths, empty/dot/traversal segments, backslashes, colons or control characters. Never URL-decode or normalize before comparison.',
                    ),
                  blob: z
                    .string()
                    .regex(new RegExp('^[0-9a-f]{40}(?![\\s\\S])'))
                    .describe(
                      'Full lowercase Git blob object ID of the original bytes; uses the same Git object format as commit. Distinct from SHA-256 of file bytes.',
                    ),
                })
                .strict(),
              z
                .object({
                  kind: z.literal('git'),
                  repository: z
                    .string()
                    .regex(
                      new RegExp(
                        '^https://[a-z0-9]+(?:[.-][a-z0-9]+)*(?:/[A-Za-z0-9_-][A-Za-z0-9._~-]*)+(?![\\s\\S])',
                      ),
                    )
                    .describe(
                      'Stable credential-free HTTPS repository identity, including repository path; no query, fragment or trailing slash. Identity is asserted, not fetched by validation.',
                    ),
                  commit: z
                    .string()
                    .regex(new RegExp('^[0-9a-f]{64}(?![\\s\\S])'))
                    .describe(
                      'Resolved full lowercase Git commit object ID, never a ref or abbreviation.',
                    ),
                  path: z
                    .string()
                    .regex(
                      new RegExp(
                        '^(?![\\s\\S]*[\\\\:\u0000-\u001f])(?!/)(?![\\s\\S]*(?:^|/)\\.{1,2}(?:/|(?![\\s\\S])))[^/]+(?:/[^/]+)*(?![\\s\\S])',
                      ),
                    )
                    .describe(
                      'Exact case-sensitive repository-relative POSIX path. No absolute paths, empty/dot/traversal segments, backslashes, colons or control characters. Never URL-decode or normalize before comparison.',
                    ),
                  blob: z
                    .string()
                    .regex(new RegExp('^[0-9a-f]{64}(?![\\s\\S])'))
                    .describe(
                      'Full lowercase Git blob object ID of the original bytes; uses the same Git object format as commit. Distinct from SHA-256 of file bytes.',
                    ),
                })
                .strict(),
              z
                .object({
                  kind: z.literal('local'),
                  originalName: z
                    .string()
                    .regex(
                      new RegExp(
                        '^(?!\\.{1,2}(?![\\s\\S]))[^/\\\\:\u0000-\u001f]+(?![\\s\\S])',
                      ),
                    )
                    .describe(
                      'Original upload basename, preserved exactly; no filesystem path or invented Git identity.',
                    ),
                })
                .strict(),
            ]),
            originalFormat: z
              .enum(['mtf', 'blk', 'bfs'])
              .describe(
                'Source syntax, independent of filename case or extension. Declaring a syntax does not establish parser or family support.',
              ),
            sha256: z
              .string()
              .regex(new RegExp('^[0-9a-f]{64}(?![\\s\\S])'))
              .describe(
                'SHA-256 of exact original file bytes, before decoding, newline normalization or parsing; not a normalized design digest or Git object ID.',
              ),
          })
          .strict(),
      )
      .min(1)
      .describe(
        'Ordered source rows, retained without deduplication; multiple origins may describe one design. Order does not define design identity.',
      ),
    metadata: z
      .array(
        z
          .object({
            name: z
              .string()
              .regex(
                new RegExp(
                  '^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+:[A-Za-z][A-Za-z0-9._-]*(?![\\s\\S])',
                ),
              )
              .describe(
                'Reverse-DNS namespace plus colon and annotation key, for example org.example:note.',
              ),
            value: z.string(),
          })
          .strict(),
      )
      .describe(
        'Optional opaque annotations. Preserve order and values. They impose no requirements and cannot override source identity, version or any core semantics. Required semantic extensions are unsupported.',
      )
      .optional(),
  })
  .strict()
  .describe(
    'Original source identities only; independent of design identity/revision, calculations and campaign state. This schema does not establish source availability, truth or construction-family support.',
  );
export type SourceProvenanceContract = z.infer<typeof SourceProvenanceContract>;
