import type { RandomFn } from '@/types/campaign/events/randomEventTypes';

export function rollForEvent(probability: number, random: RandomFn): boolean {
  return random() < probability;
}

export function selectRandomEvent<T>(events: readonly T[], random: RandomFn): T {
  const index = Math.floor(random() * events.length);
  return events[index];
}

export function selectWeightedEvent<T>(
  events: readonly { readonly item: T; readonly weight: number }[],
  random: RandomFn
): T {
  const totalWeight = events.reduce((sum, e) => sum + e.weight, 0);
  let roll = random() * totalWeight;
  for (const entry of events) {
    roll -= entry.weight;
    if (roll <= 0) return entry.item;
  }
  return events[events.length - 1].item;
}

export function isMonday(dateStr: string): boolean {
  return new Date(dateStr).getUTCDay() === 1;
}

export function isFirstOfMonth(dateStr: string): boolean {
  return new Date(dateStr).getUTCDate() === 1;
}

export function isBirthday(birthDate: string | Date | undefined, currentDate: string): boolean {
  if (!birthDate) return false;
  const birth = new Date(birthDate);
  const current = new Date(currentDate);
  return birth.getUTCMonth() === current.getUTCMonth() && birth.getUTCDate() === current.getUTCDate();
}

export function isSpecificDate(month: number, day: number, currentDate: string): boolean {
  const d = new Date(currentDate);
  return d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

export function calculateAge(birthDate: string | Date, currentDate: string): number {
  const birth = new Date(birthDate);
  const current = new Date(currentDate);
  let age = current.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = current.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && current.getUTCDate() < birth.getUTCDate())) {
    age--;
  }
  return age;
}

export function createSeededRandom(seed: number): RandomFn {
  let state = seed;
  return () => {
    state = (1103515245 * state + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}
