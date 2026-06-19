/**
 * Unit Contract Adapter
 *
 * Bridges the cross-language `UnitContract` (boundary shape parsed from
 * JSON via Zod) to the in-memory `IRawSerializedUnit` shape consumed by
 * `UnitLoaderService.mapToUnitState`. This is the parse-boundary
 * choke-point referenced from `src/types/contracts/index.ts` — every
 * place that previously cast raw JSON `as unknown as IRawSerializedUnit`
 * (or similar) routes through here so a future wire-format drift fails
 * loudly with a Zod issue path instead of silently producing a
 * malformed `UnitState`.
 *
 * Design notes:
 *  - `parseUnit(json)` returns `IRawSerializedUnit` because the loader
 *    is the only consumer today; the rich `IUnit` domain interface is
 *    constructed downstream by `mapToUnitState`. We deliberately don't
 *    materialise the rich type here — it would force every adapter call
 *    site to run the full mapper, which has equipment-registry side
 *    effects.
 *  - The adapter is intentionally permissive: `IRawSerializedUnit` has
 *    an `[key: string]: unknown` catchall, so we forward extra fields
 *    that aren't yet in the contract (e.g. `mulId`, `era`,
 *    `baseChassisHeatSinks`) without dropping data. The Zod schema
 *    accepts unknown keys at the unit root via `.passthrough()` upstream.
 *  - On failure we throw with the first 3 Zod issue paths so the caller
 *    sees a CI-friendly, actionable error instead of "type assertion
 *    failed" deep inside the mapper.
 *
 * Error type: `UnitContractParseError` is exported so callers can
 * differentiate schema drift from other I/O errors without resorting to
 * string matching.
 *
 * @see src/types/contracts/index.ts — UnitContract source of truth
 * @see src/services/units/unitLoaderService/unitLoader.ts — main consumer
 */

import { UnitContract } from '@/types/contracts';

import { IRawSerializedUnit } from './types';

/**
 * Thrown when `parseUnit` cannot validate input against `UnitContract`.
 *
 * Carries the Zod issue list (first 5) so test output and CI logs can
 * pinpoint the offending field without re-running the parse.
 */
export class UnitContractParseError extends Error {
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
      `parseUnit: UnitContract.safeParse failed for ${sourceLabel}:\n${summary}`,
    );
    this.name = 'UnitContractParseError';
    this.issues = issues;
  }
}

/**
 * Parse arbitrary JSON through `UnitContract` and return the
 * boundary-shape unit usable by `UnitLoaderService.mapToUnitState`.
 *
 * Throws `UnitContractParseError` on validation failure. Successful
 * parses produce a value compatible with `IRawSerializedUnit`: the
 * Zod-inferred shape is a structural subset (every required field plus
 * permissive optionals), and the `[key: string]: unknown` catchall on
 * `IRawSerializedUnit` accepts any extra fields the schema allows.
 *
 * @param json    Untyped input — typically `JSON.parse(...)` output, a
 *                fetched response body, or imported JSON.
 * @param sourceLabel Human-readable label used in error messages
 *                    ("Atlas AS7-D.json", "POST /api/custom-units/123",
 *                    etc.). Defaults to "<json input>".
 */
export function parseUnit(
  json: unknown,
  sourceLabel = '<json input>',
): IRawSerializedUnit {
  const result = UnitContract.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    throw new UnitContractParseError(issues, sourceLabel);
  }
  // Zod's inferred type is a permissive structural subset of
  // IRawSerializedUnit; the index signature makes the cast safe at this
  // boundary because we've just proven the runtime shape conforms.
  return result.data as IRawSerializedUnit;
}

/**
 * Safe variant: returns either the parsed unit or a structured failure
 * record. Use when the caller wants to handle drift without try/catch
 * (e.g. batch-import flows that need to surface per-file errors).
 */
export function safeParseUnit(
  json: unknown,
):
  | { success: true; unit: IRawSerializedUnit }
  | { success: false; error: UnitContractParseError } {
  try {
    const unit = parseUnit(json);
    return { success: true, unit };
  } catch (err) {
    if (err instanceof UnitContractParseError) {
      return { success: false, error: err };
    }
    throw err;
  }
}

/**
 * Resolve a `safeParseUnit` result back into the boundary
 * `IRawSerializedUnit` shape, falling back to the original JSON when
 * parsing produced drift warnings. Drift is dev-only-warned upstream
 * (the corpus contract test owns strict failure), so the loader keeps
 * loading even when the contract trips — but it must still hand
 * `mapToUnitState` an `IRawSerializedUnit`-shaped value.
 *
 * Centralising the fallback coercion here removes the duplicated
 * `(parseResult.success ? parseResult.unit : fullUnit) as IRawSerializedUnit`
 * pattern from each loader call site. The single coercion is justified
 * because:
 *   - upstream services type their cached JSON as `IFullUnit`, which
 *     carries optional version metadata (currentVersion/createdAt/
 *     updatedAt) plus a `[key: string]: unknown` index signature wide
 *     enough to accept the structurally-richer `IRawSerializedUnit`,
 *   - `hasSerializedUnitStructure` already runs ahead of this in the
 *     custom-unit branch to confirm the shape is the serialized variant
 *     (chassis/tonnage/techBase present),
 *   - the contract adapter has already validated the parse on the
 *     happy path, and the corpus test guarantees no canonical fixture
 *     can stay drifted.
 *
 * If the wire shape ever needs a structural transform (e.g. armor
 * allocation reshaping), this helper is the single place to do it
 * without re-fanning the cast across loader entry points.
 */
export function resolveRawUnit(
  parseResult: ReturnType<typeof safeParseUnit>,
  fallback: unknown,
): IRawSerializedUnit {
  if (parseResult.success) {
    return parseResult.unit;
  }
  return fallback as IRawSerializedUnit;
}
