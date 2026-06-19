import React from 'react';

import type { LocationArmorData } from '@/types/construction/LocationArmorData';

import type { ResolvedPosition } from '../shared/layout';

import {
  getArmorStatusColor,
  getTorsoFrontStatusColor,
  getTorsoRearStatusColor,
  lightenColor,
  SELECTED_COLOR,
} from '../shared/ArmorFills';

interface ProgressRingProps {
  cx: number;
  cy: number;
  radius: number;
  progress: number;
  color: string;
  strokeWidth?: number;
}

export function ProgressRing({
  cx,
  cy,
  radius,
  progress,
  color,
  strokeWidth = 3,
}: ProgressRingProps): React.ReactElement {
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        className="transition-all duration-300"
        style={{ filter: 'url(#armor-glow)' }}
      />
    </g>
  );
}

export interface NeonArmorValues {
  current: number;
  maximum: number;
  rear: number;
  rearMaximum: number;
  frontPercent: number;
  rearPercent: number;
}

export interface NeonGeometry {
  frontSectionHeight: number;
  frontCenterY: number;
  rearCenterY: number;
  dividerY: number;
  frontRingRadius: number;
  rearRingRadius: number;
}

export interface NeonColors {
  frontColor: string;
  rearColor: string;
  glowColor: string;
  fillOpacity: number;
  frontRingColor: string;
  rearRingColor: string;
}

interface NeonColorInput {
  current: number;
  maximum: number;
  rear: number;
  showRear: boolean;
  isSelected: boolean;
  isHovered: boolean;
}

function getArmorPercent(current: number, maximum: number): number {
  return maximum > 0 ? Math.min(100, (current / maximum) * 100) : 0;
}

export function resolveNeonArmorValues(
  data: LocationArmorData | undefined,
  showRear: boolean,
): NeonArmorValues {
  const current = data?.current ?? 0;
  const maximum = data?.maximum ?? 1;
  const rear = data?.rear ?? 0;
  const rearMaximum = data?.rearMaximum ?? 1;
  const expectedFrontMaximum = showRear ? Math.round(maximum * 0.75) : maximum;
  const expectedRearMaximum = showRear ? Math.round(maximum * 0.25) : 1;

  return {
    current,
    maximum,
    rear,
    rearMaximum,
    frontPercent: getArmorPercent(current, expectedFrontMaximum),
    rearPercent: getArmorPercent(rear, expectedRearMaximum),
  };
}

function getFrontStatusColor(
  current: number,
  maximum: number,
  showRear: boolean,
  isSelected: boolean,
): string {
  if (isSelected) return SELECTED_COLOR;
  if (showRear) return getTorsoFrontStatusColor(current, maximum);
  return getArmorStatusColor(current, maximum);
}

export function resolveNeonColors({
  current,
  maximum,
  rear,
  showRear,
  isSelected,
  isHovered,
}: NeonColorInput): NeonColors {
  const frontColor = getFrontStatusColor(
    current,
    maximum,
    showRear,
    isSelected,
  );
  const rearColor = isSelected
    ? SELECTED_COLOR
    : getTorsoRearStatusColor(rear, maximum);
  const glowColor = isHovered ? lightenColor(frontColor, 0.2) : frontColor;

  return {
    frontColor,
    rearColor,
    glowColor,
    fillOpacity: isHovered ? 0.4 : 0.25,
    frontRingColor: glowColor,
    rearRingColor: isHovered ? lightenColor(rearColor, 0.2) : rearColor,
  };
}

export function resolveNeonGeometry(
  position: ResolvedPosition,
  showRear: boolean,
): NeonGeometry {
  const frontSectionHeight = showRear ? position.height * 0.6 : position.height;
  const rearSectionHeight = showRear ? position.height * 0.4 : 0;
  const dividerY = position.y + frontSectionHeight;

  return {
    frontSectionHeight,
    frontCenterY: position.y + frontSectionHeight / 2,
    rearCenterY: dividerY + rearSectionHeight / 2,
    dividerY,
    frontRingRadius: showRear
      ? Math.min(position.width, frontSectionHeight) * 0.3
      : Math.min(position.width, position.height) * 0.35,
    rearRingRadius: showRear
      ? Math.min(position.width, rearSectionHeight) * 0.35
      : 0,
  };
}

export function getFrameFilter(
  isHovered: boolean,
  isSelected: boolean,
): string {
  return isHovered || isSelected ? 'url(#armor-neon-glow)' : 'url(#armor-glow)';
}
