/**
 * Tech Progression Utilities - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

export interface TechProgression {
  introductionYear: number;
  commonYear?: number;
  extinctionYear?: number;
  reintroductionYear?: number;
}

export function isAvailableInEra(progression: TechProgression, year: number): boolean {
  if (year < progression.introductionYear) return false;
  if (progression.extinctionYear && year >= progression.extinctionYear) {
    if (!progression.reintroductionYear || year < progression.reintroductionYear) {
      return false;
    }
  }
  return true;
}

export function getAvailabilityStatus(progression: TechProgression, year: number): string {
  if (!isAvailableInEra(progression, year)) return 'Unavailable';
  if (progression.commonYear && year >= progression.commonYear) return 'Common';
  return 'Rare';
}


