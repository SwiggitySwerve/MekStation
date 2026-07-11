/**
 * Scenario Pack Schemas
 *
 * zod validation schemas for the scenario-pack layer (design D3): the
 * campaign-pack envelope schema (the deserializer-required field floor +
 * the id-linkage fields the stamper depends on), the encounter-pack
 * (match-log) schema (`GameCreated`-first + finite seed), and the pack
 * manifest-entry schema (design D2). Every schema failure surfaces the
 * offending path — zod's default behavior — so a drifted pack fails
 * loud, never soft-skips (the wound this capability defends against:
 * `isValidPutBody`'s 4 shallow checks + the unchecked read-side casts,
 * `src/pages/api/campaigns/[id].ts:51-69`,
 * `src/services/campaignPersistence/CampaignPersistenceService.ts:79/130/201`).
 *
 * Unknown/additive keys pass through on every object schema here
 * (forward tolerance for envelope evolution, matching the migration
 * ladder's own graceful-degradation stance) — the zero-residue scan in
 * `packStamping.ts` is the mechanical backstop for id-bearing fields
 * this enumeration doesn't (yet) know about.
 *
 * @spec openspec/changes/add-scenario-packs/specs/scenario-packs/spec.md
 * @spec openspec/changes/add-scenario-packs/design.md (D2, D3)
 */

import { z } from 'zod';

import { CURRENT_CAMPAIGN_SCHEMA_VERSION } from '@/lib/campaign/persistence/campaignMigration';

// =============================================================================
// Shared leaf schemas
// =============================================================================

/** A non-empty string — every id field in a pack payload needs at least this. */
const idStringSchema = z.string().min(1);

/**
 * A date-time string validated **parseable**, not strictly ISO-shaped.
 * Mirrors the production read path exactly: `deserializeCampaignBody`
 * rehydrates date fields via a bare `new Date(value)` with no format
 * check, so `new Date(<garbage>)` silently produces an `Invalid Date`
 * that loads and lies (design D3's silent-stale-envelope wound). This
 * schema is the loader's fail-loud substitute for that missing check.
 */
const parseableDateTimeSchema = z.string().superRefine((value, ctx) => {
  if (Number.isNaN(new Date(value).getTime())) {
    ctx.addIssue({
      code: 'custom',
      message: `must be a parseable date-time string, got "${value}"`,
    });
  }
});

// =============================================================================
// Campaign pack schema — the deserializer floor + id-linkage fields
// =============================================================================

/**
 * JSON-safe transaction shape (`SerializedTransaction`). Every field
 * `deserializeFinances` (`serializeCampaign.ts:82`) reads to rehydrate a
 * `Transaction` — absence throws downstream.
 */
const serializedTransactionSchema = z
  .object({
    id: idStringSchema,
    type: z.string(),
    amount: z.number().finite(),
    date: parseableDateTimeSchema,
    description: z.string(),
  })
  .passthrough();

/**
 * `SerializedFinances` — `deserializeFinances` maps over `transactions`
 * and wraps `balance` in a `Money`; both are hard-read (design D3).
 * `loans` is optional on the interface and untouched by the floor.
 */
const serializedFinancesSchema = z
  .object({
    transactions: z.array(serializedTransactionSchema),
    balance: z.number().finite(),
  })
  .passthrough();

/**
 * The id-bearing slice of `IForce` the stamper's graph-consistency check
 * depends on (design D3: "the forces entry tuples and IForce id
 * fields"). The rest of `IForce`'s shape is not load-bearing for the
 * pack floor and passes through untouched.
 */
const serializedForceIdentitySchema = z
  .object({
    id: idStringSchema,
  })
  .passthrough();

/** `body.forces` — `[forceId, IForce][]`, rehydrated via `new Map(body.forces)`. */
const forceEntrySchema = z.tuple([
  idStringSchema,
  serializedForceIdentitySchema,
]);

/** The id-bearing slice of `IMission` (mirrors `serializedForceIdentitySchema`). */
const serializedMissionIdentitySchema = z
  .object({
    id: idStringSchema,
  })
  .passthrough();

/** `body.missions` — `[missionId, IMission][]`, rehydrated via `rehydrateMissionMap`. */
const missionEntrySchema = z.tuple([
  idStringSchema,
  serializedMissionIdentitySchema,
]);

/**
 * `SerializedCampaignRosterMissionRecord` (`SerializedCampaign.ts:129-140`).
 * `encounterId`/`gameSessionId` are the two verified cross-store
 * references (design D11.2) — optional here (their absence is the legal
 * post-strip shape a canonicalized pack carries), stripped by the
 * minter's canonicalizer, never rejected by this schema.
 */
const rosterMissionRecordSchema = z
  .object({
    id: idStringSchema,
    missionNumber: z.number().finite(),
    name: z.string(),
    result: z.enum(['victory', 'defeat', 'draw', 'pending']),
    encounterId: z.string().optional(),
    gameSessionId: z.string().optional(),
    campaignId: idStringSchema,
    deployedUnitIds: z.array(z.string()),
    completedAt: z.string().optional(),
    turnsPlayed: z.number().optional(),
  })
  .passthrough();

/**
 * `SerializedCampaignRosterState` — "full rosterProjection linkage"
 * (design D3): its own nested `campaignId`, the pilot entries' `pilotId`
 * (`CampaignRosterEntry.ts:55`), and the mission records above. `units`
 * is validated only for array shape — `IRosterUnitProjection`'s full
 * shape is not part of the deserializer floor.
 */
const rosterProjectionSchema = z
  .object({
    campaignId: idStringSchema,
    units: z.array(z.unknown()),
    pilots: z.array(z.object({ pilotId: idStringSchema }).passthrough()),
    missions: z.array(rosterMissionRecordSchema),
    activeMissionId: z.string().nullable(),
    missionCount: z.number(),
  })
  .passthrough();

/**
 * `SerializedCampaignBody` — the deserializer floor (design D3):
 * `deserializeCampaignBody` (`serializeCampaign.ts:209-270`) hard-reads
 * `id`, `name`, `currentDate`, `factionId`, `forces`, `rootForceId`,
 * `missions`, `finances`, `factionStandings`, `options`, `campaignType`,
 * `createdAt`, `updatedAt` — every one of those is required below.
 * `options`/`factionStandings`/`unitCombatStates` are validated only for
 * object shape (`z.record`) — deep-validating their contents is outside
 * the floor (the deserializer never destructures into them).
 */
const serializedCampaignBodySchema = z
  .object({
    id: idStringSchema,
    name: z.string(),
    currentDate: parseableDateTimeSchema,
    factionId: idStringSchema,
    forces: z.array(forceEntrySchema),
    rootForceId: idStringSchema,
    missions: z.array(missionEntrySchema),
    finances: serializedFinancesSchema,
    factionStandings: z.record(z.string(), z.unknown()),
    options: z.record(z.string(), z.unknown()),
    campaignType: z.string(),
    campaignStartDate: parseableDateTimeSchema.optional(),
    createdAt: parseableDateTimeSchema,
    updatedAt: parseableDateTimeSchema,
    unitCombatStates: z.record(z.string(), z.unknown()),
    unitMaxStates: z.record(z.string(), z.unknown()).optional(),
    rosterProjection: rosterProjectionSchema.optional(),
  })
  .passthrough();

/**
 * `SerializedCampaign` — the full envelope skeleton wrapping the body
 * floor above. `schemaVersion` is rejected outright when it claims a
 * version newer than this build's ladder understands (design D3: "A
 * pack claiming a FUTURE version fails loud — nothing can honestly have
 * minted it"); an older, migratable `schemaVersion` is accepted here —
 * the production migration ladder (`migrateSerializedCampaign`) is what
 * upgrades it on load, never this schema.
 */
export const campaignPackSchema = z
  .object({
    schemaVersion: z
      .number()
      .int()
      .nonnegative()
      .superRefine((value, ctx) => {
        if (value > CURRENT_CAMPAIGN_SCHEMA_VERSION) {
          ctx.addIssue({
            code: 'custom',
            message: `schemaVersion ${value} is newer than CURRENT_CAMPAIGN_SCHEMA_VERSION (${CURRENT_CAMPAIGN_SCHEMA_VERSION}) — no sanctioned minter can have produced it`,
          });
        }
      }),
    campaignId: idStringSchema,
    savedAt: parseableDateTimeSchema,
    originDeviceId: idStringSchema,
    version: z.number().int().nonnegative(),
    body: serializedCampaignBodySchema,
  })
  .passthrough();

export type CampaignPackPayload = z.infer<typeof campaignPackSchema>;

// =============================================================================
// Encounter (match-log) pack schema — GameCreated-first + finite seed
// =============================================================================

/**
 * One captured `IGameEvent`-shaped record (`GameSessionCoreTypes.ts`).
 * `type`/`sequence` drive the ordering + `GameCreated`-first rule below;
 * `payload` is validated deeply only for the `game_created` case (its
 * `config.seed`) — every other event type's payload passes through.
 */
const matchLogEventSchema = z
  .object({
    id: idStringSchema,
    gameId: idStringSchema,
    sequence: z.number().int().nonnegative(),
    timestamp: z.string(),
    type: z.string(),
    turn: z.number().int().nonnegative(),
    phase: z.string(),
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

/** The `matches` row fields (`IMatchMetadataRecord`, `matchLogStorageSchema.ts:24-30`). */
const matchesRowSchema = z
  .object({
    hostPeerId: z.string().nullable().optional(),
    guestPeerId: z.string().nullable().optional(),
    status: z.enum(['active', 'completed', 'abandoned']).optional(),
    lastActivity: z.string().optional(),
  })
  .passthrough();

/**
 * The encounter pack payload: a captured match-log event stream plus its
 * `matches`-row fields (design D3 / D4.2). Shape chosen to feed directly
 * into the shared `seedMatchLog(page, matchId, events, matchesRow)`
 * helper (`e2e/helpers/matchLogSeeding.ts`, W2 task 2.1) — `matchId` at
 * the top level (the row key + the remap target), `events` as the raw
 * ordered `IGameEvent` stream `seedMatchLog` wraps into `matchEvents`
 * records, `matchesRow` as its optional peer/status metadata.
 *
 * Validates the `GameCreated`-first rule and a finite persisted seed
 * (`InteractiveSession.persistence.ts:57-81` throws
 * `InteractiveSessionRecoveryCorruptError` otherwise;
 * `GameSessionUnitTypes.ts:81`'s `IGameConfig.seed` is what recovery
 * re-seeds from) — an unseeded or misordered matchlog is not
 * deterministically replayable and is rejected here, before any
 * IndexedDB write.
 */
export const encounterPackSchema = z
  .object({
    matchId: idStringSchema,
    events: z.array(matchLogEventSchema).min(1),
    matchesRow: matchesRowSchema.optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    const { events } = data;
    for (let i = 1; i < events.length; i += 1) {
      if (events[i].sequence <= events[i - 1].sequence) {
        ctx.addIssue({
          code: 'custom',
          path: ['events', i, 'sequence'],
          message: `matchlog events must be strictly ordered by sequence; sequence ${events[i].sequence} at index ${i} does not follow ${events[i - 1].sequence}`,
        });
        return;
      }
    }
    const first = events[0];
    if (!first || first.type !== 'game_created') {
      ctx.addIssue({
        code: 'custom',
        path: ['events', 0, 'type'],
        message: `the first matchlog event must be type "game_created", got "${first?.type ?? 'undefined'}"`,
      });
      return;
    }
    const seed = (first.payload as { config?: { seed?: unknown } } | undefined)
      ?.config?.seed;
    if (typeof seed !== 'number' || !Number.isFinite(seed)) {
      ctx.addIssue({
        code: 'custom',
        path: ['events', 0, 'payload', 'config', 'seed'],
        message:
          'the game_created event must carry a finite payload.config.seed',
      });
    }
  });

export type EncounterPackPayload = z.infer<typeof encounterPackSchema>;

// =============================================================================
// Manifest entry schema (design D2)
// =============================================================================

/**
 * The closed six-tag subsystem vocabulary. Kept literally equal to
 * `e2e/flows/manifest.ts`'s `FlowSubsystem` union — a guard test in
 * `packSchemas.test.ts` asserts the two vocabularies stay identical
 * (spec: "Subsystem vocabulary stays closed and aligned"). This is the
 * pack library's own copy so `src/` code never imports from `e2e/`
 * (design D5) — only the test file imports `e2e/flows/manifest.ts`, and
 * only as a guard.
 */
export const PACK_SUBSYSTEMS = [
  'navigation',
  'combat',
  'economy',
  'maintenance',
  'personnel',
  'experience',
] as const;

export type PackSubsystem = (typeof PACK_SUBSYSTEMS)[number];

const packSubsystemSchema = z.enum(PACK_SUBSYSTEMS);

/** Closed `postLoadActions` vocabulary (design D8) — deliberately hard to grow. */
export const POST_LOAD_ACTIONS = ['advance-day'] as const;
export type PostLoadAction = (typeof POST_LOAD_ACTIONS)[number];

const postLoadActionSchema = z.enum(POST_LOAD_ACTIONS);

/**
 * `parityAnchorJourney` binding format (design D2/D9):
 * `flow:<flowId>@<checkpoint>` | `anchor:<spec-basename>` |
 * `fast-forward:<fixtureId>`.
 */
const parityAnchorJourneySchema = z
  .string()
  .regex(
    /^(?:flow:[a-z0-9-]+@[a-z0-9-]+|anchor:[A-Za-z0-9._-]+|fast-forward:[a-z0-9-]+)$/,
    'parityAnchorJourney must match flow:<id>@<checkpoint> | anchor:<basename> | fast-forward:<fixtureId>',
  );

/** kebab-case pack id (design D2: "unique kebab-case `id`"). */
const packIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'pack id must be kebab-case');

const provenanceSchema = z
  .object({
    genesisSource: idStringSchema,
    mintedAt: parseableDateTimeSchema,
    baseCommit: z
      .string()
      .regex(/^[0-9a-f]{7,40}$/i, 'baseCommit must be a git SHA'),
  })
  .strict();

/** Campaign packs pin the envelope `schemaVersion` they were minted at. */
const campaignPinsSchema = z
  .object({
    schemaVersion: z.number().int().nonnegative(),
  })
  .strict();

/** Encounter packs pin the `MATCH_LOG_DB_VERSION` their capture ran against. */
const encounterPinsSchema = z
  .object({
    matchLogDbVersion: z.number().int().nonnegative(),
  })
  .strict();

const manifestEntryBaseFields = {
  id: packIdSchema,
  subsystems: z.array(packSubsystemSchema).min(1),
  viewports: z.array(z.string()),
  targetRoute: idStringSchema,
  parityAnchorJourney: parityAnchorJourneySchema,
  payloadPath: idStringSchema,
  provenance: provenanceSchema,
  postLoadActions: z.array(postLoadActionSchema),
} as const;

/**
 * A single pack registry entry (design D2). Discriminated on `kind` so a
 * campaign entry's `pins` shape (`schemaVersion`) and an encounter
 * entry's (`matchLogDbVersion`) cannot cross-contaminate.
 */
export const manifestEntrySchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('campaign'),
      pins: campaignPinsSchema,
      ...manifestEntryBaseFields,
    })
    .strict(),
  z
    .object({
      kind: z.literal('encounter'),
      pins: encounterPinsSchema,
      ...manifestEntryBaseFields,
    })
    .strict(),
]);

export type ManifestEntry = z.infer<typeof manifestEntrySchema>;

/**
 * The manifest module's own format version (design D2) — distinct from
 * and never conflated with the campaign envelope's `schemaVersion`. A
 * registry test asserts the registry module's declared `manifestVersion`
 * equals this constant, failing loud on mismatch (spec: "A stale
 * manifest version fails registry validation").
 */
export const MANIFEST_VERSION = 1;
