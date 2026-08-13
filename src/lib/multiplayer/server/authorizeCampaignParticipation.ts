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
    existing: input.entry
      .getParticipationRecords(input.payload.missionId)
      .find((record) => record.playerId === input.verifiedPlayerId),
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
  readonly existing: ICampaignParticipationRecord | undefined;
  readonly payload: ICampaignParticipationPayload;
}): CampaignParticipationAdmission {
  if (input.acknowledgedRevision !== input.currentRevision) {
    return { ok: false, code: 'INVALID_INTENT', reason: 'stale-revision' };
  }
  const unitIds = input.forceUnits[input.payload.forceId];
  if (!unitIds) {
    return { ok: false, code: 'INVALID_INTENT', reason: 'foreign-force' };
  }
  const record = projectedRecord(input, unitIds);
  if (!input.existing) {
    return { ok: true, idempotent: false, record };
  }
  if (
    input.existing.choice === record.choice &&
    input.existing.force.id === record.force.id &&
    input.existing.missionId === record.missionId
  ) {
    return { ok: true, idempotent: true, record: input.existing };
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
