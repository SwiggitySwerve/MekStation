/**
 * ProtoMech Structure Tab Component
 *
 * Exposes all construction fields: chassis type (radio), tonnage, weight class,
 * walk MP, jump MP, myomer booster and gliding wings. Armor type, totals,
 * allocation and the armor diagram live in the Armor tab (ProtoMechArmorTab);
 * the Main Gun mount lives in the Main Gun tab (ProtoMechMainGunTab).
 *
 * @spec openspec/changes/add-protomech-construction/tasks.md §10.2
 */

import React from 'react';

import {
  useProtoMechChassisControls,
  useProtoMechIdentityControls,
  useProtoMechMovementControls,
  useProtoMechTonnageControls,
} from './ProtoMechStructureTab.logic';
import {
  ProtoMechChassisTypeSection,
  ProtoMechIdentitySection,
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
    </div>
  );
}

export default ProtoMechStructureTab;
