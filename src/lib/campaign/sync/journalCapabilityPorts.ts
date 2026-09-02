/**
 * JournalCampaignEventStore capability compose (seam 2.2-COMPOSE).
 *
 * Branch methods exist only when the caller handed a branch store —
 * fabricating them would make hasHistoryBranchStore lie. Participant
 * and cursor tables already live in SQLiteService, so those ports are
 * always attached and forward to the shipped helpers.
 */

import type Database from 'better-sqlite3';

import type {
  IParticipantAckRequest,
  IParticipantDeliveryCursor,
} from '@/lib/campaign/delivery/participantDeliveryCursor';
import type { IProjectCampaignStreamDeps } from '@/lib/campaign/delivery/projectCampaignStreamForGrant';
import type { ICampaignGrant } from '@/lib/campaign/grants/ICampaignGrantStore';
import type {
  EventHistoryBranchStatus,
  IEventHistoryBranch,
  IEventHistoryStreamRef,
} from '@/lib/events/journal/EventHistoryBranchContract';
import type { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import type {
  ICampaignSessionParticipantPort,
  IEventHistoryBranchPort,
  IParticipantAckAuthorization,
  IParticipantDeliveryCursorPort,
} from '@/lib/events/storeCapabilityPorts';

import {
  readParticipantDeliveryCursor,
  recordParticipantAcknowledgement,
} from '@/lib/campaign/delivery/participantDeliveryCursor';
import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';
import { AuthorizedViewerResolver } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import {
  activeCampaignSessionMembership,
  bindCampaignSessionParticipant,
  campaignHasAnyActiveSeat,
  isActiveCampaignGm,
  isActiveCampaignSeat,
  isRevokedCampaignSessionParticipant,
  listActiveCampaignSessionParticipants,
  revokeCampaignSessionParticipant,
} from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

import type {
  ICampaignJournalEnvelope,
  JournalCampaignEventStore,
} from './JournalCampaignEventStore';

/**
 * Injected at server construction. The journal store imports this type
 * only so a client-reachable `new JournalCampaignEventStore` never
 * follows this module into SQLite / node:crypto.
 */
export type JournalCapabilityPortsBinder = (
  store: JournalCampaignEventStore,
  branches?: SQLiteEventHistoryBranchStore,
) => void;

type CapabilityTarget = Partial<
  IEventHistoryBranchPort &
    ICampaignSessionParticipantPort &
    IParticipantDeliveryCursorPort
>;

/** The shipped ack never reads the journal; the type still requires one. */
const UNUSED_ACK_JOURNAL = new InMemoryEventJournal<ICampaignJournalEnvelope>(
  () => '1970-01-01T00:00:00.000Z',
);

function defaultCapabilityDb(): Database.Database {
  return getSQLiteService().getDatabase();
}

/**
 * Map the port's grant/viewer double onto the deps the shipped ack
 * re-derives from. Dropping the double and always-allowing those deps
 * is how a not-authorized ack would become applied.
 */
export function depsFromAuthorization(
  authorization: IParticipantAckAuthorization,
  nowIso: string,
): IProjectCampaignStreamDeps {
  const grant = grantFromAuthorization(authorization, nowIso);
  return {
    grantStore: {
      getGrant: (grantId) =>
        grant !== null && grant.grantId === grantId ? grant : null,
      issueGrant: () => {
        throw new Error('capability port does not issue grants');
      },
      listGrants: () => [],
      revokeGrant: () => {
        throw new Error('capability port does not revoke grants');
      },
    },
    viewerResolver: viewerResolverFromAuthorization(authorization, grant),
    journal: UNUSED_ACK_JOURNAL,
    deliveryStore: {
      resolveEpoch: () => ({
        deliveryEpochId: authorization.currentEpochId,
        effectiveGeneration: 1,
      }),
      readMappings: (_epoch, afterSequence) => {
        if (afterSequence >= authorization.highestAssigned) return [];
        return [
          {
            projectedEventIdentity: 'capability-high-water',
            deliverySequence: authorization.highestAssigned,
          },
        ];
      },
      validateCursor: () => ({ kind: 'valid' as const }),
      assignSequences: () => [],
      bumpGeneration: () => 1,
    },
    clock: () => nowIso,
  };
}

function grantFromAuthorization(
  authorization: IParticipantAckAuthorization,
  nowIso: string,
): ICampaignGrant | null {
  const supplied = authorization.grant;
  if (supplied === null) return null;
  return {
    grantId: supplied.grantId,
    campaignId: supplied.campaignId,
    participantId: supplied.participantId,
    issuerPublicKey: 'capability-port',
    scopes: ['campaign'],
    issuedAt: nowIso,
    expiresAt: supplied.active ? '9999-12-31T23:59:59.000Z' : nowIso,
    revokedAt: supplied.active ? null : nowIso,
    createdAt: nowIso,
  };
}

/**
 * A real resolver whose membership source answers the call's grant /
 * viewer double. The shipped ack re-derives through resolve() +
 * isAuthorizedViewer; a `{ resolve }` stub would hide that.
 */
function viewerResolverFromAuthorization(
  authorization: IParticipantAckAuthorization,
  grant: ICampaignGrant | null,
): AuthorizedViewerResolver {
  return new AuthorizedViewerResolver({
    lookupMembership: async (principalId, campaignSessionId) => {
      if (
        !authorization.viewerAuthorized ||
        grant === null ||
        principalId !== grant.participantId ||
        campaignSessionId !== grant.campaignId
      ) {
        return null;
      }
      return {
        principalId: grant.participantId,
        principalKind: 'human',
        campaignId: grant.campaignId,
        campaignSessionId: grant.campaignId,
        matchId: null,
        participantId: grant.participantId,
        role: 'player',
        ownedForceIds: [],
        membershipRevision: 1,
        active: true,
      };
    },
    currentMembershipRevision: async () => 1,
  });
}

/** Participant + cursor ports on the campaign database. */
export function bindSqliteSessionPorts(
  store: CapabilityTarget,
  getDb: () => Database.Database = defaultCapabilityDb,
): void {
  Object.assign(store, {
    bindCampaignSessionParticipant,
    activeCampaignSessionMembership,
    isActiveCampaignGm,
    campaignHasAnyActiveSeat,
    isActiveCampaignSeat,
    listActiveCampaignSessionParticipants,
    revokeCampaignSessionParticipant,
    isRevokedCampaignSessionParticipant,
    readParticipantDeliveryCursor: (key: {
      readonly campaignId: string;
      readonly grantId: string;
      readonly participantId: string;
    }): IParticipantDeliveryCursor | null =>
      readParticipantDeliveryCursor(getDb(), key),
    recordParticipantAcknowledgement: (
      request: IParticipantAckRequest,
      authorization: IParticipantAckAuthorization,
      nowIso: string,
    ) =>
      recordParticipantAcknowledgement(
        getDb(),
        depsFromAuthorization(authorization, nowIso),
        request,
        nowIso,
      ),
  });
}

export function bindJournalCapabilityPorts(
  store: CapabilityTarget,
  branches: SQLiteEventHistoryBranchStore | undefined,
  getDb: () => Database.Database = defaultCapabilityDb,
): void {
  if (branches !== undefined) {
    Object.assign(store, {
      readBranch: (stream: IEventHistoryStreamRef, branchId: string) =>
        branches.readBranch(stream, branchId),
      requireBranch: (stream: IEventHistoryStreamRef, branchId: string) =>
        branches.requireBranch(stream, branchId),
      readEffectiveHead: (stream: IEventHistoryStreamRef) =>
        branches.readEffectiveHead(stream),
      requireEffectiveHead: (stream: IEventHistoryStreamRef) =>
        branches.requireEffectiveHead(stream),
      createBranch: (branch: IEventHistoryBranch) =>
        branches.createBranch(branch),
      transitionBranchStatus: (
        stream: IEventHistoryStreamRef,
        branchId: string,
        to: EventHistoryBranchStatus,
      ) => branches.transitionBranchStatus(stream, branchId, to),
    });
  }
  bindSqliteSessionPorts(store, getDb);
}
