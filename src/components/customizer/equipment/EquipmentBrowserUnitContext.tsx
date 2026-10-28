import React, { createContext, useContext, useMemo } from 'react';

import { UnitStoreContext, useUnitStore } from '@/stores/useUnitStore';

import { useOverviewBuildSummary } from '../tabs/overview/useOverviewBuildSummary';
import {
  countCatalogMounts,
  getCatalogCapacity,
} from './EquipmentBrowser.model';

interface CatalogUnitContext {
  remainingWeight: number;
  remainingSlots: number;
  /** The unit's tonnage, for the at-limit reason. */
  tonnage?: number;
  mountedCounts: ReadonlyMap<string, number>;
}

export const EquipmentBrowserUnitContext =
  createContext<CatalogUnitContext | null>(null);

function MechCatalogContext({ children }: { children: React.ReactNode }) {
  // Reuse the editor's calculated readouts; do not introduce catalog totals.
  const { stats } = useOverviewBuildSummary();
  const equipment = useUnitStore((state) => state.equipment);
  const mountedCounts = useMemo(
    () => countCatalogMounts(equipment),
    [equipment],
  );
  const value = { ...getCatalogCapacity(stats), mountedCounts };
  return (
    <EquipmentBrowserUnitContext.Provider value={value}>
      {children}
    </EquipmentBrowserUnitContext.Provider>
  );
}

export function EquipmentBrowserUnitProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const unitStore = useContext(UnitStoreContext);
  return unitStore ? (
    <MechCatalogContext>{children}</MechCatalogContext>
  ) : (
    <>{children}</>
  );
}
