import type { IFullUnit } from '@/services/units/CanonicalUnitService';
import type { IC3EquipmentMountState } from '@/utils/gameplay/c3Network';
import type {
  ECMMode,
  ECMType,
  IActiveProbe,
} from '@/utils/gameplay/electronicWarfare';

import { hasSPA } from '@/utils/gameplay/spaModifiers';

import type {
  IHydratedActiveProbeData,
  IHydratedC3EquipmentData,
  IHydratedECMSuiteData,
} from './UnitHydrationTypes';

import { equipmentSignalsFromFullUnit } from './UnitHydrationEquipment';
import { hydratePilotAbilitiesFromFullUnit } from './UnitHydrationMovement';
import {
  normalizeCriticalSlotText,
  normalizeEquipmentId,
} from './UnitHydrationText';

function normalizeECMMode(mode: string | undefined): ECMMode | undefined {
  if (mode === undefined) return undefined;

  const normalized = normalizeCriticalSlotText(mode);
  if (normalized === 'ecm') return 'ecm';
  if (normalized === 'eccm') return 'eccm';
  if (normalized === 'off') return 'off';
  if (normalized === 'on') return 'ecm';
  return undefined;
}

const ECM_TYPE_BY_EQUIPMENT_ID: Readonly<Record<string, ECMType>> = {
  guardianecm: 'guardian',
  guardianecmsuite: 'guardian',
  guardianecmsuiteprototype: 'guardian',
  isguardianecm: 'guardian',
  isguardianecmsuite: 'guardian',
  isguardianecmsuiteprototype: 'guardian',
  angelecm: 'angel',
  angelecmsuite: 'angel',
  isangelecm: 'angel',
  isangelecmsuite: 'angel',
  isthbangelecmsuite: 'angel',
  thbangelecmsuite: 'angel',
  clanecm: 'clan',
  clanecmsuite: 'clan',
  clecmsuite: 'clan',
  ecmsuite: 'clan',
  clncews: 'clan',
  clnovacews: 'clan',
  clwatchdogcews: 'clan',
  clwatchdogecm: 'clan',
  novacews: 'clan',
  novacombinedelectronicwarfaresystemcews: 'clan',
  watchdogcews: 'clan',
  watchdogcompositeelectronicwarfaresystemcews: 'clan',
  watchdogecm: 'clan',
  watchdogecmsuite: 'clan',
};

const ACTIVE_PROBE_TYPE_BY_EQUIPMENT_ID: Readonly<
  Record<string, IActiveProbe['type']>
> = {
  activeprobebeagle: 'beagle',
  activeprobebeagleprototype: 'beagle',
  beagleactiveprobe: 'beagle',
  beagleactiveprobeprototype: 'beagle',
  isactiveprobebeagle: 'beagle',
  isactiveprobebeagleprototype: 'beagle',
  isbeagleactiveprobe: 'beagle',
  isbeagleactiveprobeprototype: 'beagle',
  bloodhoundactiveprobe: 'bloodhound',
  isbloodhoundactiveprobe: 'bloodhound',
  isthbbloodhoundactiveprobe: 'bloodhound',
  thbbloodhoundactiveprobe: 'bloodhound',
  clanactiveprobe: 'clan-active-probe',
  clactiveprobe: 'clan-active-probe',
  activeprobelight: 'light-active-probe',
  clanlightactiveprobe: 'light-active-probe',
  cllightactiveprobe: 'light-active-probe',
  isactiveprobelight: 'light-active-probe',
  lightactiveprobe: 'light-active-probe',
  clwatchdogcews: 'watchdog-cews',
  clwatchdogecm: 'watchdog-cews',
  watchdogcews: 'watchdog-cews',
  watchdogcompositeelectronicwarfaresystemcews: 'watchdog-cews',
  watchdogecm: 'watchdog-cews',
  watchdogecmsuite: 'watchdog-cews',
  clncews: 'nova-cews',
  clnovacews: 'nova-cews',
  novacews: 'nova-cews',
  novacombinedelectronicwarfaresystemcews: 'nova-cews',
};

interface IC3EquipmentClassification {
  readonly role: IC3EquipmentMountState['role'];
  readonly boosted?: boolean;
}

const C3_EQUIPMENT_BY_ID: Readonly<Record<string, IC3EquipmentClassification>> =
  {
    c3master: { role: 'master' },
    c3mastercomputer: { role: 'master' },
    c3computermaster: { role: 'master' },
    isc3computer: { role: 'master' },
    isc3mastercomputer: { role: 'master' },
    isc3masterunit: { role: 'master' },
    c3boostedmaster: { role: 'master', boosted: true },
    c3boostedsystemmaster: { role: 'master', boosted: true },
    c3boostedsystemc3bsmaster: { role: 'master', boosted: true },
    c3bsmaster: { role: 'master', boosted: true },
    isc3masterboostedsystemunit: { role: 'master', boosted: true },
    isc3mastercomputerboosted: { role: 'master', boosted: true },
    c3slave: { role: 'slave' },
    c3slaveunit: { role: 'slave' },
    c3computerslave: { role: 'slave' },
    isc3slave: { role: 'slave' },
    isc3slaveunit: { role: 'slave' },
    c3boostedslave: { role: 'slave', boosted: true },
    c3boostedsystemslave: { role: 'slave', boosted: true },
    c3boostedsystemc3bsslave: { role: 'slave', boosted: true },
    c3bsslave: { role: 'slave', boosted: true },
    isc3boostedsystemslaveunit: { role: 'slave', boosted: true },
    c3i: { role: 'c3i' },
    c3iunit: { role: 'c3i' },
    c3icomputer: { role: 'c3i' },
    isc3iunit: { role: 'c3i' },
    isc3icomputer: { role: 'c3i' },
    isimprovedc3cpu: { role: 'c3i' },
    improvedc3: { role: 'c3i' },
    improvedc3computer: { role: 'c3i' },
    improvedc3computerc3i: { role: 'c3i' },
    clncews: { role: 'nova' },
    clnovacews: { role: 'nova' },
    novacews: { role: 'nova' },
    novacombinedelectronicwarfaresystemcews: { role: 'nova' },
  };

function isBattleArmorC3Equipment(id: string): boolean {
  const normalized = normalizeEquipmentId(id);
  return (
    normalized === 'bc3' ||
    normalized === 'bc3i' ||
    normalized === 'isbc3i' ||
    normalized.includes('battlearmorc3') ||
    normalized.includes('battlearmorimprovedc3')
  );
}

function isBattleMechC3EquipmentHost(fullUnit: IFullUnit): boolean {
  const unitType = (fullUnit as { unitType?: unknown }).unitType;
  if (typeof unitType !== 'string') return true;

  const normalized = normalizeCriticalSlotText(unitType);
  return (
    normalized === 'battlemech' ||
    normalized === 'omnimech' ||
    normalized === 'industrialmech'
  );
}

function classifyC3Equipment(id: string): IC3EquipmentClassification | null {
  if (isBattleArmorC3Equipment(id)) return null;

  const normalized = normalizeEquipmentId(id);
  const mapped = C3_EQUIPMENT_BY_ID[normalized];
  if (mapped) return mapped;

  if (normalized.includes('c3i') || normalized.includes('improvedc3')) {
    return { role: 'c3i' };
  }
  if (normalized.includes('nova') || normalized.includes('ncews')) {
    return { role: 'nova' };
  }
  if (normalized.includes('boosted') && normalized.includes('master')) {
    return { role: 'master', boosted: true };
  }
  if (normalized.includes('boosted') && normalized.includes('slave')) {
    return { role: 'slave', boosted: true };
  }
  if (
    normalized.includes('c3master') ||
    (normalized.includes('c3computer') && normalized.includes('master'))
  ) {
    return { role: 'master' };
  }
  if (
    normalized.includes('c3slave') ||
    (normalized.includes('c3computer') && normalized.includes('slave'))
  ) {
    return { role: 'slave' };
  }

  return null;
}

function classifyECMSuiteEquipment(id: string): ECMType | null {
  const normalized = normalizeEquipmentId(id);
  return (
    ECM_TYPE_BY_EQUIPMENT_ID[normalized] ??
    (normalized.includes('guardianecm')
      ? 'guardian'
      : normalized.includes('angelecm')
        ? 'angel'
        : normalized.includes('ecmsuite') || normalized.includes('cews')
          ? 'clan'
          : null)
  );
}

const ACTIVE_PROBE_FALLBACK_TYPES: readonly {
  readonly type: IActiveProbe['type'];
  readonly matches: (normalized: string) => boolean;
}[] = [
  {
    type: 'bloodhound',
    matches: (normalized) => normalized.includes('bloodhoundactiveprobe'),
  },
  {
    type: 'beagle',
    matches: (normalized) => normalized.includes('beagleactiveprobe'),
  },
  {
    type: 'light-active-probe',
    matches: (normalized) => normalized.includes('lightactiveprobe'),
  },
  {
    type: 'watchdog-cews',
    matches: (normalized) => normalized.includes('watchdog'),
  },
  {
    type: 'nova-cews',
    matches: (normalized) =>
      normalized.includes('nova') || normalized.includes('ncews'),
  },
  {
    type: 'clan-active-probe',
    matches: (normalized) => normalized.includes('activeprobe'),
  },
];

function classifyActiveProbeEquipment(id: string): IActiveProbe['type'] | null {
  const normalized = normalizeEquipmentId(id);
  return (
    ACTIVE_PROBE_TYPE_BY_EQUIPMENT_ID[normalized] ??
    ACTIVE_PROBE_FALLBACK_TYPES.find((entry) => entry.matches(normalized))
      ?.type ??
    null
  );
}

export function hydrateECMSuitesFromFullUnit(
  fullUnit: IFullUnit,
): readonly IHydratedECMSuiteData[] {
  const suites: IHydratedECMSuiteData[] = [];
  const seen = new Set<string>();

  for (const signal of equipmentSignalsFromFullUnit(fullUnit)) {
    const type = classifyECMSuiteEquipment(signal.id);
    if (!type) continue;

    const key = `${type}:${normalizeEquipmentId(signal.id)}:${signal.sourceLocation ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const mode = normalizeECMMode(signal.currentMode);
    suites.push({
      type,
      sourceEquipmentId: signal.id,
      ...(signal.sourceLocation
        ? { sourceLocation: signal.sourceLocation }
        : {}),
      ...(mode !== undefined ? { mode } : {}),
    });
  }

  return suites;
}

export function hydrateActiveProbesFromFullUnit(
  fullUnit: IFullUnit,
): readonly IHydratedActiveProbeData[] {
  const probes: IHydratedActiveProbeData[] = [];
  const seen = new Set<string>();

  for (const signal of equipmentSignalsFromFullUnit(fullUnit)) {
    const type = classifyActiveProbeEquipment(signal.id);
    if (!type) continue;

    const key = `${type}:${normalizeEquipmentId(signal.id)}:${signal.sourceLocation ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);

    probes.push({
      type,
      sourceEquipmentId: signal.id,
      ...(signal.sourceLocation
        ? { sourceLocation: signal.sourceLocation }
        : {}),
    });
  }

  return probes;
}

export function hydrateC3EquipmentFromFullUnit(
  fullUnit: IFullUnit,
): readonly IHydratedC3EquipmentData[] {
  if (!isBattleMechC3EquipmentHost(fullUnit)) return [];

  const equipment: IHydratedC3EquipmentData[] = [];
  const seen = new Set<string>();

  for (const signal of equipmentSignalsFromFullUnit(fullUnit)) {
    const classification = classifyC3Equipment(signal.id);
    if (!classification) continue;

    const key = `${classification.role}:${classification.boosted === true}:${normalizeEquipmentId(signal.id)}:${signal.sourceLocation ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);

    equipment.push({
      role: classification.role,
      sourceEquipmentId: signal.id,
      ...(signal.sourceLocation
        ? { sourceLocation: signal.sourceLocation }
        : {}),
      ...(classification.boosted ? { boosted: true } : {}),
    });
  }

  const abilities = hydratePilotAbilitiesFromFullUnit(fullUnit) ?? [];
  if (hasSPA(abilities, 'boost_comm_implant')) {
    const key = 'c3i:false:boost_comm_implant:pilot-ability';
    if (!seen.has(key)) {
      seen.add(key);
      equipment.push({
        role: 'c3i',
        sourceEquipmentId: 'boost_comm_implant',
      });
    }
  }

  return equipment;
}
