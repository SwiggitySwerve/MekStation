/**
 * Movement Calculations - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

export function calculateWalkMP(engineRating: number, tonnage: number): number {
  if (tonnage <= 0) return 0;
  return Math.floor(engineRating / tonnage);
}

export function calculateRunMP(walkMP: number): number {
  return Math.floor(walkMP * 1.5);
}

export function calculateJumpMP(jumpJetCount: number): number {
  return jumpJetCount;
}

export function formatMovement(walk: number, run: number, jump: number): string {
  if (jump > 0) {
    return `${walk}/${run}/${jump}`;
  }
  return `${walk}/${run}`;
}

export function formatCondensedMovement(walk: number, run: number, jump: number): string {
  return formatMovement(walk, run, jump);
}


