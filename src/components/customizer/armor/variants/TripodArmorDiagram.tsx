import React, { useState } from 'react';

import { ArmorDiagramVariant } from '@/stores/useCustomizerSettingsStore';
import { MechLocation } from '@/types/construction';
import { TRIPOD_LOCATIONS } from '@/types/construction/MechConfigurationSystem';

import type { VariantArmorDiagramProps } from '../shared/ArmorVariantRenderHelpers';

import { ArmorDiagramSvgFrame } from '../shared/ArmorDiagramSvgFrame';
import {
  findArmorData,
  getArmorValues,
} from '../shared/ArmorVariantRenderHelpers';
import {
  TRIPOD_SILHOUETTE,
  TRIPOD_LOCATION_LABELS,
  hasTorsoRear,
} from '../shared/MechSilhouette';
import {
  VariantDiagramContainer,
  VariantTargetingReticle,
} from '../shared/VariantDiagramChrome';
import { VariantDiagramSvgPrelude } from '../shared/VariantDiagramSvgPrelude';
import { VariantLocation } from '../shared/VariantLocationRenderer';
import { getVariantStyle, VariantLegend } from '../shared/VariantStyles';

export interface TripodArmorDiagramProps extends VariantArmorDiagramProps {
  variant?: ArmorDiagramVariant;
}

export function TripodArmorDiagram(
  props: TripodArmorDiagramProps,
): React.ReactElement {
  const { armorData, selectedLocation, unallocatedPoints } = props;
  const { onLocationClick, className = '', variant = 'clean-tech' } = props;
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(
    null,
  );
  const style = getVariantStyle(variant);

  const hoveredPos = hoveredLocation
    ? TRIPOD_SILHOUETTE.locations[hoveredLocation]
    : null;

  return (
    <VariantDiagramContainer
      style={style}
      title="Tripod Armor Allocation"
      className={className}
    >
      <ArmorDiagramSvgFrame
        viewBox={TRIPOD_SILHOUETTE.viewBox}
        className="mx-auto w-full max-w-[300px]"
      >
        <VariantDiagramSvgPrelude variant={variant} height={380} />

        {TRIPOD_LOCATIONS.map((loc) => {
          const pos = TRIPOD_SILHOUETTE.locations[loc];
          if (!pos) return null;
          const data = findArmorData(armorData, loc);
          const label = TRIPOD_LOCATION_LABELS[loc] ?? loc;
          const showRear = hasTorsoRear(loc);

          return (
            <VariantLocation
              key={loc}
              location={loc}
              label={label}
              pos={pos}
              data={getArmorValues(data)}
              showRear={showRear}
              isSelected={selectedLocation === loc}
              isHovered={hoveredLocation === loc}
              variant={variant}
              onClick={() => onLocationClick(loc)}
              onHover={(h) => setHoveredLocation(h ? loc : null)}
            />
          );
        })}

        <VariantTargetingReticle
          position={hoveredPos}
          visible={style.showTargetingReticle}
        />
      </ArmorDiagramSvgFrame>

      <VariantLegend variant={variant} unallocatedPoints={unallocatedPoints} />

      <div className="border-border-theme-subtle mt-3 border-t pt-3">
        <div className="text-text-theme-secondary grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div>HD = Head</div>
          <div>CT = Center Torso</div>
          <div>LT/RT = Left/Right Torso</div>
          <div>LA/RA = Left/Right Arm</div>
          <div>LL/RL = Left/Right Leg</div>
          <div>CL = Center Leg</div>
        </div>
      </div>

      <p className={style.instructionsClass}>{style.instructionsText}</p>
    </VariantDiagramContainer>
  );
}
