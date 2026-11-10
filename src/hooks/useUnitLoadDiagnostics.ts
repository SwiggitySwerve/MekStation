import type { StoreApi } from 'zustand';

import { useEffect, useState } from 'react';

import type { IArmorSaveLoss } from '@/services/units/unitLoaderService/armorSaveLoss';
import type { IRawSerializedUnit } from '@/services/units/unitLoaderService/types';
import type { UnitStore } from '@/stores/unitState';
import type { IUnrecoveredCriticalSlot } from '@/types/unit/UnitLoadDiagnostics';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { getArmorSaveLoss } from '@/services/units/unitLoaderService/armorSaveLoss';
import { recognizeCriticalSlotEntries } from '@/services/units/unitLoaderService/criticalSlotEquipment';
import { unitLoaderService } from '@/services/units/unitLoaderService/unitLoader';
import { useUnitStore, useUnitStoreApi } from '@/stores/useUnitStore';
import { logger } from '@/utils/logger';

type Source = Pick<UnitStore, 'sourceDefinition' | 'bvContext'>;
interface RefreshedDiagnostics {
  readonly entries?: readonly IUnrecoveredCriticalSlot[];
  readonly source?: IRawSerializedUnit;
}
interface PendingRefresh extends Source {
  readonly promise: Promise<RefreshedDiagnostics | undefined>;
}
// The editor and targeted save dialog can mount together. Share their one refresh.
const pending = new WeakMap<StoreApi<UnitStore>, PendingRefresh>();

function refreshLegacyDiagnostics(
  store: StoreApi<UnitStore>,
  source: Source,
): Promise<RefreshedDiagnostics | undefined> {
  const existing = pending.get(store);
  if (
    existing &&
    existing.sourceDefinition === source.sourceDefinition &&
    existing.bvContext === source.bvContext
  )
    return existing.promise;
  const promise = (async () => {
    try {
      let definition = source.bvContext?.source;
      const reference = source.sourceDefinition;
      if (
        !definition &&
        reference?.source === 'canonical' &&
        (reference.family ?? 'battlemechs') === 'battlemechs'
      ) {
        const result = await unitLoaderService.loadCanonicalUnit(reference.id);
        if (result.success) definition = result.state?.bvContext?.source;
      }
      if (!definition) return undefined;
      await getEquipmentLookupService().initialize();
      await getEquipmentRegistry().initialize();
      const live = store.getState();
      if (
        live.sourceDefinition !== source.sourceDefinition ||
        live.bvContext !== source.bvContext
      )
        return undefined;
      // Refresh diagnostics for the draft's actual allocations. A newly
      // repaired canonical load does not repair an older draft's equipment.
      const entries = recognizeCriticalSlotEntries({
        criticalSlots: definition.criticalSlots,
        equipment: live.equipment,
        unitTechBase: live.techBase,
        unitTechBaseMode: live.techBaseMode,
        tonnage: live.tonnage,
        isOmni: live.isOmni,
        systems: live,
      }).missing.map(({ text, location, slot }) => ({ text, location, slot }));
      return { entries, source: definition };
    } catch (error) {
      // An unavailable source leaves tracking unknown, never an invented empty list.
      logger.warn(
        'Unable to refresh legacy draft critical-slot diagnostics',
        error,
      );
      return undefined;
    }
  })();
  const request = { ...source, promise };
  pending.set(store, request);
  void promise.finally(() => {
    if (pending.get(store) === request) pending.delete(store);
  });
  return promise;
}

/** Resolve only absent legacy metadata; display and saving consume the same loader list. */
export function useUnitLoadDiagnostics(): {
  readonly entries: readonly IUnrecoveredCriticalSlot[] | undefined;
  readonly isRefreshing: boolean;
  readonly source?: IRawSerializedUnit;
  readonly armorSaveLoss?: IArmorSaveLoss;
} {
  const store = useUnitStoreApi();
  const entries = useUnitStore((state) => state.unrecoveredCriticalSlots);
  const sourceDefinition = useUnitStore((state) => state.sourceDefinition);
  const bvContext = useUnitStore((state) => state.bvContext);
  const armorType = useUnitStore((state) => state.armorType);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Source recovered for old drafts is transient diagnostics, never editable BV
  // context, persisted unit data, or part of either fingerprint.
  const [refreshedSource, setRefreshedSource] = useState<
    Source & {
      readonly store: StoreApi<UnitStore>;
      readonly source: IRawSerializedUnit;
    }
  >();
  const source =
    bvContext?.source ??
    (refreshedSource?.store === store &&
    refreshedSource.sourceDefinition === sourceDefinition &&
    refreshedSource.bvContext === bvContext
      ? refreshedSource.source
      : undefined);
  useEffect(() => {
    if (
      (entries !== undefined && source) ||
      (!sourceDefinition && !bvContext?.source)
    ) {
      setIsRefreshing(false);
      return;
    }
    let active = true;
    setIsRefreshing(true);
    void refreshLegacyDiagnostics(store, {
      sourceDefinition,
      bvContext,
    }).then((loaded) => {
      if (!active) return;
      const live = store.getState();
      if (
        live.sourceDefinition !== sourceDefinition ||
        live.bvContext !== bvContext
      ) {
        setIsRefreshing(false);
        return;
      }
      if (loaded?.source && !bvContext?.source) {
        setRefreshedSource({
          store,
          sourceDefinition,
          bvContext,
          source: loaded.source,
        });
      }
      if (
        loaded?.entries !== undefined &&
        live.unrecoveredCriticalSlots === undefined &&
        live.sourceDefinition === sourceDefinition &&
        live.bvContext === bvContext
      ) {
        store.setState({ unrecoveredCriticalSlots: loaded.entries });
      }
      setIsRefreshing(false);
    });
    return () => {
      active = false;
    };
  }, [store, entries, sourceDefinition, bvContext, source]);
  return {
    entries,
    isRefreshing:
      (entries === undefined || source === undefined) && isRefreshing,
    source,
    armorSaveLoss: getArmorSaveLoss(source, armorType),
  };
}
