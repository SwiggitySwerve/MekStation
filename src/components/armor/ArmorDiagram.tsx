import React, { useState } from 'react';

import type {
  ArmorAllocationType,
  ArmorData,
  ArmorFacing,
} from './ArmorDiagram.types';

import { MechLocation } from '../../types/construction/CriticalSlotAllocation';
import {
  AutoAllocateControl,
  DesktopArmorLayout,
  FacingToggle,
  MobileArmorLayout,
} from './ArmorDiagram.parts';

export type { ArmorAllocationType, ArmorData } from './ArmorDiagram.types';

export interface ArmorDiagramProps {
  armor: ArmorData;
  onArmorChange: (
    location: MechLocation,
    value: number,
    facing: ArmorFacing,
  ) => void;
  onAutoAllocate?: (type: ArmorAllocationType) => void;
  className?: string;
}

export function ArmorDiagram({
  armor,
  onArmorChange,
  onAutoAllocate,
  className = '',
}: ArmorDiagramProps): React.ReactElement {
  const [facing, setFacing] = useState<ArmorFacing>('front');
  const [allocationType, setAllocationType] =
    useState<ArmorAllocationType>('even');

  const handleArmorChange = (location: MechLocation, value: number) => {
    onArmorChange(location, value, facing);
  };

  const handleAutoAllocate = () => {
    onAutoAllocate?.(allocationType);
  };

  return (
    <div className={`armor-diagram ${className}`.trim()}>
      <FacingToggle facing={facing} onFacingChange={setFacing} />

      {onAutoAllocate && (
        <AutoAllocateControl
          allocationType={allocationType}
          onAllocationTypeChange={setAllocationType}
          onApply={handleAutoAllocate}
        />
      )}

      <DesktopArmorLayout
        armor={armor}
        facing={facing}
        onArmorChange={handleArmorChange}
      />
      <MobileArmorLayout
        armor={armor}
        facing={facing}
        onArmorChange={handleArmorChange}
      />
    </div>
  );
}
