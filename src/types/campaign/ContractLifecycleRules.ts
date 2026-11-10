/** Version and persisted-state contract for staged completion. Writer stays dark.
 * @spec openspec/changes/add-contract-lifecycle-s1/specs/mission-contracts/spec.md
 */
import { z } from 'zod';

export const CURRENT_LIFECYCLE_RULES_WRITER = 1;
export const MAX_SUPPORTED_LIFECYCLE_RULES_VERSION = 2;

/** Append-only: never attach a new rule to an already-written version. */
export const CONTRACT_LIFECYCLE_RULES = Object.freeze({
  stagedCompletion: Object.freeze({ introducedIn: 2 }),
  installments: Object.freeze({ introducedIn: 2 }),
});

export type ContractLifecyclePolicy =
  | { readonly kind: 'legacy'; readonly version: 1 }
  | { readonly kind: 'staged'; readonly version: 2 }
  | { readonly kind: 'unsupported'; readonly version: unknown };

export function getContractLifecyclePolicy(
  version: unknown,
): ContractLifecyclePolicy {
  if (version === undefined || version === 1)
    return { kind: 'legacy', version: 1 };
  if (version === MAX_SUPPORTED_LIFECYCLE_RULES_VERSION)
    return { kind: 'staged', version: 2 };
  return { kind: 'unsupported', version };
}

// ---------------------------------------------------------------------------
// Reader floor (S1b). The reader level is what a build's PROCESSORS implement,
// not what its validator can parse: the validator accepts 2 from S1, but no
// processor honours it until S2-S4 land. Raised to 2 only by that slice.
// Invariant: WRITER <= READER <= MAX_SUPPORTED.
// ---------------------------------------------------------------------------

/** Request header a client sends: the highest rules level its processors implement. */
export const LIFECYCLE_RULES_REQUEST_HEADER = 'X-MekStation-Lifecycle-Rules';
export const LIFECYCLE_RULES_READER_MAX = 1;
/** The level every client shipped before S1b reads, and which never changes. */
export const SHIPPED_LIFECYCLE_READER = 1;

const READER_HEADER_PATTERN = /^[1-9][0-9]{0,5}$/;

/**
 * The reader level a request header declares. Absent, malformed or repeated
 * (Node joins repeats with ", ") is level 1, never an error: the least capable
 * reading is the safe one, and `declared` is false because such a caller is
 * not known to display what it cannot read.
 */
export function readLifecycleReaderHeader(raw: unknown): {
  readonly level: number;
  readonly declared: boolean;
} {
  if (typeof raw === 'string' && READER_HEADER_PATTERN.test(raw)) {
    return { level: Number(raw), declared: true };
  }
  return { level: SHIPPED_LIFECYCLE_READER, declared: false };
}

export function parseLifecycleReaderHeader(raw: unknown): number {
  return readLifecycleReaderHeader(raw).level;
}

/**
 * The reader level needed to process a stored version: absent or 1 is 1, any
 * other positive safe integer is itself, anything else is `null` (unreadable
 * by every reader).
 */
export function requiredLifecycleReaderVersion(
  version: unknown,
): number | null {
  if (version === undefined || version === 1) return SHIPPED_LIFECYCLE_READER;
  return typeof version === 'number' &&
    Number.isSafeInteger(version) &&
    version > 0
    ? version
    : null;
}

export type ContractInertReason = 'newer-rules' | 'unreadable';

/**
 * Why this build must carry a contract without acting on it, or `null`.
 * The ONE predicate every reader asks (S1b answer 2); judged against the
 * reader level, never the validator's maximum.
 */
export function contractInertReason(contract: {
  readonly lifecycleRulesVersion?: unknown;
}): ContractInertReason | null {
  const required = requiredLifecycleReaderVersion(
    contract.lifecycleRulesVersion,
  );
  if (required === null) return 'unreadable';
  return required > LIFECYCLE_RULES_READER_MAX ? 'newer-rules' : null;
}

export function isContractInert(contract: {
  readonly lifecycleRulesVersion?: unknown;
}): boolean {
  return contractInertReason(contract) !== null;
}

export function hasContractLifecycleRule(
  contract: { readonly lifecycleRulesVersion?: unknown },
  rule: keyof typeof CONTRACT_LIFECYCLE_RULES,
): boolean {
  const policy = getContractLifecyclePolicy(contract.lifecycleRulesVersion);
  return (
    policy.kind !== 'unsupported' &&
    policy.version >= CONTRACT_LIFECYCLE_RULES[rule].introducedIn
  );
}

const unsignedInteger = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);
const campaignDate = z
  .string()
  .date()
  .or(z.string().datetime({ offset: true }));
const scenarioResult = z
  .object({
    matchId: z.string().min(1),
    appliedOn: campaignDate,
    result: z.enum(['victory', 'defeat', 'draw', 'unscored']),
  })
  .strict()
  .readonly();

const lifecycleState = z
  .object({
    termDays: unsignedInteger.positive(),
    results: z.array(scenarioResult).readonly(),
    installments: z
      .object({ paidThrough: unsignedInteger, creditedCents: unsignedInteger })
      .strict()
      .readonly(),
    settlement: z
      .object({
        verdict: z.enum(['SUCCESS', 'PARTIAL', 'FAILED', 'BREACH']),
        settledOn: campaignDate,
        paidCents: unsignedInteger,
        txId: z.string().min(1),
      })
      .strict()
      .readonly()
      .optional(),
  })
  .strict()
  .refine(
    (state) =>
      new Set(state.results.map((result) => result.matchId)).size ===
      state.results.length,
    'Duplicate lifecycle matchId',
  )
  .readonly();

export type IContractScenarioResult = z.infer<typeof scenarioResult>;
export type IContractLifecycleState = z.infer<typeof lifecycleState>;

/** Validate without normalizing or adding keys to the stored record. */
export function validateContractLifecycleState(
  value: unknown,
): asserts value is IContractLifecycleState {
  const parsed = lifecycleState.safeParse(value);
  if (!parsed.success)
    throw new Error(`Invalid contract lifecycle: ${parsed.error.message}`);
}
