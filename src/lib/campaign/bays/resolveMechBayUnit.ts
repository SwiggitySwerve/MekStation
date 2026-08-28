import { parseRosterUnitSource } from '@/types/campaign/RosterUnitSource';

export interface MechBaySavedDesign {
  readonly id: string;
  readonly tonnage: number;
  readonly battleValue?: number;
}

export interface MechBayLoadoutMaps {
  readonly unitTonnageById: ReadonlyMap<string, number>;
  readonly unitBattleValueById: ReadonlyMap<string, number>;
  readonly unresolvedUnitIds: ReadonlySet<string>;
  readonly customBvAvailableIds: ReadonlySet<string>;
}

type MechBayRosterUnit = {
  readonly unitId: string;
  readonly unitRef?: string;
  readonly unitSource?: unknown;
  readonly tonnage?: number;
};

export function resolveMechBayLoadout({
  units,
  unitConfigurations,
  canonicalIndex,
  savedDesigns = [],
}: {
  readonly units: readonly MechBayRosterUnit[];
  readonly unitConfigurations?: Readonly<
    Record<string, { readonly tonnage: number }>
  >;
  readonly canonicalIndex: readonly {
    readonly id: string;
    readonly tonnage?: number;
    readonly bv?: number;
  }[];
  readonly savedDesigns?: readonly MechBaySavedDesign[];
}): MechBayLoadoutMaps {
  // prettier-ignore
  const canonicalById = new Map(canonicalIndex.map((entry) => [entry.id, entry]));
  const savedById = new Map(savedDesigns.map((entry) => [entry.id, entry]));
  const unitTonnageById = new Map<string, number>();
  const unitBattleValueById = new Map<string, number>();
  const unresolvedUnitIds = new Set<string>();
  const customBvAvailableIds = new Set<string>();
  for (const unit of units) {
    const parsed = parseRosterUnitSource(unit.unitSource);
    const cachedTonnage =
      unitConfigurations?.[unit.unitId]?.tonnage ?? unit.tonnage;
    if (parsed.kind !== 'invalid' && parsed.source === 'custom') {
      const saved = unit.unitRef ? savedById.get(unit.unitRef) : undefined;
      if (!saved) {
        unresolvedUnitIds.add(unit.unitId);
        if (cachedTonnage) unitTonnageById.set(unit.unitId, cachedTonnage);
        continue;
      }
      unitTonnageById.set(unit.unitId, cachedTonnage ?? saved.tonnage);
      if (typeof saved.battleValue === 'number' && saved.battleValue > 0) {
        unitBattleValueById.set(unit.unitId, saved.battleValue);
        customBvAvailableIds.add(unit.unitId);
      }
      continue;
    }
    // prettier-ignore
    const canonical = unit.unitRef ? canonicalById.get(unit.unitRef) : undefined;
    const tonnage = cachedTonnage ?? canonical?.tonnage;
    if (tonnage) unitTonnageById.set(unit.unitId, tonnage);
    if (canonical?.bv) unitBattleValueById.set(unit.unitId, canonical.bv);
  }
  // prettier-ignore
  return { unitTonnageById, unitBattleValueById, unresolvedUnitIds, customBvAvailableIds };
}
