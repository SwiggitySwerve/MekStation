/**
 * The awaited authority checkpoint for campaign creation (umbrella 10.1).
 *
 * Creation already awaits two of its six authority pieces. The stored
 * campaign record is awaited on both creation paths - the wizard at
 * `CreateCampaignPage.submit.ts` and the co-op host at
 * `CampaignCoopEntryPanel.tsx` - and the genesis branch is awaited inside
 * the PUT route before the create ack (#1263). The other four are not
 * awaited at all: the GM's seat, the two tactical player-slot
 * placeholders and force ownership are first written when a socket
 * connects, and unit references are never resolved. A process restart
 * between the acknowledgement and the first socket leaves a campaign
 * that reports itself created and has no durable GM.
 *
 * This is the checkpoint that closes that gap. It runs the six stages IN
 * ORDER, awaits each one, and returns `failed` with the stage that
 * refused - so a caller that has not yet acknowledged creation can stay
 * on a truthful failure rather than exposing a half-built campaign. It
 * commits nothing after a refusal, which is what makes the ordering
 * observable rather than decorative.
 *
 * WHAT IT REUSES rather than rebuilds: the stored envelope comes from
 * `CampaignPersistenceService`, the genesis proof is the journal-native
 * cutover marker written by `campaignSourceGenesis`, the GM seat is the
 * durable membership from migration 17, and slot ownership is the force
 * claim from migration 19. This module owns the ORDER and the refusals,
 * not a second copy of any of those records.
 *
 * WHY SLOT OWNERSHIP RIDES THE FORCE-CLAIM TABLE: that table is declared
 * additive-only with no foreign keys, keyed (campaign, session, mission,
 * force), and its own migration says a claim row "records who asked first
 * and never becomes a second authority" on whether the mission exists.
 * Creation-time ownership is recorded under the reserved mission id
 * below, so it can never collide with a real mission's per-mission
 * claims - a player claiming a force for mission M is a different row.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 *   ("Campaign Creation Has an Awaited Authority Checkpoint")
 */

import type { IForce } from '@/types/campaign/Force';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';
import type { ICustomUnitRecord } from '@/types/persistence/UnitPersistence';

import type { ICampaignCutoverMarker } from './campaignAuthorityMigration';

import {
  type IAdoptedUnitReference,
  type TacticalPlayerSlot,
  adoptRosterUnitReference,
} from './campaignAdoptedUnitReference';

/**
 * Reserved mission id for creation-time force ownership. Real mission
 * ids are uuids, so this cannot shadow one; the prefix says out loud
 * that the row belongs to creation rather than to play.
 */
export const CAMPAIGN_CREATION_MISSION_ID = 'campaign-creation';

/**
 * The reserved participant identity a tactical slot holds before a
 * person does. The placeholder is what makes the slot durable at
 * creation: without it, "this campaign has two tactical seats and slot 1
 * owns this force" is a fact that only exists once somebody connects.
 */
export function playerSlotPlaceholderId(slot: TacticalPlayerSlot): string {
  return `campaign-player-slot:${slot}`;
}

/** The six authority pieces, in the order the requirement names them. */
export type CampaignCreationCheckpointStage =
  | 'campaign-record'
  | 'genesis-branch'
  | 'gm-membership'
  | 'player-slots'
  | 'force-ownership'
  | 'unit-references';

/** One committed tactical slot. `forceId` is null when nothing to own yet. */
export interface ICommittedPlayerSlot {
  readonly slot: TacticalPlayerSlot;
  readonly placeholderParticipantId: string;
  readonly forceId: string | null;
}

export type CampaignCreationCheckpointResult =
  | {
      readonly kind: 'committed';
      readonly campaignId: string;
      readonly sessionId: string;
      readonly gmParticipantId: string;
      /** `skipped` while journal authority is off - stated, not implied. */
      readonly genesisBranch: 'committed' | 'skipped';
      readonly slots: readonly ICommittedPlayerSlot[];
      readonly adoptedUnits: readonly IAdoptedUnitReference[];
    }
  | {
      readonly kind: 'failed';
      readonly stage: CampaignCreationCheckpointStage;
      readonly reason: string;
    };

/** Narrow mirrors of the store results this checkpoint consumes. */
type BindResultLike =
  | { readonly kind: 'bound' }
  | { readonly kind: 'already-bound' }
  | { readonly kind: 'gm-seat-taken' }
  | { readonly kind: 'tactical-seats-full'; readonly limit: number }
  | { readonly kind: 'revoked' };

type ClaimResultLike =
  | { readonly kind: 'claimed' }
  | { readonly kind: 'already-held' }
  | { readonly kind: 'held-by-other'; readonly participantId: string };

type CampaignReadLike =
  | { readonly kind: 'ok'; readonly record: SerializedCampaign }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'corrupt'; readonly id: string }
  | { readonly kind: 'invalid_authority'; readonly reason: string };

/**
 * Every durable write the checkpoint makes goes through a port, so the
 * ordering can be exercised against the real stores AND the refusals can
 * be provoked without contriving a database state for each one.
 *
 * The ports are allowed to be synchronous OR asynchronous: the shipped
 * stores are synchronous better-sqlite3 calls today, and typing the
 * seam as awaitable keeps a future async store from silently turning a
 * committed stage into a pending promise.
 */
export interface ICampaignCreationCheckpointPorts {
  readonly readCampaign: (
    campaignId: string,
  ) => CampaignReadLike | Promise<CampaignReadLike>;
  readonly readGenesisMarker: (
    campaignId: string,
  ) => ICampaignCutoverMarker | null | Promise<ICampaignCutoverMarker | null>;
  readonly bindParticipant: (input: {
    readonly campaignId: string;
    readonly sessionId: string;
    readonly participantId: string;
    readonly seat: 'gm' | 'player';
    readonly boundAt: string;
  }) => BindResultLike | Promise<BindResultLike>;
  readonly claimForce: (input: {
    readonly campaignId: string;
    readonly sessionId: string;
    readonly missionId: string;
    readonly forceId: string;
    readonly participantId: string;
    readonly claimedAt: string;
  }) => ClaimResultLike | Promise<ClaimResultLike>;
  readonly resolveCustomUnit: (unitRef: string) => ICustomUnitRecord | null;
}

export interface ICampaignCreationCheckpointInput {
  readonly campaignId: string;
  readonly sessionId: string;
  readonly gmParticipantId: string;
  readonly journalAuthorityEnabled: boolean;
  readonly committedAt: string;
  /**
   * Explicit slot assignment. Omitted at creation, where no GM command
   * has assigned anything yet, and the checkpoint derives it from the
   * campaign's own forces in stable id order.
   */
  readonly playerSlotForceIds?: Partial<Record<TacticalPlayerSlot, string>>;
}

function failed(
  stage: CampaignCreationCheckpointStage,
  reason: string,
): CampaignCreationCheckpointResult {
  return { kind: 'failed', stage, reason };
}

/**
 * Stage 1 - the authoritative campaign record. A campaign that is not
 * readable server-side cannot be the subject of any later commit, so
 * this both proves the record landed and supplies the envelope the
 * remaining stages read.
 */
async function readAuthoritativeCampaign(
  ports: ICampaignCreationCheckpointPorts,
  campaignId: string,
): Promise<
  | { readonly kind: 'ok'; readonly record: SerializedCampaign }
  | {
      readonly kind: 'failed';
      readonly result: CampaignCreationCheckpointResult;
    }
> {
  const read = await ports.readCampaign(campaignId);
  if (read.kind === 'ok') return read;
  return {
    kind: 'failed',
    result: failed(
      'campaign-record',
      `authoritative campaign record is ${read.kind}`,
    ),
  };
}

/**
 * Stage 2 - the genesis branch. Under journal authority the campaign's
 * lineage starts at the genesis snapshot, and the journal-native marker
 * is the durable proof it was appended. While the cutover flag is off
 * there is no branch to await, and the result says `skipped` rather than
 * claiming a commit that did not happen.
 */
async function awaitGenesisBranch(
  ports: ICampaignCreationCheckpointPorts,
  input: ICampaignCreationCheckpointInput,
): Promise<'committed' | 'skipped' | CampaignCreationCheckpointResult> {
  if (!input.journalAuthorityEnabled) return 'skipped';
  const marker = await ports.readGenesisMarker(input.campaignId);
  if (marker === null) {
    return failed('genesis-branch', 'genesis branch is not committed');
  }
  return 'committed';
}

/**
 * Slot assignment at creation: the campaign's own forces in stable id
 * order, slot 1 first. Deterministic so a restart derives the same map,
 * and deliberately modest - reassigning a force to the other player is a
 * GM command, not something creation guesses at.
 */
function deriveSlotForceIds(
  forces: ReadonlyArray<readonly [string, IForce]>,
  explicit: Partial<Record<TacticalPlayerSlot, string>> | undefined,
): Record<TacticalPlayerSlot, string | null> {
  if (explicit) {
    return { 1: explicit[1] ?? null, 2: explicit[2] ?? null };
  }
  const ordered = [...forces]
    .map(([forceId]) => forceId)
    .sort((left, right) => left.localeCompare(right));
  return { 1: ordered[0] ?? null, 2: ordered[1] ?? null };
}

/**
 * Stage 4 - the two tactical player-slot placeholders. The slots are
 * minted here; the only way this stage refuses is a map that gives both
 * tactical players the SAME force, which is not a two-player campaign
 * and would make ownership unanswerable the moment either of them moved.
 */
function mintPlayerSlots(
  slotForceIds: Record<TacticalPlayerSlot, string | null>,
):
  | { readonly kind: 'minted'; readonly slots: readonly ICommittedPlayerSlot[] }
  | {
      readonly kind: 'failed';
      readonly result: CampaignCreationCheckpointResult;
    } {
  const first = slotForceIds[1];
  if (first !== null && first === slotForceIds[2]) {
    return {
      kind: 'failed',
      result: failed(
        'player-slots',
        `both tactical slots were assigned force ${first}`,
      ),
    };
  }
  const slots: readonly ICommittedPlayerSlot[] = ([1, 2] as const).map(
    (slot) => ({
      slot,
      placeholderParticipantId: playerSlotPlaceholderId(slot),
      forceId: slotForceIds[slot],
    }),
  );
  return { kind: 'minted', slots };
}

/**
 * Stage 5 - force ownership. Each slot that has a force claims it under
 * the reserved creation mission id. `already-held` is the placeholder's
 * own earlier claim (a retried creation), which is not an error;
 * `held-by-other` means somebody else owns that force in this session
 * and creation must not proceed as if it did not.
 */
async function commitSlotOwnership(
  ports: ICampaignCreationCheckpointPorts,
  input: ICampaignCreationCheckpointInput,
  slots: readonly ICommittedPlayerSlot[],
): Promise<CampaignCreationCheckpointResult | null> {
  for (const slot of slots) {
    if (slot.forceId === null) continue;
    const claim = await ports.claimForce({
      campaignId: input.campaignId,
      sessionId: input.sessionId,
      missionId: CAMPAIGN_CREATION_MISSION_ID,
      forceId: slot.forceId,
      participantId: slot.placeholderParticipantId,
      claimedAt: input.committedAt,
    });
    if (claim.kind === 'held-by-other') {
      return failed(
        'force-ownership',
        `force ${slot.forceId} is held by ${claim.participantId}`,
      );
    }
  }
  return null;
}

/**
 * Stage 6 - canonical unit references. Every roster unit the campaign
 * adopted must resolve, and a custom design must resolve to its durable
 * record with its construction identity intact (task 10.2). One
 * unresolved unit fails the whole checkpoint: adopting the rest would
 * publish a campaign whose roster silently lost a player's design.
 */
function adoptUnitReferences(
  ports: ICampaignCreationCheckpointPorts,
  record: SerializedCampaign,
  adoptedAt: string,
):
  | {
      readonly kind: 'adopted';
      readonly units: readonly IAdoptedUnitReference[];
    }
  | {
      readonly kind: 'failed';
      readonly result: CampaignCreationCheckpointResult;
    } {
  const adopted: IAdoptedUnitReference[] = [];
  for (const projection of record.body.rosterProjection?.units ?? []) {
    const result = adoptRosterUnitReference({
      projection,
      adoptedAt,
      resolveCustomUnit: ports.resolveCustomUnit,
    });
    if (result.kind === 'unresolved') {
      return {
        kind: 'failed',
        result: failed(
          'unit-references',
          `roster unit ${result.unitId} is ${result.reason}`,
        ),
      };
    }
    adopted.push(result.reference);
  }
  return { kind: 'adopted', units: adopted };
}

/**
 * Commit every authority piece campaign creation depends on, in order,
 * and report the stage that refused if one does.
 *
 * The caller acknowledges creation ONLY on `committed`. Nothing here
 * publishes, broadcasts or navigates - a checkpoint that told anybody
 * about the campaign before its last stage landed would be the bug it
 * exists to prevent.
 */
export async function commitCampaignCreationCheckpoint(
  ports: ICampaignCreationCheckpointPorts,
  input: ICampaignCreationCheckpointInput,
): Promise<CampaignCreationCheckpointResult> {
  const campaign = await readAuthoritativeCampaign(ports, input.campaignId);
  if (campaign.kind === 'failed') return campaign.result;

  const genesis = await awaitGenesisBranch(ports, input);
  if (typeof genesis !== 'string') return genesis;

  const gm = await ports.bindParticipant({
    campaignId: input.campaignId,
    sessionId: input.sessionId,
    participantId: input.gmParticipantId,
    seat: 'gm',
    boundAt: input.committedAt,
  });
  if (gm.kind !== 'bound' && gm.kind !== 'already-bound') {
    return failed('gm-membership', `gm seat refused: ${gm.kind}`);
  }

  const slotForceIds = deriveSlotForceIds(
    campaign.record.body.forces,
    input.playerSlotForceIds,
  );
  const minted = mintPlayerSlots(slotForceIds);
  if (minted.kind === 'failed') return minted.result;

  const ownership = await commitSlotOwnership(ports, input, minted.slots);
  if (ownership !== null) return ownership;

  const units = adoptUnitReferences(ports, campaign.record, input.committedAt);
  if (units.kind === 'failed') return units.result;

  return {
    kind: 'committed',
    campaignId: input.campaignId,
    sessionId: input.sessionId,
    gmParticipantId: input.gmParticipantId,
    genesisBranch: genesis,
    slots: minted.slots,
    adoptedUnits: units.units,
  };
}
