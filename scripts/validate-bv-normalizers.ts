import type { MechLocation } from '../src/utils/construction/battleValueCalculations';

export function toMechLoc(l: string): MechLocation | null {
  const u = l.toUpperCase().replace(/[_\s-]+/g, '');
  if (u === 'HEAD' || u === 'HD') return 'HD';
  if (u === 'CENTERTORSO' || u === 'CT') return 'CT';
  if (u === 'LEFTTORSO' || u === 'LT') return 'LT';
  if (u === 'RIGHTTORSO' || u === 'RT') return 'RT';
  if (u === 'LEFTARM' || u === 'LA') return 'LA';
  if (u === 'RIGHTARM' || u === 'RA') return 'RA';
  if (u === 'LEFTLEG' || u === 'LL') return 'LL';
  if (u === 'RIGHTLEG' || u === 'RL') return 'RL';
  if (u === 'FRONTLEFTLEG' || u === 'FLL') return 'LA';
  if (u === 'FRONTRIGHTLEG' || u === 'FRL') return 'RA';
  if (u === 'REARLEFTLEG' || u === 'RLL') return 'LL';
  if (u === 'REARRIGHTLEG' || u === 'RRL') return 'RL';
  return null;
}
export function isRearLoc(l: string): boolean {
  const lo = l.toLowerCase();
  return lo.includes('rear') || lo.includes('(r)');
}

export function normalizeCritName(s: string): string {
  return s
    .replace(/\s*\(R\)/g, '')
    .replace(/\s*\(T\)/g, '')
    .replace(/\s*\(omnipod\)/gi, '')
    .trim()
    .toLowerCase()
    .replace(/^(is|cl|clan)\s*/i, '')
    .replace(/[^a-z0-9]/g, '');
}

export function normalizeEquipId(s: string): string {
  return s
    .replace(/^\d+-/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
