import React, { useState } from 'react';

import type { LocationArmorData } from '@/types/construction/LocationArmorData';

import { ArmorDiagramVariant } from '@/stores/useAppSettingsStore';
import { MechLocation } from '@/types/construction';
import {
  QuadVeeMode,
  QUADVEE_MODES,
} from '@/types/construction/MechConfigurationSystem';

import { ArmorDiagramQuickSettings } from '../ArmorDiagramQuickSettings';
import { GradientDefs } from '../shared/ArmorFills';
import {
  QUAD_SILHOUETTE,
  QUAD_LOCATION_LABELS,
  getLocationCenter,
  hasTorsoRear,
} from '../shared/MechSilhouette';
import { VariantLocation } from '../shared/VariantLocationRenderer';
import {
  getVariantStyle,
  VariantLegend,
  VariantSVGDecorations,
  TargetingReticle,
} from '../shared/VariantStyles';

export interface QuadVeeArmorDiagramProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  unallocatedPoints: number;
  onLocationClick: (location: MechLocation) => void;
  className?: string;
  initialMode?: QuadVeeMode;
  onModeChange?: (mode: QuadVeeMode) => void;
  variant?: ArmorDiagramVariant;
}

const QUADVEE_LOCATIONS: MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.FRONT_LEFT_LEG,
  MechLocation.FRONT_RIGHT_LEG,
  MechLocation.REAR_LEFT_LEG,
  MechLocation.REAR_RIGHT_LEG,
];

export function QuadVeeArmorDiagram({
  armorData,
  selectedLocation,
  unallocatedPoints,
  onLocationClick,
  className = '',
  initialMode = QuadVeeMode.MECH,
  onModeChange,
  variant = 'clean-tech',
}: QuadVeeArmorDiagramProps): React.ReactElement {
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(
    null,
  );
  const [currentMode, setCurrentMode] = useState<QuadVeeMode>(initialMode);
  const style = getVariantStyle(variant);

  const handleModeChange = (mode: QuadVeeMode) => {
    setCurrentMode(mode);
    onModeChange?.(mode);
  };

  const getArmorData = (
    location: MechLocation,
  ): LocationArmorData | undefined => {
    return armorData.find((d) => d.location === location);
  };

  const hoveredPos = hoveredLocation
    ? QUAD_SILHOUETTE.locations[hoveredLocation]
    : null;

  return (
    <div
      className={`${style.containerBg} rounded-lg border ${style.containerBorder} p-4 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className={style.headerTextClass} style={style.headerTextStyle}>
            QuadVee Armor Allocation
          </h3>
          <ArmorDiagramQuickSettings />
        </div>
      </div>

      <div className="mb-4 flex justify-center">
        <div className="bg-surface-elevated inline-flex gap-1 rounded-lg p-1">
          {QUADVEE_MODES.map((modeDefinition) => (
            <button
              key={modeDefinition.mode}
              onClick={() => handleModeChange(modeDefinition.mode)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                currentMode === modeDefinition.mode
                  ? 'bg-accent text-white'
                  : 'text-text-theme-secondary hover:bg-surface-base hover:text-white'
              }`}
              title={modeDefinition.description}
            >
              {modeDefinition.displayName}
            </button>
          ))}
        </div>
      </div>

      <p className="text-text-theme-secondary mb-3 text-center text-xs">
        {currentMode === QuadVeeMode.MECH
          ? 'Mech Mode: Standard quad mech movement'
          : 'Vehicle Mode: Tracked vehicle movement'}
      </p>

      <div className="relative">
        <svg
          viewBox={QUAD_SILHOUETTE.viewBox}
          className="mx-auto w-full max-w-[300px]"
          style={{ height: 'auto' }}
        >
          <GradientDefs />

          <VariantSVGDecorations variant={variant} width={300} height={280} />

          {QUADVEE_LOCATIONS.map((loc) => {
            const pos = QUAD_SILHOUETTE.locations[loc];
            if (!pos) return null;
            const data = getArmorData(loc);
            const label = QUAD_LOCATION_LABELS[loc] ?? loc;
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

      <div className="border-border-theme-subtle mt-3 border-t pt-3">
        <div className="text-text-theme-secondary grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div>FLL = Front Left Leg</div>
          <div>FRL = Front Right Leg</div>
          <div>RLL = Rear Left Leg</div>
          <div>RRL = Rear Right Leg</div>
        </div>
      </div>

      <p className={style.instructionsClass}>{style.instructionsText}</p>
    </div>
  );
}
