import React from 'react';

import { useUnitStore } from '@/stores/useUnitStore';

import { ArmorDiagramPanel } from '../tabs/ArmorDiagramPanel';
import { buildArmorData } from '../tabs/ArmorTab.logic';

/** Reuse the editor's configuration dispatch; no biped fallback for other mechs. */
export function MechLoadingDiagram(): React.ReactElement {
  const { tonnage, configuration, armorAllocation } = useUnitStore(
    (state) => state,
  );
  return (
    <div
      data-mech-configuration={configuration}
      className="[&_[data-testid=armor-diagram]>div>div.mt-4]:hidden"
    >
      <ArmorDiagramPanel
        presentation="loading"
        configuration={configuration}
        armorDiagramMode="silhouette"
        armorDiagramVariant="clean-tech"
        armorData={buildArmorData(tonnage, configuration, armorAllocation)}
        selectedLocation={null}
        unallocatedPoints={0}
        locationIssues={{}}
        onLocationClick={() => {}}
      />
    </div>
  );
}
