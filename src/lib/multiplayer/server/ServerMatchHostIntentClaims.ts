/**
 * What an intent payload CLAIMS, read off the wire (umbrella 18.2
 * extraction; no behaviour change).
 *
 * Split out of `ServerMatchHostIntent` when the rejection-audit wiring
 * pushed that module past the file-size budget. These four functions
 * were always one concern and never referenced host state: they read
 * optional, client-supplied fields off an intent payload so the
 * authorization gate and the unit-ownership guard can compare a CLAIM
 * against server-derived truth. Nothing here grants anything - a claim
 * read here is an input to a check, never the result of one.
 */

import type { IIntent } from '@/types/multiplayer/Protocol';

import type { IHumanActionRequest } from './authorization/HumanActionAuthorizationGate';

/**
 * The unit a command ACTS WITH, which is the only one ownership
 * constrains. Attacks name their actor `attackerId`; everything
 * unit-scoped else names it `unitId`. `targetId` is pointedly not read —
 * shooting a unit you do not own is the entire game.
 */
export function readActorUnitId(intent: IIntent['intent']): string | null {
  return (
    readOptionalStringField(intent, 'unitId') ??
    readOptionalStringField(intent, 'attackerId') ??
    null
  );
}

/**
 * Builds the command-kind gate request from fields the intent payload
 * actually named. Unknown keys are ignored; unit ids are not force ids.
 */
export function commandRequestFromIntent(
  intent: IIntent['intent'],
): IHumanActionRequest {
  const claimedForceIds = readClaimedForceIds(intent);
  const claimedParticipantId = readOptionalStringField(intent, 'participantId');
  if (claimedParticipantId === undefined) {
    return { kind: 'command', claimedForceIds };
  }
  return { kind: 'command', claimedForceIds, claimedParticipantId };
}

/**
 * Collects forceId / forceIds claims from an intent payload. Missing
 * fields yield an empty list (no force-scope escalation to check).
 */
function readClaimedForceIds(intent: IIntent['intent']): readonly string[] {
  const ids: string[] = [];
  const forceId = readOptionalStringField(intent, 'forceId');
  if (forceId !== undefined) ids.push(forceId);
  const listed = Reflect.get(intent, 'forceIds');
  if (!Array.isArray(listed)) return ids;
  for (const item of listed) {
    if (typeof item === 'string' && item.length > 0) ids.push(item);
  }
  return ids;
}

/**
 * Reads a non-empty string property if the payload owns that key.
 */
function readOptionalStringField(
  intent: IIntent['intent'],
  key: string,
): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(intent, key)) return undefined;
  const candidate = Reflect.get(intent, key);
  if (typeof candidate !== 'string' || candidate.length === 0) return undefined;
  return candidate;
}
