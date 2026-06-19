import type React from 'react';

import { useState } from 'react';

import type { ArmorDiagramVariant } from '@/stores/useCustomizerSettingsStore';
import type { LocationArmorData } from '@/types/construction/LocationArmorData';
import type { MechConfigType } from '@/types/construction/MechConfigType';

import { MechLocation } from '@/types/construction';

import type { LocationArmorValues } from './LocationTypes';

import {
  getLayoutIdForConfig,
  type ResolvedPosition,
  useResolvedLayout,
} from './layout';

type ArmorVariantLayoutStyle = Parameters<typeof getLayoutIdForConfig>[1];

export const BIPED_ARMOR_LOCATIONS: readonly MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
];

export const QUAD_ARMOR_LOCATIONS: readonly MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.FRONT_LEFT_LEG,
  MechLocation.FRONT_RIGHT_LEG,
  MechLocation.REAR_LEFT_LEG,
  MechLocation.REAR_RIGHT_LEG,
];

export const TRIPOD_ARMOR_LOCATIONS: readonly MechLocation[] = [
  ...BIPED_ARMOR_LOCATIONS,
  MechLocation.CENTER_LEG,
];

export const FIGHTER_ARMOR_LOCATIONS: readonly MechLocation[] = [
  MechLocation.NOSE,
  MechLocation.FUSELAGE,
  MechLocation.LEFT_WING,
  MechLocation.RIGHT_WING,
  MechLocation.AFT,
];

export const SIX_SLOT_ARMOR_LOCATIONS = new Set<MechLocation>([
  MechLocation.HEAD,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
]);

export interface BaseArmorDiagramProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  unallocatedPoints: number;
  onLocationClick: (location: MechLocation) => void;
  className?: string;
}

export interface ConfigurableArmorDiagramProps extends BaseArmorDiagramProps {
  mechConfigType?: MechConfigType;
}

export interface VariantArmorDiagramProps extends BaseArmorDiagramProps {
  variant?: ArmorDiagramVariant;
}

export interface BaseArmorLocationProps {
  location: MechLocation;
  position: ResolvedPosition;
  data?: LocationArmorData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
  configType?: MechConfigType;
}

export interface ArmorLocationRenderState {
  location: MechLocation;
  position: ResolvedPosition;
  data?: LocationArmorData;
  isSelected: boolean;
  isHovered: boolean;
}

export function renderResolvedArmorLocations(
  locations: readonly MechLocation[],
  getPosition: (location: MechLocation) => ResolvedPosition | undefined,
  renderLocation: (
    location: MechLocation,
    position: ResolvedPosition,
  ) => React.ReactNode,
): React.ReactNode[] {
  return locations.map((location) => {
    const position = getPosition(location);

    return position ? renderLocation(location, position) : null;
  });
}

export function renderArmorLocationStates(
  locations: readonly MechLocation[],
  getPosition: (location: MechLocation) => ResolvedPosition | undefined,
  armorData: readonly LocationArmorData[],
  selectedLocation: MechLocation | null,
  hoveredLocation: MechLocation | null,
  renderLocation: (
    location: MechLocation,
    state: ArmorLocationRenderState,
  ) => React.ReactNode,
): React.ReactNode[] {
  return renderResolvedArmorLocations(
    locations,
    getPosition,
    (location, position) =>
      renderLocation(
        location,
        getArmorLocationRenderState(
          location,
          position,
          armorData,
          selectedLocation,
          hoveredLocation,
        ),
      ),
  );
}

export function findArmorData(
  armorData: readonly LocationArmorData[],
  location: MechLocation,
): LocationArmorData | undefined {
  return armorData.find((data) => data.location === location);
}

export function getArmorLocationRenderState(
  location: MechLocation,
  position: ResolvedPosition,
  armorData: readonly LocationArmorData[],
  selectedLocation: MechLocation | null,
  hoveredLocation: MechLocation | null,
): ArmorLocationRenderState {
  return {
    location,
    position,
    data: findArmorData(armorData, location),
    isSelected: selectedLocation === location,
    isHovered: hoveredLocation === location,
  };
}

export function useArmorVariantLayout(
  configType: MechConfigType,
  layoutStyle: ArmorVariantLayoutStyle,
) {
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(
    null,
  );
  const layoutId = getLayoutIdForConfig(configType, layoutStyle);
  const resolvedLayout = useResolvedLayout(layoutId);

  return {
    hoveredLocation,
    setHoveredLocation,
    ...resolvedLayout,
  };
}

export function getArmorValues(
  data: LocationArmorData | undefined,
): Required<LocationArmorValues> {
  return {
    current: data?.current ?? 0,
    maximum: data?.maximum ?? 1,
    rear: data?.rear ?? 0,
    rearMaximum: data?.rearMaximum ?? 1,
  };
}

export function getArmorLocationsForConfig(
  configType: MechConfigType,
): MechLocation[] {
  switch (configType) {
    case 'quad':
    case 'quadvee':
      return [...QUAD_ARMOR_LOCATIONS];
    case 'tripod':
      return [...TRIPOD_ARMOR_LOCATIONS];
    case 'lam':
    case 'biped':
    default:
      return [...BIPED_ARMOR_LOCATIONS];
  }
}
