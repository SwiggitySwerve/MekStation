import React, { useState } from 'react';

import type { LocationArmorData } from '@/types/construction/LocationArmorData';

import { ArmorDiagramVariant } from '@/stores/useCustomizerSettingsStore';
import { MechLocation } from '@/types/construction';
import {
  LAMMode,
  LAM_CONFIGURATION,
  configurationRegistry,
} from '@/types/construction/MechConfigurationSystem';

import type { VariantArmorDiagramProps } from '../shared/ArmorVariantRenderHelpers';

import { ArmorDiagramSvgFrame } from '../shared/ArmorDiagramSvgFrame';
import { GradientDefs } from '../shared/ArmorFills';
import {
  BIPED_ARMOR_LOCATIONS,
  FIGHTER_ARMOR_LOCATIONS,
  findArmorData,
  getArmorValues,
} from '../shared/ArmorVariantRenderHelpers';
import {
  REALISTIC_SILHOUETTE,
  FIGHTER_SILHOUETTE,
  LOCATION_LABELS,
  FIGHTER_LOCATION_LABELS,
  hasTorsoRear,
} from '../shared/MechSilhouette';
import * as VariantChrome from '../shared/VariantDiagramChrome';
import { VariantDiagramSvgPrelude } from '../shared/VariantDiagramSvgPrelude';
import { VariantLocation } from '../shared/VariantLocationRenderer';
import { getVariantStyle, VariantLegend } from '../shared/VariantStyles';

export interface LAMArmorDiagramProps extends VariantArmorDiagramProps {
  variant?: ArmorDiagramVariant;
}

const LAM_MODES: readonly LAMMode[] = [
  LAMMode.MECH,
  LAMMode.AIRMECH,
  LAMMode.FIGHTER,
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

  for (const fighterLoc of FIGHTER_ARMOR_LOCATIONS) {
    fighterArmor.set(fighterLoc, {
      location: fighterLoc,
      current: 0,
      maximum: 0,
    });
  }

  for (const mechLoc of BIPED_ARMOR_LOCATIONS) {
    const fighterLoc = armorMapping[mechLoc];
    if (!fighterLoc || !FIGHTER_ARMOR_LOCATIONS.includes(fighterLoc)) continue;

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

function getLamDisplayState(
  currentMode: LAMMode,
  armorData: LocationArmorData[],
  hoveredLocation: MechLocation | null,
) {
  const isFighterMode = currentMode === LAMMode.FIGHTER;
  const silhouette = isFighterMode ? FIGHTER_SILHOUETTE : REALISTIC_SILHOUETTE;

  return {
    isFighterMode,
    displayLocations: isFighterMode
      ? FIGHTER_ARMOR_LOCATIONS
      : BIPED_ARMOR_LOCATIONS,
    displayArmorData: isFighterMode
      ? calculateFighterArmor(armorData)
      : armorData,
    silhouette,
    labels: isFighterMode ? FIGHTER_LOCATION_LABELS : LOCATION_LABELS,
    hoveredPos: hoveredLocation ? silhouette.locations[hoveredLocation] : null,
  };
}

interface LamModeSelectorProps {
  currentMode: LAMMode;
  onModeChange: (mode: LAMMode) => void;
}

function LamModeSelector({
  currentMode,
  onModeChange,
}: LamModeSelectorProps): React.ReactElement {
  return (
    <div className="mb-4 flex justify-center">
      <div className="bg-surface-subtle inline-flex rounded-lg p-1">
        {LAM_MODES.map((mode) => (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              currentMode === mode
                ? 'bg-accent text-white'
                : 'text-text-theme-secondary hover:text-white'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
}

interface LamLocationLayerProps {
  displayLocations: readonly MechLocation[];
  displayArmorData: readonly LocationArmorData[];
  labels: Partial<Record<MechLocation, string>>;
  silhouette: typeof REALISTIC_SILHOUETTE;
  isFighterMode: boolean;
  selectedLocation: MechLocation | null;
  hoveredLocation: MechLocation | null;
  variant: ArmorDiagramVariant;
  onLocationClick: (location: MechLocation) => void;
  onHover: (location: MechLocation | null) => void;
}

function LamLocationLayer({
  displayLocations,
  displayArmorData,
  labels,
  silhouette,
  isFighterMode,
  selectedLocation,
  hoveredLocation,
  variant,
  onLocationClick,
  onHover,
}: LamLocationLayerProps): React.ReactElement {
  return (
    <>
      {displayLocations.map((loc) => {
        const pos = silhouette.locations[loc];
        if (!pos) return null;

        return (
          <VariantLocation
            key={loc}
            location={loc}
            label={labels[loc] ?? loc}
            pos={pos}
            data={getArmorValues(findArmorData(displayArmorData, loc))}
            showRear={!isFighterMode && hasTorsoRear(loc)}
            isSelected={selectedLocation === loc}
            isHovered={hoveredLocation === loc}
            variant={variant}
            onClick={() => !isFighterMode && onLocationClick(loc)}
            onHover={(hovered) => onHover(hovered ? loc : null)}
          />
        );
      })}
    </>
  );
}

function LamModeKey({
  isFighterMode,
}: {
  isFighterMode: boolean;
}): React.ReactElement {
  const rows = isFighterMode
    ? [
        'NOS = Nose',
        'FUS = Fuselage',
        'LW = Left Wing',
        'RW = Right Wing',
        'AFT = Aft',
      ]
    : [
        'HD = Head',
        'CT = Center Torso',
        'LT/RT = Left/Right Torso',
        'LA/RA = Left/Right Arm',
        'LL/RL = Left/Right Leg',
      ];

  return (
    <div className="text-text-theme-secondary grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
      {rows.map((row) => (
        <div key={row}>{row}</div>
      ))}
    </div>
  );
}

export function LAMArmorDiagram(
  props: LAMArmorDiagramProps,
): React.ReactElement {
  const { armorData, selectedLocation, unallocatedPoints } = props;
  const { onLocationClick, className = '', variant = 'clean-tech' } = props;
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(
    null,
  );
  const [currentMode, setCurrentMode] = useState<LAMMode>(LAMMode.MECH);
  const style = getVariantStyle(variant);
  const {
    isFighterMode,
    displayLocations,
    displayArmorData,
    silhouette,
    labels,
    hoveredPos,
  } = getLamDisplayState(currentMode, armorData, hoveredLocation);

  return (
    <VariantChrome.VariantDiagramContainer
      style={style}
      title="LAM Armor Allocation"
      className={className}
    >
      <LamModeSelector
        currentMode={currentMode}
        onModeChange={setCurrentMode}
      />

      {isFighterMode && (
        <div className="text-text-theme-secondary mb-3 text-center text-xs">
          Fighter mode armor is calculated from Mech mode allocation
        </div>
      )}

      <ArmorDiagramSvgFrame
        viewBox={silhouette.viewBox}
        className="mx-auto w-full max-w-[300px]"
      >
        <VariantDiagramSvgPrelude variant={variant} />

        <LamLocationLayer
          displayLocations={displayLocations}
          displayArmorData={displayArmorData}
          labels={labels}
          silhouette={silhouette}
          isFighterMode={isFighterMode}
          selectedLocation={selectedLocation}
          hoveredLocation={hoveredLocation}
          variant={variant}
          onLocationClick={onLocationClick}
          onHover={setHoveredLocation}
        />

        <VariantChrome.VariantTargetingReticle
          position={hoveredPos}
          visible={style.showTargetingReticle}
        />
      </ArmorDiagramSvgFrame>

      <VariantLegend variant={variant} unallocatedPoints={unallocatedPoints} />

      <div className="border-border-theme-subtle mt-3 border-t pt-3">
        <LamModeKey isFighterMode={isFighterMode} />
      </div>

      <p className={style.instructionsClass}>
        {isFighterMode
          ? 'Switch to Mech mode to edit armor values'
          : style.instructionsText}
      </p>
    </VariantChrome.VariantDiagramContainer>
  );
}
