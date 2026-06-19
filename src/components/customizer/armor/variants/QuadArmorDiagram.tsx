import React, { useState } from 'react';

import { ArmorDiagramVariant } from '@/stores/useCustomizerSettingsStore';
import { MechLocation } from '@/types/construction';

import type { VariantArmorDiagramProps } from '../shared/ArmorVariantRenderHelpers';

import { ArmorDiagramSvgFrame } from '../shared/ArmorDiagramSvgFrame';
import { GradientDefs } from '../shared/ArmorFills';
import {
  findArmorData,
  getArmorValues,
} from '../shared/ArmorVariantRenderHelpers';
import {
  QUAD_SILHOUETTE,
  QUAD_LOCATION_LABELS,
  hasTorsoRear,
} from '../shared/MechSilhouette';
import {
  VariantDiagramContainer,
  VariantTargetingReticle,
} from '../shared/VariantDiagramChrome';
import { VariantDiagramSvgPrelude } from '../shared/VariantDiagramSvgPrelude';
import { VariantLocation } from '../shared/VariantLocationRenderer';
import { getVariantStyle, VariantLegend } from '../shared/VariantStyles';

export interface QuadArmorDiagramProps extends VariantArmorDiagramProps {
  variant?: ArmorDiagramVariant;
}

const QUAD_LOCATIONS: MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.FRONT_LEFT_LEG,
  MechLocation.FRONT_RIGHT_LEG,
  MechLocation.REAR_LEFT_LEG,
  MechLocation.REAR_RIGHT_LEG,
];

export function QuadArmorDiagram(
  props: QuadArmorDiagramProps,
): React.ReactElement {
  const { armorData, selectedLocation, unallocatedPoints } = props;
  const { onLocationClick, className = '', variant = 'clean-tech' } = props;
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(
    null,
  );
  const style = getVariantStyle(variant);

  const hoveredPos = hoveredLocation
    ? QUAD_SILHOUETTE.locations[hoveredLocation]
    : null;

  return (
    <VariantDiagramContainer
      style={style}
      title="Quad Armor Allocation"
      className={className}
    >
      <ArmorDiagramSvgFrame
        viewBox={QUAD_SILHOUETTE.viewBox}
        className="mx-auto w-full max-w-[300px]"
      >
        <VariantDiagramSvgPrelude variant={variant} />

        {QUAD_LOCATIONS.map((loc) => {
          const pos = QUAD_SILHOUETTE.locations[loc];
          if (!pos) return null;
          const data = findArmorData(armorData, loc);
          const label = QUAD_LOCATION_LABELS[loc] ?? loc;
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
          <div>FLL = Front Left Leg</div>
          <div>FRL = Front Right Leg</div>
          <div>RLL = Rear Left Leg</div>
          <div>RRL = Rear Right Leg</div>
        </div>
      </div>

      <p className={style.instructionsClass}>{style.instructionsText}</p>
    </VariantDiagramContainer>
  );
}
