import React, { useState } from 'react';

import { ArmorDiagramVariant } from '@/stores/useCustomizerSettingsStore';
import { MechLocation } from '@/types/construction';
import {
  QuadVeeMode,
  QUADVEE_MODES,
} from '@/types/construction/MechConfigurationSystem';

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

export interface QuadVeeArmorDiagramProps extends VariantArmorDiagramProps {
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

export function QuadVeeArmorDiagram(
  props: QuadVeeArmorDiagramProps,
): React.ReactElement {
  const { armorData, selectedLocation, unallocatedPoints } = props;
  const { onLocationClick, className = '', variant = 'clean-tech' } = props;
  const { initialMode = QuadVeeMode.MECH, onModeChange } = props;
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(
    null,
  );
  const [currentMode, setCurrentMode] = useState<QuadVeeMode>(initialMode);
  const style = getVariantStyle(variant);

  const handleModeChange = (mode: QuadVeeMode) => {
    setCurrentMode(mode);
    onModeChange?.(mode);
  };

  const hoveredPos = hoveredLocation
    ? QUAD_SILHOUETTE.locations[hoveredLocation]
    : null;

  return (
    <VariantDiagramContainer
      style={style}
      title="QuadVee Armor Allocation"
      className={className}
    >
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

      <ArmorDiagramSvgFrame
        viewBox={QUAD_SILHOUETTE.viewBox}
        className="mx-auto w-full max-w-[300px]"
      >
        <VariantDiagramSvgPrelude variant={variant} />

        {QUADVEE_LOCATIONS.map((loc) => {
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
