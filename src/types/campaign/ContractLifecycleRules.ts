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
