/**
 * ProtoMech Structure Tab Component
 *
 * Exposes all construction fields: chassis type (radio), tonnage, weight class,
 * walk MP, jump MP, myomer booster, gliding wings, main gun weapon picker,
 * and per-location armor allocation.
 *
 * @spec openspec/changes/add-protomech-construction/tasks.md §10.2
 */

import React from 'react';

import { ProtoMechArmorDiagram } from './ProtoMechArmorDiagram';
import {
  useProtoMechArmorControls,
  useProtoMechChassisControls,
  useProtoMechIdentityControls,
  useProtoMechMainGunControls,
  useProtoMechMovementControls,
  useProtoMechTonnageControls,
} from './ProtoMechStructureTab.logic';
import {
  ProtoMechArmorAllocationSection,
  ProtoMechChassisTypeSection,
  ProtoMechIdentitySection,
  ProtoMechMainGunSection,
  ProtoMechMovementSection,
  ProtoMechTonnageSection,
} from './ProtoMechStructureTab.sections';

interface ProtoMechStructureTabProps {
  readOnly?: boolean;
}

export function ProtoMechStructureTab({
  readOnly = false,
}: ProtoMechStructureTabProps): React.ReactElement {
  const identityControls = useProtoMechIdentityControls(readOnly);
  const chassisControls = useProtoMechChassisControls(readOnly);
  const tonnageControls = useProtoMechTonnageControls(readOnly);
  const movementControls = useProtoMechMovementControls(readOnly);
  const mainGunControls = useProtoMechMainGunControls(readOnly);
  const armorControls = useProtoMechArmorControls(readOnly);

  return (
    <div className="space-y-6">
      <ProtoMechIdentitySection
        readOnly={readOnly}
        controls={identityControls}
      />
      <ProtoMechChassisTypeSection
        readOnly={readOnly}
        controls={chassisControls}
      />
      <ProtoMechTonnageSection readOnly={readOnly} controls={tonnageControls} />
      <ProtoMechMovementSection
        readOnly={readOnly}
        controls={movementControls}
      />
      <ProtoMechMainGunSection readOnly={readOnly} controls={mainGunControls} />
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

export default ProtoMechStructureTab;
