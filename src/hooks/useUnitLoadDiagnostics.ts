import type { StoreApi } from 'zustand';

import { useEffect, useState } from 'react';

import type { UnitStore } from '@/stores/unitState';
import type { IUnrecoveredCriticalSlot } from '@/types/unit/UnitLoadDiagnostics';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { recognizeCriticalSlotEntries } from '@/services/units/unitLoaderService/criticalSlotEquipment';
import { unitLoaderService } from '@/services/units/unitLoaderService/unitLoader';
import { useUnitStore, useUnitStoreApi } from '@/stores/useUnitStore';
import { logger } from '@/utils/logger';

type Source = Pick<UnitStore, 'sourceDefinition' | 'bvContext'>;
interface PendingRefresh extends Source {
  readonly promise: Promise<readonly IUnrecoveredCriticalSlot[] | undefined>;
}
// The editor and targeted save dialog can mount together. Share their one refresh.
const pending = new WeakMap<StoreApi<UnitStore>, PendingRefresh>();

function refreshLegacyDiagnostics(
  store: StoreApi<UnitStore>,
  source: Source,
): Promise<readonly IUnrecoveredCriticalSlot[] | undefined> {
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
      return recognizeCriticalSlotEntries({
        criticalSlots: definition.criticalSlots,
        equipment: live.equipment,
        unitTechBase: live.techBase,
        unitTechBaseMode: live.techBaseMode,
        tonnage: live.tonnage,
        isOmni: live.isOmni,
        systems: live,
      }).missing.map(({ text, location, slot }) => ({ text, location, slot }));
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
} {
  const store = useUnitStoreApi();
  const entries = useUnitStore((state) => state.unrecoveredCriticalSlots);
  const sourceDefinition = useUnitStore((state) => state.sourceDefinition);
  const bvContext = useUnitStore((state) => state.bvContext);
  const [isRefreshing, setIsRefreshing] = useState(false);
  useEffect(() => {
    if (entries !== undefined || (!sourceDefinition && !bvContext?.source))
      return;
    let active = true;
    setIsRefreshing(true);
    void refreshLegacyDiagnostics(store, {
      sourceDefinition,
      bvContext,
    }).then((loaded) => {
      if (!active) return;
      const live = store.getState();
      if (
        loaded !== undefined &&
        live.unrecoveredCriticalSlots === undefined &&
        live.sourceDefinition === sourceDefinition &&
        live.bvContext === bvContext
      ) {
        store.setState({ unrecoveredCriticalSlots: loaded });
      }
      setIsRefreshing(false);
    });
    return () => {
      active = false;
    };
  }, [store, entries, sourceDefinition, bvContext]);
  return { entries, isRefreshing: entries === undefined && isRefreshing };
}
