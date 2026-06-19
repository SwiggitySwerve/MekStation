/**
 * Host roll embedding — helpers that stamp captured d6 rolls into a
 * freshly emitted event's payload so the guest mirror can replay them
 * deterministically.
 *
 * Usage pattern on the host side:
 *
 *   const capture = new RollCapture(realRoller);
 *   const session2 = rollInitiative(session, undefined, capture.asD6Roller());
 *   const lastEvent = session2.events[session2.events.length - 1];
 *   const stamped = embedRollsIntoEvent(lastEvent, capture.drain());
 *   broadcast(stamped);                  // peers receive event with rolls
 *
 * Why a small standalone helper instead of weaving roll capture through
 * `appendEvent`: the engine pipeline is shared with single-player / hot-
 * seat resolvers that have no `RollCapture` instance. Keeping the
 * capture / stamp dance in a single seam means the engine itself stays
 * agnostic. The seam is also what the guest replay code installs
 * (`extractRollsFromEvent`) for symmetric consumption.
 *
 * @spec openspec/changes/add-p2p-game-session-sync/specs/multiplayer-sync/spec.md § 3
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

/**
 * Return a new event with `payload.rolls` set to `rolls`. Non-mutating.
 *
 * If the existing payload already has a `rolls` field that is non-empty
 * AND differs from the new value, throws — that signals a bug in the
 * resolver that double-stamped. An identical re-stamp is a no-op (lets
 * idempotent re-broadcast paths flow through).
 */
export function embedRollsIntoEvent(
  event: IGameEvent,
  rolls: readonly number[],
): IGameEvent {
  if (rolls.length === 0) return event;

  const existing = extractRollsFromEvent(event);
  if (existing.length > 0) {
    if (rollsEqual(existing, rolls)) return event;
    throw new Error(
      `embedRollsIntoEvent: event ${event.id} already has rolls ` +
        `[${existing.join(',')}] which differ from new [${rolls.join(',')}].`,
    );
  }

  // Payload shape varies by event type but is always an object. We
  // preserve every existing field and add the optional `rolls` array.
  // The cast collapses the discriminated `GameEventPayload` union to a
  // generic record so the spread type-checks; the resulting payload is
  // re-cast back to the union (`as never` widens to the event's
  // declared payload type) — runtime shape is unchanged.
  const payload = event.payload as Record<string, unknown>;
  const merged = {
    ...payload,
    rolls: rolls.slice(),
  };
  return {
    ...event,
    payload: merged as IGameEvent['payload'],
  };
}

/**
 * Read the rolls embedded in an event payload. Returns `[]` when the
 * payload has no `rolls` field OR when it's not an array of numbers.
 *
 * Lenient on purpose: a host that doesn't go through `RollCapture` (e.g.
 * an event that consumed no dice) emits `payload.rolls === undefined`
 * which is fine — no rolls to replay.
 */
export function extractRollsFromEvent(event: IGameEvent): readonly number[] {
  const payload = event.payload as Record<string, unknown> | null;
  if (!payload) return [];
  const rolls = payload.rolls;
  if (!Array.isArray(rolls)) return [];
  if (!rolls.every((value) => typeof value === 'number')) return [];
  return rolls as readonly number[];
}

function rollsEqual(
  left: readonly number[],
  right: readonly number[],
): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}
