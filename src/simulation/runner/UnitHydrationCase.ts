import type { IFullUnit } from '@/services/units/CanonicalUnitService';
import type { IUnitGameState } from '@/types/gameplay';

import { equipmentSignalsFromFullUnit } from './UnitHydrationEquipment';
import { runnerCriticalLocationFromCatalogLocation } from './UnitHydrationLocations';
import {
  normalizeEquipmentSignalKey,
  normalizedWithoutTechPrefix,
} from './UnitHydrationText';

type UnitCaseProtection = NonNullable<IUnitGameState['caseProtection']>;
type UnitCaseProtectionLevel = UnitCaseProtection[string];

function isCaseIIEquipmentSignal(normalized: string): boolean {
  return ['caseii', 'case2'].includes(normalized);
}

function isStandardCASEEquipmentSignal(normalized: string): boolean {
  return ['case', 'casep', 'caseprototype', 'prototypecase'].includes(
    normalized,
  );
}

function classifyCASEProtection(id: string): UnitCaseProtectionLevel | null {
  const normalized = normalizeEquipmentSignalKey(id);
  const withoutTechPrefix = normalizedWithoutTechPrefix(normalized);
  if (isCaseIIEquipmentSignal(withoutTechPrefix)) {
    return 'case_ii';
  }
  if (isStandardCASEEquipmentSignal(withoutTechPrefix)) {
    return 'case';
  }
  return null;
}

export function hydrateCASEProtectionFromFullUnit(
  fullUnit: IFullUnit,
): IUnitGameState['caseProtection'] | undefined {
  const protectionByLocation: Record<string, UnitCaseProtectionLevel> = {};

  for (const signal of equipmentSignalsFromFullUnit(fullUnit)) {
    if (signal.sourceLocation === undefined) continue;
    const runnerLocation = runnerCriticalLocationFromCatalogLocation(
      signal.sourceLocation,
    );
    if (runnerLocation === undefined) continue;

    const protection = classifyCASEProtection(signal.id);
    if (protection === null) continue;

    const current = protectionByLocation[runnerLocation];
    if (current === 'case_ii') continue;
    protectionByLocation[runnerLocation] = protection;
  }

  return Object.keys(protectionByLocation).length > 0
    ? protectionByLocation
    : undefined;
}
