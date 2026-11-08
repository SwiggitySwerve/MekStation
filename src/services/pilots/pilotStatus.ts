import { PilotStatus } from '@/types/pilot/PilotInterfaces';

export const INVALID_PILOT_STATUS_ERROR = 'Invalid pilot status.';
export const PILOT_REVIVAL_ERROR = 'Cannot revive a KIA pilot.';

export function parsePilotStatus(value: unknown): PilotStatus | null {
  return Object.values(PilotStatus).find((status) => status === value) ?? null;
}

/** Normal vault operations cannot revive a pilot; an explicit GM flow is separate. */
export function canTransitionPilotStatus(
  from: PilotStatus,
  to: PilotStatus,
): boolean {
  return from !== PilotStatus.KIA || to === PilotStatus.KIA;
}
