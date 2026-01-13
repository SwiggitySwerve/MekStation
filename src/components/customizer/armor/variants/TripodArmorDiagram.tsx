import React, { useState } from 'react';
import { MechLocation } from '@/types/construction';
import { TRIPOD_LOCATIONS } from '@/types/construction/MechConfigurationSystem';
import { ArmorDiagramVariant } from '@/stores/useAppSettingsStore';
import { LocationArmorData } from '../ArmorDiagram';
import {
  TRIPOD_SILHOUETTE,
  TRIPOD_LOCATION_LABELS,
  getLocationCenter,
  hasTorsoRear,
} from '../shared/MechSilhouette';
import { GradientDefs } from '../shared/ArmorFills';
import { ArmorDiagramQuickSettings } from '../ArmorDiagramQuickSettings';
import {
  getVariantStyle,
  VariantLegend,
  VariantSVGDecorations,
  TargetingReticle,
} from '../shared/VariantStyles';
import { VariantLocation } from '../shared/VariantLocationRenderer';

export interface TripodArmorDiagramProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  unallocatedPoints: number;
  onLocationClick: (location: MechLocation) => void;
  className?: string;
  variant?: ArmorDiagramVariant;
}

export function TripodArmorDiagram({
  armorData,
  selectedLocation,
  unallocatedPoints,
  onLocationClick,
  className = '',
  variant = 'clean-tech',
}: TripodArmorDiagramProps): React.ReactElement {
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(null);
  const style = getVariantStyle(variant);

  const getArmorData = (location: MechLocation): LocationArmorData | undefined => {
    return armorData.find((d) => d.location === location);
  };

  const hoveredPos = hoveredLocation ? TRIPOD_SILHOUETTE.locations[hoveredLocation] : null;

  return (
    <div className={`${style.containerBg} rounded-lg border ${style.containerBorder} p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className={style.headerTextClass} style={style.headerTextStyle}>
            Tripod Armor Allocation
          </h3>
          <ArmorDiagramQuickSettings />
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={TRIPOD_SILHOUETTE.viewBox}
          className="w-full max-w-[300px] mx-auto"
          style={{ height: 'auto' }}
        >
          <GradientDefs />

          <VariantSVGDecorations variant={variant} width={300} height={380} />

          {TRIPOD_LOCATIONS.map((loc) => {
            const pos = TRIPOD_SILHOUETTE.locations[loc];
            if (!pos) return null;
            const data = getArmorData(loc);
            const label = TRIPOD_LOCATION_LABELS[loc] ?? loc;
            const showRear = hasTorsoRear(loc);

            return (
              <VariantLocation
                key={loc}
                location={loc}
                label={label}
                pos={pos}
                data={{
                  current: data?.current ?? 0,
                  maximum: data?.maximum ?? 1,
                  rear: data?.rear ?? 0,
                  rearMaximum: data?.rearMaximum ?? 1,
                }}
                showRear={showRear}
                isSelected={selectedLocation === loc}
                isHovered={hoveredLocation === loc}
                variant={variant}
                onClick={() => onLocationClick(loc)}
                onHover={(h) => setHoveredLocation(h ? loc : null)}
              />
            );
          })}

          {style.showTargetingReticle && hoveredPos && (
            <TargetingReticle
              cx={getLocationCenter(hoveredPos).x}
              cy={getLocationCenter(hoveredPos).y}
              visible={true}
            />
          )}
        </svg>
      </div>

      <VariantLegend variant={variant} unallocatedPoints={unallocatedPoints} />

      <div className="mt-3 pt-3 border-t border-border-theme-subtle">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-theme-secondary">
          <div>HD = Head</div>
          <div>CT = Center Torso</div>
          <div>LT/RT = Left/Right Torso</div>
          <div>LA/RA = Left/Right Arm</div>
          <div>LL/RL = Left/Right Leg</div>
          <div>CL = Center Leg</div>
        </div>
      </div>

      <p className={style.instructionsClass}>
        {style.instructionsText}
      </p>
    </div>
  );
}
