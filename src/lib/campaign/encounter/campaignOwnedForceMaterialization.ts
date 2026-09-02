/**
 * Authoritative owned-force materialization (umbrella task 10.3).
 *
 * Scenario materialization builds its player force from a flat roster
 * list handed in by the caller. That list has no branch, no revision and
 * no owner: two tactical players share one campaign roster, so "these are
 * the units going to the mission" cannot say WHOSE they are, and nothing
 * checks that the caller's picture of the campaign is still the current
 * one. A client holding a superseded view launches a stale encounter and
 * is told nothing.
 *
 * This module answers both questions before anything is created:
 *
 * - **From which history?** The active head is read from the branch store
 *   rather than assumed. Production is genesis-only, so today that head is
 *   the backfilled root at its effective generation - but it is READ, never
 *   named here, because a hard-coded branch id would keep answering `root`
 *   on the day a candidate is activated and would materialize the wrong
 *   lineage while looking correct.
 * - **Whose forces?** Ownership comes from the durable claim rows the
 *   creation checkpoint wrote (the reserved creation mission id, held by
 *   each slot's placeholder) with per-mission claims taking precedence for
 *   the mission being launched. A force a slot owned at creation that some
 *   other participant now holds for THIS mission is a stale ownership
 *   revision, not a force to quietly materialize.
 *
 * IT APPENDS NOTHING AND CREATES NOTHING. Every path is a read, and the
 * refusal is returned rather than thrown so the caller can refuse before
 * its first POST. That ordering is the whole point: a refusal that arrived
 * after the encounter existed would be a report, not a gate.
 *
 * The two tactical forces materialize into ONE player side. That is the
 * shipped co-op doctrine, not a shortcut - `composeCoopEncounter` builds
 * "ONE IEncounter whose force roster is the union of both players'
 * selected forces, all assigned to the SAME side against the encounter's
 * OpFor" (add-coop-campaign-play D1), and `IEncounter` carries a single
 * `playerForceId`. Per-slot attribution survives on the returned units so
 * seat/unit-ownership validation can still reject a cross-player intent.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 *   ("Scenario Materialization Uses Authoritative Owned Forces")
 */

import type { IAdoptedUnitReference } from '@/lib/campaign/authority/campaignAdoptedUnitReference';
import type { TacticalPlayerSlot } from '@/lib/campaign/authority/campaignAdoptedUnitReference';
import type {
  ExpectedHeadRefusalCode,
  IActiveBranchHead,
  IExpectedBranchHead,
  ExpectedHeadVerdict,
} from '@/lib/events/journal/EventHistoryExpectedHead';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';
import type { ICustomUnitRecord } from '@/types/persistence/UnitPersistence';

import { adoptRosterUnitReference } from '@/lib/campaign/authority/campaignAdoptedUnitReference';
import {
  CAMPAIGN_CREATION_MISSION_ID,
  playerSlotPlaceholderId,
} from '@/lib/campaign/authority/campaignCreationCheckpoint';
import { EXPECTED_HEAD_RESYNC_ACTION } from '@/lib/events/journal/EventHistoryExpectedHead';

import type { AssignedForceUnit } from './materializeCampaignMissionEncounter.forceUnits';

/** The tactical slots a launch materializes, in slot order. */
export const TACTICAL_PLAYER_SLOTS: readonly TacticalPlayerSlot[] = [1, 2];

/**
 * Refusal codes. The three head codes are re-used verbatim from
 * `EventHistoryExpectedHead` so a client already handling STALE_BRANCH /
 * STALE_REVISION / STALE_GENERATION needs no second vocabulary; the
 * ownership and reference codes are this module's own.
 */
export type OwnedForceRefusalCode =
  | ExpectedHeadRefusalCode
  /** A force this slot owns is held by somebody else for this mission. */
  | 'STALE_OWNERSHIP'
  /** The slot owns no force at the head being materialized from. */
  | 'UNOWNED_SLOT'
  /** A slot's force names a unit the campaign record cannot resolve. */
  | 'UNRESOLVED_SLOT_UNIT';

/**
 * One unit a slot fields: its adopted reference plus the pilot the roster
 * assigned it. The pilot rides here rather than on the reference because
 * `IAdoptedUnitReference` describes the DESIGN, and who is sitting in it
 * is a roster fact that changes without the design changing.
 */
export interface IOwnedSlotUnit {
  readonly reference: IAdoptedUnitReference;
  readonly pilotRef?: string;
}

/** One tactical slot's authoritative contribution to the player side. */
export interface IOwnedSlotForce {
  readonly slot: TacticalPlayerSlot;
  readonly forceId: string;
  readonly ownerParticipantId: string;
  readonly units: readonly IOwnedSlotUnit[];
}

export type OwnedForceMaterializationResult =
  | {
      readonly kind: 'materialized';
      readonly head: IActiveBranchHead;
      readonly slots: readonly IOwnedSlotForce[];
    }
  | {
      readonly kind: 'refused';
      readonly code: OwnedForceRefusalCode;
      readonly reason: string;
      /** The head the authority actually holds - the current revision. */
      readonly activeHead: IActiveBranchHead;
      readonly resyncAction: typeof EXPECTED_HEAD_RESYNC_ACTION;
    };

type CampaignReadLike =
  | { readonly kind: 'ok'; readonly record: SerializedCampaign }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'corrupt'; readonly id: string }
  | { readonly kind: 'invalid_authority'; readonly reason: string };

/**
 * The durable reads this module needs, as ports.
 *
 * Ports rather than direct imports because materialization is driven from
 * the browser launch path, which has no SQLite: the caller resolves these
 * server-side and the module stays a pure decision over their answers.
 */
export interface IOwnedForceMaterializationPorts {
  /** Compare a claimed head against the authority's, reading neither. */
  readonly validateHead: (
    campaignId: string,
    currentRevision: number,
    expected: IExpectedBranchHead,
  ) => ExpectedHeadVerdict;
  /** Forces a participant holds for a mission, ascending by id. */
  readonly readForcesHeldBy: (input: {
    readonly campaignId: string;
    readonly sessionId: string;
    readonly missionId: string;
    readonly participantId: string;
  }) => readonly string[];
  /** Who holds this force for this mission, or null. */
  readonly readForceHolder: (input: {
    readonly campaignId: string;
    readonly sessionId: string;
    readonly missionId: string;
    readonly forceId: string;
  }) => string | null;
  readonly readCampaign: (campaignId: string) => CampaignReadLike;
  readonly resolveCustomUnit: (unitRef: string) => ICustomUnitRecord | null;
}

export interface IOwnedForceMaterializationInput {
  readonly campaignId: string;
  readonly sessionId: string;
  readonly missionId: string;
  /** The revision the caller read from the journal for this stream. */
  readonly currentRevision: number;
  /** The head the launching client believes is current. */
  readonly expectedHead: IExpectedBranchHead;
  readonly materializedAt: string;
}

function refuse(
  code: OwnedForceRefusalCode,
  reason: string,
  activeHead: IActiveBranchHead,
): OwnedForceMaterializationResult {
  return Object.freeze({
    kind: 'refused',
    code,
    reason,
    activeHead,
    resyncAction: EXPECTED_HEAD_RESYNC_ACTION,
  });
}

/**
 * The force a slot owns for this mission.
 *
 * A per-mission claim by the slot's placeholder wins over the creation
 * claim, so a GM who reassigns a force for one mission does not have to
 * rewrite the campaign's creation-time ownership to do it. A slot holding
 * several forces for a mission contributes all of them; the first is only
 * used to name the slot in diagnostics.
 */
function ownedForceIdsForSlot(
  ports: IOwnedForceMaterializationPorts,
  input: IOwnedForceMaterializationInput,
  slot: TacticalPlayerSlot,
): readonly string[] {
  const participantId = playerSlotPlaceholderId(slot);
  const perMission = ports.readForcesHeldBy({
    campaignId: input.campaignId,
    sessionId: input.sessionId,
    missionId: input.missionId,
    participantId,
  });
  if (perMission.length > 0) return perMission;
  return ports.readForcesHeldBy({
    campaignId: input.campaignId,
    sessionId: input.sessionId,
    missionId: CAMPAIGN_CREATION_MISSION_ID,
    participantId,
  });
}

/**
 * Resolve one force's units against the campaign record at the head.
 *
 * Returns null when the force is unknown to the record or names a unit no
 * roster projection covers - a force that references a unit the campaign
 * cannot describe is not materializable, and fielding the units it CAN
 * describe would put a short lance on the map without saying so.
 */
function unitsForForce(
  ports: IOwnedForceMaterializationPorts,
  record: SerializedCampaign,
  forceId: string,
  materializedAt: string,
): readonly IOwnedSlotUnit[] | null {
  const force = record.body.forces.find(([id]) => id === forceId)?.[1];
  if (!force) return null;
  const projections = record.body.rosterProjection?.units ?? [];
  const adopted: IOwnedSlotUnit[] = [];
  for (const unitId of force.unitIds) {
    const projection = projections.find((unit) => unit.unitId === unitId);
    if (!projection) return null;
    const result = adoptRosterUnitReference({
      projection,
      adoptedAt: materializedAt,
      resolveCustomUnit: ports.resolveCustomUnit,
    });
    if (result.kind === 'unresolved') return null;
    adopted.push({
      reference: result.reference,
      ...(projection.pilotId === undefined
        ? {}
        : { pilotRef: projection.pilotId }),
    });
  }
  return adopted;
}

/**
 * Materialize both tactical slots' owned forces at the authoritative head,
 * or refuse with the current head and a recovery action.
 *
 * Order is deliberate: the head is checked FIRST, before any ownership or
 * unit read, because a stale client's ownership answers describe a world
 * that has moved and reporting them would invite it to retry rather than
 * resync.
 */
export function materializeOwnedPlayerForces(
  ports: IOwnedForceMaterializationPorts,
  input: IOwnedForceMaterializationInput,
): OwnedForceMaterializationResult {
  const verdict = ports.validateHead(
    input.campaignId,
    input.currentRevision,
    input.expectedHead,
  );
  if (verdict.kind === 'refused') {
    return refuse(
      verdict.code,
      `launch head is stale (${verdict.code})`,
      verdict.activeHead,
    );
  }
  const head = verdict.activeHead;

  const read = ports.readCampaign(input.campaignId);
  if (read.kind !== 'ok') {
    return refuse(
      'UNRESOLVED_SLOT_UNIT',
      `authoritative campaign record is ${read.kind}`,
      head,
    );
  }

  const slots: IOwnedSlotForce[] = [];
  for (const slot of TACTICAL_PLAYER_SLOTS) {
    const participantId = playerSlotPlaceholderId(slot);
    const forceIds = ownedForceIdsForSlot(ports, input, slot);
    if (forceIds.length === 0) {
      return refuse('UNOWNED_SLOT', `slot ${slot} owns no force`, head);
    }
    for (const forceId of forceIds) {
      // Ownership is re-read against the mission being launched. A force
      // the slot owned at creation that somebody else now holds for this
      // mission is exactly the superseded-ownership case the requirement
      // names, and it is refused before anything is created.
      const holder = ports.readForceHolder({
        campaignId: input.campaignId,
        sessionId: input.sessionId,
        missionId: input.missionId,
        forceId,
      });
      if (holder !== null && holder !== participantId) {
        return refuse(
          'STALE_OWNERSHIP',
          `force ${forceId} is held by ${holder} for mission ${input.missionId}`,
          head,
        );
      }
      const units = unitsForForce(
        ports,
        read.record,
        forceId,
        input.materializedAt,
      );
      if (units === null) {
        return refuse(
          'UNRESOLVED_SLOT_UNIT',
          `force ${forceId} names a unit the campaign record cannot resolve`,
          head,
        );
      }
      slots.push({ slot, forceId, ownerParticipantId: participantId, units });
    }
  }

  return Object.freeze({ kind: 'materialized', head, slots });
}

/**
 * The player side's units, in slot order.
 *
 * The union both slots field, flattened for the single `playerForceId`
 * the encounter carries. Slot attribution is not lost - it stays on
 * `slots` - this is only the shape the force-assignment calls need.
 */
export function ownedPlayerForceUnits(
  slots: readonly IOwnedSlotForce[],
): readonly AssignedForceUnit[] {
  return slots.flatMap((slot) =>
    slot.units.map((unit) => ({
      unitRef: unit.reference.unitRef,
      ...(unit.pilotRef === undefined ? {} : { pilotRef: unit.pilotRef }),
    })),
  );
}
