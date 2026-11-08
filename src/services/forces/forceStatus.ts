import { ForceStatus } from '@/types/force/ForceInterfaces';

export const INVALID_FORCE_STATUS_ERROR = 'Invalid force status.';

export function parseForceStatus(value: unknown): ForceStatus | null {
  return Object.values(ForceStatus).find((status) => status === value) ?? null;
}
