/** Pure whole-unit recovery preparation and persisted-input validation. */
import { z } from 'zod';

import type { RosterUnitSource } from '@/types/campaign/RosterUnitSource';
import type { ISalvageUnitRecovery } from '@/types/campaign/Salvage';
import type { IUnitCombatDelta } from '@/types/combat/CombatOutcome';

import { parseRosterUnitSource } from '@/types/campaign/RosterUnitSource';

import { applyUnitDelta } from '../processors/postBattleProcessor.helpers';

const identifier = z
  .string()
  .min(1)
  .refine((value) => value.trim() === value);
const remaining = z.record(z.string(), z.number().finite().nonnegative());
const locations = remaining.refine((value) => Object.keys(value).length > 0);
const source = z.custom<RosterUnitSource>(
  (value) => parseRosterUnitSource(value).kind === 'valid',
);
const recoverySchema = z
  .object({
    unitRef: identifier,
    unitSource: source.optional(),
    sourceVersion: z.number().int().positive().safe().optional(),
    combatState: z
      .object({
        unitId: identifier,
        currentArmorPerLocation: locations,
        currentStructurePerLocation: locations,
        destroyedLocations: z.array(identifier),
        destroyedComponents: z.array(
          z
            .object({
              location: identifier,
              slot: z.number().int(),
              componentType: identifier,
              name: identifier,
              destroyedAt: identifier,
            })
            .strict(),
        ),
        heatEnd: z.number().finite().nonnegative(),
        ammoRemaining: remaining,
        combatReady: z.boolean(),
        lastCombatOutcomeId: identifier,
        lastUpdated: z.string().datetime({ offset: true }),
      })
      .strict(),
  })
  .strict();

const candidateSchema = z.object({
  source: z.literal('unit'),
  unitId: identifier,
  destroyedFromBattle: identifier,
  recovery: recoverySchema,
});

export type SalvageUnitRecoveryResult =
  | {
      readonly kind: 'ready';
      readonly recovery: ISalvageUnitRecovery & {
        readonly unitSource: RosterUnitSource;
      };
    }
  | { readonly kind: 'refused'; readonly reason: string };

function resolveRecoverySource(
  recorded: RosterUnitSource | undefined,
  unitRef: string,
  confirmedCanonicalUnitRef: string | undefined,
): RosterUnitSource | undefined {
  return recorded !== undefined
    ? recorded
    : confirmedCanonicalUnitRef === unitRef
      ? 'canonical'
      : undefined;
}

/**
 * A caller may supply a reference confirmed by the canonical unit service.
 * It must be the exact recorded ref, and never overrides an explicit source.
 * This validates recovery facts; enrollment separately validates entitlement
 * and campaign ownership before any mutation.
 */
export function validateSalvageUnitRecovery(
  candidate: unknown,
  confirmedCanonicalUnitRef?: string,
): SalvageUnitRecoveryResult {
  const parsed = candidateSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      kind: 'refused',
      reason:
        'Salvage is missing valid recorded identity or recovered combat state.',
    };
  }
  const { recovery, unitId, destroyedFromBattle } = parsed.data;
  if (
    recovery.combatState.unitId !== unitId ||
    recovery.combatState.lastCombatOutcomeId !== destroyedFromBattle
  ) {
    return {
      kind: 'refused',
      reason: 'Recovered combat state belongs to a different unit or battle.',
    };
  }
  const unitSource = resolveRecoverySource(
    recovery.unitSource,
    recovery.unitRef,
    confirmedCanonicalUnitRef,
  );
  if (!unitSource) {
    return {
      kind: 'refused',
      reason:
        'Salvage source is unrecorded and the design has not been confirmed canonical.',
    };
  }
  if (unitSource === 'custom' && recovery.sourceVersion === undefined) {
    return {
      kind: 'refused',
      reason: 'Custom salvage has no recorded historical design version.',
    };
  }
  return { kind: 'ready', recovery: { ...recovery, unitSource } };
}

/** Preserve the outcome's remaining values through the existing damage owner. */
export function prepareSalvageUnitRecovery(
  delta: IUnitCombatDelta,
  matchId: string,
  capturedAt: string,
  confirmedCanonicalUnitRef?: string,
): ISalvageUnitRecovery | undefined {
  if (delta.unitRef === undefined) return undefined;
  const unitSource = resolveRecoverySource(
    delta.unitSource,
    delta.unitRef,
    confirmedCanonicalUnitRef,
  );
  return {
    unitRef: delta.unitRef,
    ...(unitSource !== undefined ? { unitSource } : {}),
    ...(delta.sourceVersion !== undefined
      ? { sourceVersion: delta.sourceVersion }
      : {}),
    combatState: applyUnitDelta(undefined, delta, matchId, capturedAt),
  };
}
