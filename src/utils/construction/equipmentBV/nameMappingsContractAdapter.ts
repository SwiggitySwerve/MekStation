/**
 * Name Mappings Contract Adapter
 *
 * Bridges the cross-language `NameMappingsContract` (boundary shape
 * parsed from `public/data/equipment/name-mappings.json` via Zod) to the
 * in-memory `NameMappingsSource` shape consumed by
 * `loadNameMappings`. Mirrors the `parseUnit` pattern from
 * `src/services/units/unitLoaderService/unitContractAdapter.ts`.
 *
 * Why this exists:
 *  - `name-mappings.json` is a 6,170-key alias dictionary mapping legacy
 *    / variant equipment names (the source-of-truth keys MegaMek emits
 *    in MTF/BLK files) to the canonical kebab-case equipment id used
 *    internally. New entries land via name-mapping audits when MegaMek
 *    releases or imports surface unmapped variants — the surface area
 *    is wide enough that drift is plausible without a parse-boundary
 *    check.
 *  - Previously the consumer cast the raw JSON `as unknown as
 *    NameMappingsData`, smuggling untyped JSON across the boundary. The
 *    cast was marked in `equipmentBVCatalogData.ts:99`. This
 *    adapter closes the gap by parsing through the canonical
 *    JSON-Schema-derived Zod contract, so any future drift fails loudly
 *    with a Zod issue path instead of a silent BV miscalculation.
 *
 * Design notes:
 *  - The adapter is permissive on the happy path: the Zod contract
 *    treats the dict as `Record<string, string>` plus an optional
 *    `$schema` field plus an optional legacy nested `mappings` block
 *    retained from an earlier two-tier dictionary layout. The legacy
 *    block is dropped here so the adapter return matches the simpler
 *    `NameMappingsSource` shape `loadNameMappings` already expected.
 *  - On failure the adapter throws `NameMappingsContractParseError`
 *    with the first 5 Zod issue paths so a CI log can pinpoint the
 *    offending alias entry without re-running the parse.
 *
 * @see src/types/contracts/index.ts — NameMappingsContract source of truth
 * @see src/utils/construction/equipmentBVCatalogData.ts — main consumer
 */

import { NameMappingsContract } from '@/types/contracts';

import type { NameMappingsSource } from './types';

/**
 * Thrown when `parseNameMappings` cannot validate input against
 * `NameMappingsContract`. Carries the Zod issue list (first 5) so test
 * output and CI logs can pinpoint the offending field without re-running
 * the parse.
 */
export class NameMappingsContractParseError extends Error {
  /** First 5 Zod issues, preserved verbatim for debugging. */
  readonly issues: ReadonlyArray<{
    readonly path: string;
    readonly message: string;
  }>;

  constructor(
    issues: ReadonlyArray<{
      readonly path: string;
      readonly message: string;
    }>,
    sourceLabel: string,
  ) {
    const summary = issues
      .slice(0, 5)
      .map((issue) => `  ${issue.path || '<root>'}: ${issue.message}`)
      .join('\n');
    super(
      `parseNameMappings: NameMappingsContract.safeParse failed for ${sourceLabel}:\n${summary}`,
    );
    this.name = 'NameMappingsContractParseError';
    this.issues = issues;
  }
}

/**
 * Parse arbitrary JSON through `NameMappingsContract` and return the
 * boundary-shape mapping usable by `loadNameMappings`.
 *
 * Throws `NameMappingsContractParseError` on validation failure.
 * Successful parses produce a value compatible with `NameMappingsSource`:
 * the Zod-inferred shape is structurally identical (optional `$schema`
 * plus a string-valued catchall), so the boundary is statically sound
 * after this call returns.
 *
 * @param json    Untyped input — typically the imported
 *                `name-mappings.json` module.
 * @param sourceLabel Human-readable label used in error messages.
 *                    Defaults to `"name-mappings.json"`.
 */
export function parseNameMappings(
  json: unknown,
  sourceLabel = 'name-mappings.json',
): NameMappingsSource {
  const result = NameMappingsContract.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    throw new NameMappingsContractParseError(issues, sourceLabel);
  }
  // Strip the legacy nested `mappings` block — it's a `Record<string,
  // string>` and isn't assignable to NameMappingsSource's
  // `string | undefined`-valued catchall. `loadNameMappings` ignores it
  // anyway (it iterates top-level keys only), so dropping it here
  // preserves the historical consumer behavior verbatim while keeping
  // the in-memory shape narrow.
  const { mappings: _legacyMappings, ...flat } = result.data;
  void _legacyMappings;
  return flat as NameMappingsSource;
}
