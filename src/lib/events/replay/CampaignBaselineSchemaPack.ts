/**
 * Campaign baseline schema pack (replay-safety PR 3).
 *
 * Strict concrete v1 payload schemas for all eight `CampaignEventType`
 * variants, registered at baseline v1 with no transitions. The nested
 * roster-unit / pilot / contract shapes are shared schemas because their
 * shapes are identical across payloads. The `satisfies` clause makes the
 * pack exhaustive against the canonical union at compile time in both
 * directions — a variant added to, removed from, or renamed in
 * `CampaignEventType` breaks this file until the pack (and the reviewed
 * inventory) is updated.
 *
 * Not wired to campaign authority or recovery: per the change law, packs
 * stay unwired from production replay until the task-11
 * exhaustive-composition proof.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import { z } from 'zod';

import type { CampaignEventType } from '@/types/campaign/CampaignSync';

import type { IReplayEventSchemaRegistration } from './ReplaySchemaRegistry';

const campaignRosterUnit = z
  .object({
    unitId: z.string(),
    designation: z.string(),
    status: z.enum(['operational', 'damaged', 'destroyed']),
    unitRef: z.string().optional(),
    unitSource: z.enum(['canonical', 'custom']).optional(),
  })
  .strict();

const campaignRosterPilot = z
  .object({ pilotId: z.string(), name: z.string() })
  .strict();

const campaignAcceptedContract = z
  .object({
    contractId: z.string(),
    name: z.string(),
    employerFactionId: z.string(),
  })
  .strict();

const campaignAuthoritativeState = z
  .object({
    campaignId: z.string(),
    day: z.number().finite(),
    balance: z.number().finite(),
    rosterUnits: z.record(z.string(), campaignRosterUnit),
    forceUnits: z.record(z.string(), z.array(z.string())).optional(),
    pilots: z.record(z.string(), campaignRosterPilot),
    contracts: z.record(z.string(), campaignAcceptedContract),
    factionStanding: z.record(z.string(), z.number().finite()),
    salvagePool: z.number().finite(),
  })
  .strict();

const CAMPAIGN_BASELINE_PAYLOAD_SCHEMAS = {
  CampaignDayAdvanced: z.object({ newDay: z.number().int().finite() }).strict(),
  FundsChanged: z
    .object({
      delta: z.number().finite(),
      reason: z.string(),
      balance: z.number().finite(),
    })
    .strict(),
  PilotHired: z
    .object({ pilot: campaignRosterPilot, cost: z.number().finite() })
    .strict(),
  ContractAccepted: z.object({ contract: campaignAcceptedContract }).strict(),
  RosterUnitChanged: z
    .object({
      change: z.enum(['added', 'removed', 'repaired']),
      unit: campaignRosterUnit,
    })
    .strict(),
  SalvageAllocated: z
    .object({
      value: z.number().finite(),
      poolRemaining: z.number().finite(),
      recoveredUnit: campaignRosterUnit.optional(),
    })
    .strict(),
  ParticipantRemoved: z
    .object({ participantId: z.string(), reason: z.string().optional() })
    .strict(),
  CampaignSnapshotPublished: z
    .object({
      state: campaignAuthoritativeState,
      matchId: z.string().optional(),
      revision: z.number().int().finite().optional(),
    })
    .strict(),
} satisfies Record<CampaignEventType, z.ZodType>;

/** The eight canonical campaign discriminants this pack registers. */
export const CAMPAIGN_BASELINE_EVENT_TYPES: readonly CampaignEventType[] =
  Object.freeze(
    Object.keys(CAMPAIGN_BASELINE_PAYLOAD_SCHEMAS) as CampaignEventType[],
  );

/**
 * Every campaign variant registered at baseline v1, ready for composition
 * into a `ReplaySchemaRegistry`.
 */
export const CAMPAIGN_BASELINE_SCHEMA_PACK: readonly IReplayEventSchemaRegistration[] =
  Object.freeze(
    (
      Object.entries(CAMPAIGN_BASELINE_PAYLOAD_SCHEMAS) as readonly [
        CampaignEventType,
        z.ZodType,
      ][]
    ).map(([eventType, schema]) =>
      Object.freeze({
        eventType,
        targetSchemaVersion: 1,
        schemas: [
          {
            schemaVersion: 1,
            schemaId: `campaign.${eventType}.v1`,
            parse: (payload: unknown) => schema.parse(payload),
          },
        ],
        transitions: [],
      }),
    ),
  );
