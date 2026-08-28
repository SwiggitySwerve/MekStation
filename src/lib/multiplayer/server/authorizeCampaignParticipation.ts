import type { IForce } from '@/types/campaign/Force';
import type {
  ICampaignParticipationPayload,
  IErrorCode,
} from '@/types/multiplayer/Protocol';

import { ForceRole } from '@/types/campaign/enums/ForceRole';
import { FormationLevel } from '@/types/campaign/enums/FormationLevel';

import type {
  ICampaignHostRegistryEntry,
  ICampaignParticipationRecord,
} from './CampaignHostRegistry';

export interface ICampaignParticipationBaseline {
  readonly playerId: string;
  readonly role: 'host' | 'guest';
  readonly revision: number;
}

export type CampaignParticipationAdmission =
  | {
      readonly ok: true;
      readonly idempotent: boolean;
      readonly record: ICampaignParticipationRecord;
    }
  | { readonly ok: false; readonly code: IErrorCode; readonly reason: string };

const baselines = new WeakMap<object, ICampaignParticipationBaseline>();

export function captureCampaignConnectionBaseline(
  socket: object,
  baseline: ICampaignParticipationBaseline,
): void {
  baselines.set(socket, baseline);
}

export function admitBoundCampaignParticipation(input: {
  readonly socket: object;
  readonly entry: Pick<
    ICampaignHostRegistryEntry,
    'matchId' | 'revision' | 'hostPlayerId' | 'host' | 'getParticipationRecords'
  >;
  readonly verifiedPlayerId: string;
  readonly payload: ICampaignParticipationPayload;
}): CampaignParticipationAdmission {
  const baseline = baselines.get(input.socket);
  if (!baseline || baseline.playerId !== input.verifiedPlayerId) {
    return { ok: false, code: 'AUTH_REJECTED', reason: 'rebind-required' };
  }
  return admitCampaignParticipation({
    matchId: input.entry.matchId,
    currentRevision: input.entry.revision,
    acknowledgedRevision: baseline.revision,
    verifiedPlayerId: input.verifiedPlayerId,
    hostPlayerId: input.entry.hostPlayerId,
    forceUnits: input.entry.host.getState().forceUnits ?? {},
    records: input.entry.getParticipationRecords(input.payload.missionId),
    payload: input.payload,
  });
}

export function admitCampaignParticipation(input: {
  readonly matchId: string;
  readonly currentRevision: number;
  readonly acknowledgedRevision: number;
  readonly verifiedPlayerId: string;
  readonly hostPlayerId: string;
  readonly forceUnits: Readonly<Record<string, readonly string[]>>;
  /**
   * Every participation record already filed for this mission — not just
   * the caller's. Ownership is a fact about the OTHER claims, so a
   * function handed only its own record could never see a conflict.
   */
  readonly records: readonly ICampaignParticipationRecord[];
  readonly payload: ICampaignParticipationPayload;
}): CampaignParticipationAdmission {
  if (input.acknowledgedRevision !== input.currentRevision) {
    return { ok: false, code: 'INVALID_INTENT', reason: 'stale-revision' };
  }
  const unitIds = input.forceUnits[input.payload.forceId];
  if (!unitIds) {
    return { ok: false, code: 'INVALID_INTENT', reason: 'foreign-force' };
  }
  // A campaign has ONE shared roster, so `forceUnits` knowing a force
  // only proves it exists — it says nothing about whose it is. The
  // refusal above has always been named `foreign-force`, but until now
  // it only fired for a force nobody had, which meant a player could
  // file participation for their TEAMMATE's force and be admitted.
  //
  // Nothing upstream records force ownership: the campaign's forces are
  // shared, and the only owner map in the codebase is built inside
  // `composeCoopEncounter` and never leaves it. What the session does
  // have is the claims themselves, so first claim on a mission owns the
  // force for that mission. That is deliberately modest — it stops a
  // player taking a force out of a teammate's hands, and it does not
  // pretend to be a GM assignment mechanism, which would need an
  // authority that does not exist yet.
  const claimedByOther = input.records.some(
    (candidate) =>
      candidate.force.id === input.payload.forceId &&
      candidate.playerId !== input.verifiedPlayerId,
  );
  if (claimedByOther) {
    return { ok: false, code: 'INVALID_INTENT', reason: 'foreign-force' };
  }
  const existing = input.records.find(
    (candidate) => candidate.playerId === input.verifiedPlayerId,
  );
  const record = projectedRecord(input, unitIds);
  if (!existing) {
    return { ok: true, idempotent: false, record };
  }
  if (
    existing.choice === record.choice &&
    existing.force.id === record.force.id &&
    existing.missionId === record.missionId
  ) {
    return { ok: true, idempotent: true, record: existing };
  }
  return { ok: false, code: 'INVALID_INTENT', reason: 'conflicting-choice' };
}

function projectedRecord(
  input: {
    readonly matchId: string;
    readonly verifiedPlayerId: string;
    readonly hostPlayerId: string;
    readonly payload: ICampaignParticipationPayload;
  },
  unitIds: readonly string[],
): ICampaignParticipationRecord {
  const force: IForce = {
    id: input.payload.forceId,
    name: input.payload.forceId,
    subForceIds: [],
    unitIds: [...unitIds],
    forceType: ForceRole.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '1970-01-01T00:00:00.000Z',
    updatedAt: '1970-01-01T00:00:00.000Z',
  };
  return {
    matchId: input.matchId,
    missionId: input.payload.missionId,
    playerId: input.verifiedPlayerId,
    role: input.verifiedPlayerId === input.hostPlayerId ? 'host' : 'guest',
    choice: input.payload.choice,
    force,
  };
}
