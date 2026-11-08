import { PilotStatus } from '@/types/pilot/PilotInterfaces';

/** Normal vault operations cannot revive a pilot; an explicit GM flow is separate. */
export function canTransitionPilotStatus(
  from: PilotStatus,
  to: PilotStatus,
): boolean {
  return from !== PilotStatus.KIA || to === PilotStatus.KIA;
}
