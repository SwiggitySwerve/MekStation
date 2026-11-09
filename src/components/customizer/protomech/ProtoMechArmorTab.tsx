/**
 * ProtoMechArmorTab
 *
 * Armor type, running total against the pinned cap, per-location allocation
 * and the compact armor diagram. MegaMekLab 62bf193 keeps these in its
 * Structure/Armor tab (BAProtoArmorView, ArmorAllocationView); MekStation
 * shows them as their own tab, like the vehicle and aerospace editors.
 *
 * Limits and diagnostics come from `construction/protomech/armor.ts`
 * (TestProtoMek.maxArmorFactor, MegaMek 48fcb2f64); this tab never repairs
 * or clamps a source value.
 *
 * @spec openspec/specs/multi-unit-tabs/spec.md
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import React from 'react';

import { ProtoMechArmorDiagram } from './ProtoMechArmorDiagram';
import {
  ProtoMechArmorAllocationSection,
  ProtoMechArmorPanelSection,
} from './ProtoMechArmorTab.sections';
import { useProtoMechArmorControls } from './ProtoMechStructureTab.logic';

export interface ProtoMechArmorTabProps {
  readOnly?: boolean;
  className?: string;
}

export function ProtoMechArmorTab({
  readOnly = false,
  className = '',
}: ProtoMechArmorTabProps): React.ReactElement {
  const armorControls = useProtoMechArmorControls(readOnly);

  return (
    <div className={`space-y-6 ${className}`} data-testid="protomech-armor-tab">
      <ProtoMechArmorPanelSection
        readOnly={readOnly}
        controls={armorControls}
      />
      <ProtoMechArmorAllocationSection
        readOnly={readOnly}
        controls={armorControls}
      />

      <div className="flex justify-center">
        <ProtoMechArmorDiagram />
      </div>
    </div>
  );
}

export default ProtoMechArmorTab;
