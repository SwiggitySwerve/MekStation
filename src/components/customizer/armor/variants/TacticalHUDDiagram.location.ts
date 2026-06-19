import type { LocationArmorData } from '@/types/construction/LocationArmorData';
import type { MechConfigType } from '@/types/construction/MechConfigType';

import { MechLocation } from '@/types/construction';

import type { ResolvedPosition } from '../shared/layout';

import {
  darkenColor,
  getArmorStatusColor,
  getTorsoFrontStatusColor,
  getTorsoRearStatusColor,
} from '../shared/ArmorFills';
import { getLocationLabel, hasTorsoRear } from '../shared/MechSilhouette';

const SELECTED_ARMOR_COLOR = '#3b82f6';

interface TacticalLocationViewModelArgs {
  location: MechLocation;
  position: ResolvedPosition;
  data?: LocationArmorData;
  isSelected: boolean;
  configType: MechConfigType;
}

export interface TacticalLocationViewModel {
  location: MechLocation;
  label: string;
  showRear: boolean;
  isHead: boolean;
  pos: ResolvedPosition;
  center: {
    x: number;
    y: number;
  };
  front: number;
  frontMax: number;
  rear: number;
  rearMax: number;
  frontPercent: number;
  rearPercent: number;
  frontColor: string;
  rearColor: string;
  darkFrontFill: string;
  darkRearFill: string;
  frontSectionHeight: number;
  rearSectionHeight: number;
  dividerY: number;
  frontFillHeight: number;
  frontFillY: number;
  rearFillHeight: number;
  rearFillY: number;
}

function resolveFillPercent(current: number, maximum: number): number {
  if (maximum <= 0) {
    return 0;
  }

  return Math.min(100, (current / maximum) * 100);
}

function resolveExpectedFrontMaximum(
  showRear: boolean,
  frontMax: number,
): number {
  return showRear ? Math.round(frontMax * 0.75) : frontMax;
}

function resolveExpectedRearMaximum(
  showRear: boolean,
  frontMax: number,
): number {
  return showRear ? Math.round(frontMax * 0.25) : 1;
}

function resolveFrontColor(
  isSelected: boolean,
  showRear: boolean,
  front: number,
  frontMax: number,
): string {
  if (isSelected) {
    return SELECTED_ARMOR_COLOR;
  }

  if (showRear) {
    return getTorsoFrontStatusColor(front, frontMax);
  }

  return getArmorStatusColor(front, frontMax);
}

function resolveRearColor(
  isSelected: boolean,
  rear: number,
  frontMax: number,
): string {
  if (isSelected) {
    return SELECTED_ARMOR_COLOR;
  }

  return getTorsoRearStatusColor(rear, frontMax);
}

export function resolveTacticalLocationViewModel({
  location,
  position,
  data,
  isSelected,
  configType,
}: TacticalLocationViewModelArgs): TacticalLocationViewModel {
  const label = getLocationLabel(location, configType);
  const showRear = hasTorsoRear(location);
  const isHead = location === MechLocation.HEAD;

  const pos = position;
  const center = {
    x: pos.x + pos.width / 2,
    y: pos.y + pos.height / 2,
  };

  const front = data?.current ?? 0;
  const frontMax = data?.maximum ?? 1;
  const rear = data?.rear ?? 0;
  const rearMax = data?.rearMaximum ?? 1;

  const expectedFrontMax = resolveExpectedFrontMaximum(showRear, frontMax);
  const expectedRearMax = resolveExpectedRearMaximum(showRear, frontMax);
  const frontPercent = resolveFillPercent(front, expectedFrontMax);
  const rearPercent = resolveFillPercent(rear, expectedRearMax);

  const frontColor = resolveFrontColor(isSelected, showRear, front, frontMax);
  const rearColor = resolveRearColor(isSelected, rear, frontMax);
  const darkFrontFill = darkenColor(frontColor, 0.6);
  const darkRearFill = darkenColor(rearColor, 0.6);

  const frontSectionHeight = showRear ? pos.height * 0.6 : pos.height;
  const rearSectionHeight = showRear ? pos.height * 0.4 : 0;
  const dividerY = pos.y + frontSectionHeight;

  const frontFillHeight = frontSectionHeight * (frontPercent / 100);
  const frontFillY = pos.y + frontSectionHeight - frontFillHeight;
  const rearFillHeight = rearSectionHeight * (rearPercent / 100);
  const rearFillY = dividerY + rearSectionHeight - rearFillHeight;

  return {
    location,
    label,
    showRear,
    isHead,
    pos,
    center,
    front,
    frontMax,
    rear,
    rearMax,
    frontPercent,
    rearPercent,
    frontColor,
    rearColor,
    darkFrontFill,
    darkRearFill,
    frontSectionHeight,
    rearSectionHeight,
    dividerY,
    frontFillHeight,
    frontFillY,
    rearFillHeight,
    rearFillY,
  };
}
