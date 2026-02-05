import React, { useState } from 'react';

import { ArmorDiagramVariant } from '@/stores/useAppSettingsStore';
import { MechLocation } from '@/types/construction';
import {
  LAMMode,
  LAM_CONFIGURATION,
  configurationRegistry,
} from '@/types/construction/MechConfigurationSystem';

import { LocationArmorData } from '../ArmorDiagram';
import { ArmorDiagramQuickSettings } from '../ArmorDiagramQuickSettings';
import { GradientDefs } from '../shared/ArmorFills';
import {
  REALISTIC_SILHOUETTE,
  FIGHTER_SILHOUETTE,
  LOCATION_LABELS,
  FIGHTER_LOCATION_LABELS,
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

export interface LAMArmorDiagramProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  unallocatedPoints: number;
  onLocationClick: (location: MechLocation) => void;
  className?: string;
  variant?: ArmorDiagramVariant;
}

const MECH_LOCATIONS: MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
];

const FIGHTER_LOCATIONS: MechLocation[] = [
  MechLocation.NOSE,
  MechLocation.FUSELAGE,
  MechLocation.LEFT_WING,
  MechLocation.RIGHT_WING,
  MechLocation.AFT,
];

function calculateFighterArmor(
  mechArmorData: LocationArmorData[],
): LocationArmorData[] {
  const armorMapping = configurationRegistry.getFighterArmorMapping(
    LAM_CONFIGURATION.id,
  );

  if (!armorMapping) {
    return [];
  }

  const mechArmorMap = new Map<MechLocation, LocationArmorData>();
  for (const data of mechArmorData) {
    mechArmorMap.set(data.location, data);
  }

  const fighterArmor: Map<MechLocation, LocationArmorData> = new Map();

  for (const fighterLoc of FIGHTER_LOCATIONS) {
    fighterArmor.set(fighterLoc, {
      location: fighterLoc,
      current: 0,
      maximum: 0,
    });
  }

  for (const mechLoc of MECH_LOCATIONS) {
    const fighterLoc = armorMapping[mechLoc];
    if (!fighterLoc || !FIGHTER_LOCATIONS.includes(fighterLoc)) continue;

    const mechData = mechArmorMap.get(mechLoc);
    if (!mechData) continue;

    const fighterData = fighterArmor.get(fighterLoc)!;

    const totalMechArmor = mechData.current + (mechData.rear ?? 0);
    const totalMechMax = mechData.maximum + (mechData.rearMaximum ?? 0);

    fighterArmor.set(fighterLoc, {
      location: fighterLoc,
      current: fighterData.current + totalMechArmor,
      maximum: fighterData.maximum + totalMechMax,
    });
  }

  return Array.from(fighterArmor.values());
}

export function LAMArmorDiagram({
  armorData,
  selectedLocation,
  unallocatedPoints,
  onLocationClick,
  className = '',
  variant = 'clean-tech',
}: LAMArmorDiagramProps): React.ReactElement {
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(
    null,
  );
  const [currentMode, setCurrentMode] = useState<LAMMode>(LAMMode.MECH);
  const style = getVariantStyle(variant);

  const isFighterMode = currentMode === LAMMode.FIGHTER;

  const displayLocations = isFighterMode ? FIGHTER_LOCATIONS : MECH_LOCATIONS;
  const displayArmorData = isFighterMode
    ? calculateFighterArmor(armorData)
    : armorData;

  const getArmorData = (
    location: MechLocation,
  ): LocationArmorData | undefined => {
    return displayArmorData.find((d) => d.location === location);
  };

  const silhouette = isFighterMode ? FIGHTER_SILHOUETTE : REALISTIC_SILHOUETTE;
  const labels = isFighterMode ? FIGHTER_LOCATION_LABELS : LOCATION_LABELS;

  const hoveredPos = hoveredLocation
    ? silhouette.locations[hoveredLocation]
    : null;

  return (
    <div
      className={`${style.containerBg} rounded-lg border ${style.containerBorder} p-4 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className={style.headerTextClass} style={style.headerTextStyle}>
            LAM Armor Allocation
          </h3>
          <ArmorDiagramQuickSettings />
        </div>
      </div>

      <div className="mb-4 flex justify-center">
        <div className="bg-surface-subtle inline-flex rounded-lg p-1">
          {([LAMMode.MECH, LAMMode.AIRMECH, LAMMode.FIGHTER] as LAMMode[]).map(
            (mode) => (
              <button
                key={mode}
                onClick={() => setCurrentMode(mode)}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  currentMode === mode
                    ? 'bg-accent text-white'
                    : 'text-text-theme-secondary hover:text-white'
                }`}
              >
                {mode}
              </button>
            ),
          )}
        </div>
      </div>

      {isFighterMode && (
        <div className="text-text-theme-secondary mb-3 text-center text-xs">
          Fighter mode armor is calculated from Mech mode allocation
        </div>
      )}

      <div className="relative">
        <svg
          viewBox={silhouette.viewBox}
          className="mx-auto w-full max-w-[300px]"
          style={{ height: 'auto' }}
        >
          <GradientDefs />

          <VariantSVGDecorations variant={variant} width={300} height={280} />

          {displayLocations.map((loc) => {
            const pos = silhouette.locations[loc];
            if (!pos) return null;
            const data = getArmorData(loc);
            const label = labels[loc] ?? loc;
            const showRear = !isFighterMode && hasTorsoRear(loc);

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
                onClick={() => !isFighterMode && onLocationClick(loc)}
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
        {isFighterMode ? (
          <div className="text-text-theme-secondary grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>NOS = Nose</div>
            <div>FUS = Fuselage</div>
            <div>LW = Left Wing</div>
            <div>RW = Right Wing</div>
            <div>AFT = Aft</div>
          </div>
        ) : (
          <div className="text-text-theme-secondary grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>HD = Head</div>
            <div>CT = Center Torso</div>
            <div>LT/RT = Left/Right Torso</div>
            <div>LA/RA = Left/Right Arm</div>
            <div>LL/RL = Left/Right Leg</div>
          </div>
        )}
      </div>

      <p className={style.instructionsClass}>
        {isFighterMode
          ? 'Switch to Mech mode to edit armor values'
          : style.instructionsText}
      </p>
    </div>
  );
}
