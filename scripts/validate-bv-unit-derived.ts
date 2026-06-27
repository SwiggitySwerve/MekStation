import type { CockpitType } from '../src/utils/construction/battleValueCalculations';
import type { UnitData } from './validate-bv-types';

import { EngineType } from '../src/types/construction/EngineType';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';
import { normalizeEquipId } from './validate-bv-normalizers';

export function mapEngineType(s: string, tb: string): EngineType {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u === 'XL' || u === 'XLENGINE')
    return tb === 'CLAN' ? EngineType.XL_CLAN : EngineType.XL_IS;
  if (u === 'CLANXL' || u === 'CLAN_XL' || u === 'XLCLAN')
    return EngineType.XL_CLAN;
  if (u === 'LIGHT' || u === 'LIGHTENGINE') return EngineType.LIGHT;
  if (u === 'XXL' || u === 'XXLENGINE') return EngineType.XXL;
  if (u === 'COMPACT' || u === 'COMPACTENGINE') return EngineType.COMPACT;
  if (u === 'ICE' || u === 'INTERNALCOMBUSTION') return EngineType.ICE;
  if (u === 'FUELCELL' || u === 'FUEL_CELL') return EngineType.FUEL_CELL;
  if (u === 'FISSION') return EngineType.FISSION;
  return EngineType.STANDARD;
}

export function mapArmorType(s: string): string {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('COMMERCIAL')) return 'commercial';
  if (u.includes('HARDENED')) return 'hardened';
  if (u.includes('REACTIVE')) return 'reactive';
  if (u.includes('REFLECTIVE') || u.includes('LASERREFLECTIVE'))
    return 'reflective';
  if (u.includes('BALLISTICREINFORCED')) return 'ballistic-reinforced';
  if (u.includes('FERROLAMELLOR')) return 'ferro-lamellor';
  if (u.includes('STEALTH')) return 'stealth';
  if (u.includes('ANTIPENETRATIVE') || u.includes('ABLATION'))
    return 'anti-penetrative';
  if (u.includes('HEATDISSIPATING')) return 'heat-dissipating';
  if (u.includes('IMPACTRESISTANT')) return 'impact-resistant';
  if (u.includes('HEAVYINDUSTRIAL')) return 'heavy-industrial';
  if (u.includes('INDUSTRIAL')) return 'industrial';
  return 'standard';
}

export function getArmorBAR(armorType: string): number {
  return armorType === 'commercial' ? 5 : 10;
}

export function mapStructureType(s: string): string {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('INDUSTRIAL')) return 'industrial';
  if (u.includes('ENDOCOMPOSITE')) return 'endo-composite';
  if (u.includes('COMPOSITE')) return 'composite';
  if (u.includes('REINFORCED')) return 'reinforced';
  return 'standard';
}

export function mapGyroType(s: string): string {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('SUPERHEAVY')) return 'superheavy';
  if (u.includes('HEAVYDUTY') || u.includes('HEAVY')) return 'heavy-duty';
  if (u.includes('XL')) return 'xl';
  if (u.includes('COMPACT')) return 'compact';
  return 'standard';
}

export function mapCockpitType(s: string): CockpitType {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('SMALL') && u.includes('COMMAND'))
    return 'small-command-console';
  if (u.includes('SMALL')) return 'small';
  if (u.includes('TORSOMOUNTED') || u.includes('TORSO')) return 'torso-mounted';
  if (u.includes('COMMANDCONSOLE') || u.includes('COMMAND'))
    return 'command-console';
  if (u.includes('INTERFACE')) return 'interface';
  if (u.includes('DRONE')) return 'drone-operating-system';
  return 'standard';
}

export function calcTotalStructure(ton: number, config?: string): number {
  const cfgLower = config?.toLowerCase() ?? '';
  const isQuad = cfgLower === 'quad' || cfgLower === 'quadvee';
  const isTripod = cfgLower === 'tripod';
  const limbIS = (t: { arm: number; leg: number }) =>
    isQuad
      ? t.leg * 4
      : isTripod
        ? t.arm * 2 + t.leg * 3
        : t.arm * 2 + t.leg * 2;
  const t = STRUCTURE_POINTS_TABLE[ton];
  if (!t) {
    const k = Object.keys(STRUCTURE_POINTS_TABLE)
      .map(Number)
      .sort((a, b) => a - b)
      .filter((x) => x <= ton)
      .pop();
    if (k) {
      const t2 = STRUCTURE_POINTS_TABLE[k] as {
        head: number;
        centerTorso: number;
        sideTorso: number;
        arm: number;
        leg: number;
      };
      return t2.head + t2.centerTorso + t2.sideTorso * 2 + limbIS(t2);
    }
    return 0;
  }
  const st = t as {
    head: number;
    centerTorso: number;
    sideTorso: number;
    arm: number;
    leg: number;
  };
  return st.head + st.centerTorso + st.sideTorso * 2 + limbIS(st);
}

export function calcTotalArmor(a: UnitData['armor']['allocation']): number {
  let t = 0;
  for (const v of Object.values(a)) {
    if (typeof v === 'number') t += v;
    else if (v && typeof v === 'object') t += (v.front || 0) + (v.rear || 0);
  }
  return t;
}

export function isArmLoc(l: string): boolean {
  const lo = l.toLowerCase();
  return lo.includes('left_arm') || lo.includes('right_arm');
}

export function isClanEquipAtLocation(
  equipId: string,
  location: string,
  criticalSlots?: Record<string, (string | null)[]>,
): boolean {
  if (!criticalSlots) return false;
  const locKey = location.split(',')[0].toUpperCase();
  const locVariants = [locKey, location];
  const eqNorm = normalizeEquipId(equipId);

  const strippedId = equipId.replace(/^\d+-/, '').toLowerCase();
  if (/^is[a-z]/.test(strippedId)) return false;

  for (const lk of locVariants) {
    const slots = criticalSlots[lk];
    if (!Array.isArray(slots)) continue;
    for (const slot of slots) {
      if (!slot || typeof slot !== 'string') continue;
      const clean = slot
        .replace(/\s*\(omnipod\)/gi, '')
        .replace(/\s*\(R\)/g, '')
        .trim();
      if (!/^CL/i.test(clean) && !/^Clan\s/i.test(clean)) continue;
      const slotNorm = clean
        .toLowerCase()
        .replace(/^(cl|clan)\s*/i, '')
        .replace(/[^a-z0-9]/g, '');
      if (
        slotNorm === eqNorm ||
        slotNorm.includes(eqNorm) ||
        eqNorm.includes(slotNorm)
      )
        return true;
      const canonicalize = (s: string) =>
        s.replace(/(\d+)/g, '').replace(/[^a-z]/g, '') +
        (s.match(/\d+/)?.[0] ?? '');
      if (canonicalize(slotNorm) === canonicalize(eqNorm)) return true;
    }
  }
  return false;
}
