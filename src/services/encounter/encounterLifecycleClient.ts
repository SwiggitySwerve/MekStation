import type { IGameSession } from '@/types/gameplay';

// Shared encounter transport limit: launch and completion carry event histories.
const ENCOUNTER_SESSION_MIB = 16;
export const ENCOUNTER_SESSION_BODY_LIMIT = `${ENCOUNTER_SESSION_MIB}mb`;
export const ENCOUNTER_SESSION_MAX_BYTES = ENCOUNTER_SESSION_MIB * 1024 * 1024;

/** Browser transport only. The server owns transition/evidence validation. */
async function writeEncounterSession(
  session: IGameSession,
  method: 'POST' | 'PATCH',
): Promise<void> {
  const encounterId = session.config.encounterId;
  if (!encounterId) return;
  const response = await fetch(
    `/api/encounters/${encodeURIComponent(encounterId)}/session`,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: session.id, events: session.events }),
    },
  );
  const result: unknown = await response.json();
  if (
    !response.ok ||
    !result ||
    typeof result !== 'object' ||
    !('success' in result) ||
    result.success !== true
  ) {
    const message =
      result &&
      typeof result === 'object' &&
      'error' in result &&
      typeof result.error === 'string'
        ? result.error
        : 'Encounter session update failed';
    throw new Error(message);
  }
}

export function linkEncounterSession(session: IGameSession): Promise<void> {
  return writeEncounterSession(session, 'POST');
}

export function completeEncounterSession(session: IGameSession): Promise<void> {
  return writeEncounterSession(session, 'PATCH');
}
