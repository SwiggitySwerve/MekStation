import type { LocationArmorData } from '@/types/construction/LocationArmorData';
import type { MechConfigType } from '@/types/construction/MechConfigType';

import { MechLocation } from '@/types/construction';

import type { ResolvedPosition } from '../shared/layout';

import {
  getArmorStatusColor,
  getTorsoFrontStatusColor,
  getTorsoRearStatusColor,
} from '../shared/ArmorFills';
import { getLocationLabel, hasTorsoRear } from '../shared/MechSilhouette';

interface BuildPremiumLocationModelArgs {
  location: MechLocation;
  position: ResolvedPosition;
  data?: LocationArmorData;
  isSelected: boolean;
  isHovered: boolean;
  configType: MechConfigType;
}

interface ArmorValues {
  front: number;
  frontMax: number;
  rear: number;
  rearMax: number;
}

interface CornerRivetPoint {
  x: number;
  y: number;
}

export interface PremiumLocationModel extends ArmorValues {
  location: MechLocation;
  position: ResolvedPosition;
  showRear: boolean;
  isHead: boolean;
  isSelected: boolean;
  isHovered: boolean;
  frontLabel: string;
  rearLabel: string;
  frontPercent: number;
  rearPercent: number;
  frontColor: string;
  rearColor: string;
  liftOffset: number;
  frontSectionHeight: number;
  rearSectionHeight: number;
  dividerY: number;
  center: ResolvedPosition['center'];
  frontCenterY: number;
  rearCenterY: number;
  frontLabelY: number;
  frontLabelFontSize: string;
  frontBadgeSize: number;
  showFrontDots: boolean;
  frontDotCount: number;
  frontDotSize: number;
  cornerRivetPoints: CornerRivetPoint[];
  rearBadgeSize: number;
}

function getArmorValues(data?: LocationArmorData): ArmorValues {
  return {
    front: data?.current ?? 0,
    frontMax: data?.maximum ?? 1,
    rear: data?.rear ?? 0,
    rearMax: data?.rearMaximum ?? 1,
  };
}

function getFilledPercent(current: number, maximum: number): number {
  return maximum > 0 ? Math.min(100, (current / maximum) * 100) : 0;
}

function getFrontExpectedMax(showRear: boolean, frontMax: number): number {
  return showRear ? Math.round(frontMax * 0.75) : frontMax;
}

function getRearExpectedMax(showRear: boolean, frontMax: number): number {
  return showRear ? Math.round(frontMax * 0.25) : 1;
}

function getFrontColor(
  showRear: boolean,
  isSelected: boolean,
  front: number,
  frontMax: number,
): string {
  if (isSelected) {
    return '#3b82f6';
  }

  return showRear
    ? getTorsoFrontStatusColor(front, frontMax)
    : getArmorStatusColor(front, frontMax);
}

function getRearColor(
  isSelected: boolean,
  rear: number,
  frontMax: number,
): string {
  return isSelected ? '#2563eb' : getTorsoRearStatusColor(rear, frontMax);
}

function getFrontLabelY(
  position: ResolvedPosition,
  isHead: boolean,
  showRear: boolean,
): number {
  if (isHead) {
    return position.y + 9;
  }

  return position.y + (showRear ? 10 : 12);
}

function getFrontLabelFontSize(isHead: boolean, showRear: boolean): string {
  if (isHead) {
    return '7';
  }

  return showRear ? '8' : '10';
}

function getFrontBadgeSize(
  position: ResolvedPosition,
  isHead: boolean,
  showRear: boolean,
): number {
  if (isHead) {
    return 14;
  }

  if (showRear) {
    return position.width < 50 ? 18 : 22;
  }

  return position.width < 50 ? 20 : 28;
}

function getFrontDotSize(
  position: ResolvedPosition,
  showRear: boolean,
): number {
  return showRear || position.width < 50 ? 3 : 4;
}

function getCornerRivetPoints(
  position: ResolvedPosition,
  frontSectionHeight: number,
  showRear: boolean,
): CornerRivetPoint[] {
  if (position.width <= 40 || showRear) {
    return [];
  }

  return [
    { x: position.x + 8, y: position.y + 8 },
    { x: position.x + position.width - 8, y: position.y + 8 },
    { x: position.x + 8, y: position.y + frontSectionHeight - 8 },
    {
      x: position.x + position.width - 8,
      y: position.y + frontSectionHeight - 8,
    },
  ];
}

export function buildPremiumLocationModel({
  location,
  position,
  data,
  isSelected,
  isHovered,
  configType,
}: BuildPremiumLocationModelArgs): PremiumLocationModel {
  const label = getLocationLabel(location, configType);
  const showRear = hasTorsoRear(location);
  const isHead = location === MechLocation.HEAD;
  const armorValues = getArmorValues(data);

  const frontSectionHeight = showRear ? position.height * 0.6 : position.height;
  const rearSectionHeight = showRear ? position.height * 0.4 : 0;
  const dividerY = position.y + frontSectionHeight;
  const expectedFrontMax = getFrontExpectedMax(showRear, armorValues.frontMax);
  const expectedRearMax = getRearExpectedMax(showRear, armorValues.frontMax);

  return {
    ...armorValues,
    location,
    position,
    showRear,
    isHead,
    isSelected,
    isHovered,
    frontLabel: showRear ? `${label}-F` : label,
    rearLabel: 'R',
    frontPercent: getFilledPercent(armorValues.front, expectedFrontMax),
    rearPercent: getFilledPercent(armorValues.rear, expectedRearMax),
    frontColor: getFrontColor(
      showRear,
      isSelected,
      armorValues.front,
      armorValues.frontMax,
    ),
    rearColor: getRearColor(isSelected, armorValues.rear, armorValues.frontMax),
    liftOffset: isHovered ? -2 : 0,
    frontSectionHeight,
    rearSectionHeight,
    dividerY,
    center: position.center,
    frontCenterY: position.y + frontSectionHeight / 2,
    rearCenterY: dividerY + rearSectionHeight / 2,
    frontLabelY: getFrontLabelY(position, isHead, showRear),
    frontLabelFontSize: getFrontLabelFontSize(isHead, showRear),
    frontBadgeSize: getFrontBadgeSize(position, isHead, showRear),
    showFrontDots: !isHead,
    frontDotCount: showRear ? 4 : 5,
    frontDotSize: getFrontDotSize(position, showRear),
    cornerRivetPoints: getCornerRivetPoints(
      position,
      frontSectionHeight,
      showRear,
    ),
    rearBadgeSize: position.width < 50 ? 16 : 20,
  };
}
