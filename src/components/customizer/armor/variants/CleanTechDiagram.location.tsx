import React from 'react';

import { MechLocation } from '@/types/construction';

import type { BaseArmorLocationProps } from '../shared/ArmorVariantRenderHelpers';

import {
  getArmorStatusColor,
  getTorsoFrontStatusColor,
  getTorsoRearStatusColor,
  lightenColor,
  SELECTED_COLOR,
  SELECTED_STROKE,
} from '../shared/ArmorFills';
import { ArmorLocationInteractionGroup } from '../shared/ArmorLocationInteractionGroup';
import { ResolvedPosition } from '../shared/layout';
import { getLocationLabel, hasTorsoRear } from '../shared/MechSilhouette';

type CleanTechLocationProps = BaseArmorLocationProps;

interface CleanTechArmorValues {
  current: number;
  maximum: number;
  rear: number;
  rearMax: number;
}

interface CleanTechGeometry {
  dividerHeight: number;
  frontHeight: number;
  rearHeight: number;
  dividerY: number;
  rearY: number;
}

interface CleanTechColors {
  fillColor: string;
  rearFillColor: string;
  strokeColor: string;
  strokeWidth: number;
}

interface CleanTechColorInput {
  values: CleanTechArmorValues;
  showRear: boolean;
  isSelected: boolean;
  isHovered: boolean;
}

function resolveCleanTechArmorValues(
  data: CleanTechLocationProps['data'],
): CleanTechArmorValues {
  return {
    current: data?.current ?? 0,
    maximum: data?.maximum ?? 1,
    rear: data?.rear ?? 0,
    rearMax: data?.rearMaximum ?? 1,
  };
}

function resolveCleanTechGeometry(
  position: ResolvedPosition,
  showRear: boolean,
): CleanTechGeometry {
  const dividerHeight = showRear ? 2 : 0;
  const frontHeight = showRear ? position.height * 0.6 : position.height;
  const rearHeight = showRear ? position.height * 0.4 - dividerHeight : 0;
  const dividerY = position.y + frontHeight;

  return {
    dividerHeight,
    frontHeight,
    rearHeight,
    dividerY,
    rearY: dividerY + dividerHeight,
  };
}

function resolveCleanTechColors({
  values,
  showRear,
  isSelected,
  isHovered,
}: CleanTechColorInput): CleanTechColors {
  const { current, maximum, rear } = values;
  const frontBaseColor = isSelected
    ? SELECTED_COLOR
    : showRear
      ? getTorsoFrontStatusColor(current, maximum)
      : getArmorStatusColor(current, maximum);
  const rearBaseColor = isSelected
    ? SELECTED_COLOR
    : getTorsoRearStatusColor(rear, maximum);

  return {
    fillColor: isHovered ? lightenColor(frontBaseColor, 0.15) : frontBaseColor,
    rearFillColor: isHovered
      ? lightenColor(rearBaseColor, 0.15)
      : rearBaseColor,
    strokeColor: isSelected ? SELECTED_STROKE : '#475569',
    strokeWidth: isSelected ? 2.5 : 1,
  };
}

function getFrontValueFontSize(
  isHead: boolean,
  showRear: boolean,
  width: number,
): string {
  if (isHead) return '12px';
  if (showRear) return '14px';
  return width < 40 ? '14px' : '18px';
}

function getFrontValueY(
  position: ResolvedPosition,
  frontHeight: number,
  isHead: boolean,
  showRear: boolean,
): number {
  if (isHead) return position.y + frontHeight / 2 + 4;
  return position.y + frontHeight / 2 + (showRear ? 2 : 5);
}

interface CleanTechFrontShapeProps {
  position: ResolvedPosition;
  showRear: boolean;
  geometry: CleanTechGeometry;
  colors: CleanTechColors;
}

function CleanTechFrontShape({
  position,
  showRear,
  geometry,
  colors,
}: CleanTechFrontShapeProps): React.ReactElement {
  if (position.path && !showRear) {
    return (
      <path
        d={position.path}
        fill={colors.fillColor}
        stroke={colors.strokeColor}
        strokeWidth={colors.strokeWidth}
        className="transition-all duration-150"
      />
    );
  }

  return (
    <rect
      x={position.x}
      y={position.y}
      width={position.width}
      height={geometry.frontHeight}
      rx={6}
      fill={colors.fillColor}
      stroke={colors.strokeColor}
      strokeWidth={colors.strokeWidth}
      className="transition-all duration-150"
    />
  );
}

interface CleanTechRearSectionProps {
  position: ResolvedPosition;
  geometry: CleanTechGeometry;
  colors: CleanTechColors;
  rear: number;
}

function CleanTechRearSection({
  position,
  geometry,
  colors,
  rear,
}: CleanTechRearSectionProps): React.ReactElement {
  return (
    <>
      <line
        x1={position.x + 4}
        y1={geometry.dividerY + 1}
        x2={position.x + position.width - 4}
        y2={geometry.dividerY + 1}
        stroke="#334155"
        strokeWidth={1}
        strokeDasharray="3 2"
        className="pointer-events-none"
      />
      <rect
        x={position.x}
        y={geometry.rearY}
        width={position.width}
        height={geometry.rearHeight}
        rx={6}
        fill={colors.rearFillColor}
        stroke={colors.strokeColor}
        strokeWidth={colors.strokeWidth}
        className="transition-all duration-150"
      />
      <text
        x={position.center.x}
        y={geometry.rearY + 9}
        textAnchor="middle"
        className="pointer-events-none fill-white/80 font-semibold"
        style={{ fontSize: '8px' }}
      >
        R
      </text>
      <text
        x={position.center.x}
        y={geometry.rearY + geometry.rearHeight / 2 + 4}
        textAnchor="middle"
        className="pointer-events-none fill-white font-bold"
        style={{ fontSize: '12px' }}
      >
        {rear}
      </text>
    </>
  );
}

export function CleanTechLocation({
  location,
  position,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
  configType = 'biped',
}: CleanTechLocationProps): React.ReactElement {
  const label = getLocationLabel(location, configType);
  const showRear = hasTorsoRear(location);
  const isHead = location === MechLocation.HEAD;
  const values = resolveCleanTechArmorValues(data);
  const geometry = resolveCleanTechGeometry(position, showRear);
  const colors = resolveCleanTechColors({
    values,
    showRear,
    isSelected,
    isHovered,
  });
  const center = position.center;
  const frontLabel = showRear ? `${label}-F` : label;
  const { current, maximum, rear, rearMax } = values;

  return (
    <ArmorLocationInteractionGroup
      location={location}
      current={current}
      maximum={maximum}
      rear={rear}
      rearMaximum={rearMax}
      showRear={showRear}
      isSelected={isSelected}
      onClick={onClick}
      onHover={onHover}
    >
      <CleanTechFrontShape
        position={position}
        showRear={showRear}
        geometry={geometry}
        colors={colors}
      />

      <text
        x={center.x}
        y={position.y + (isHead ? 9 : showRear ? 10 : 12)}
        textAnchor="middle"
        className="pointer-events-none fill-white/80 font-semibold"
        style={{ fontSize: isHead ? '7px' : showRear ? '8px' : '10px' }}
      >
        {frontLabel}
      </text>
      <text
        x={center.x}
        y={getFrontValueY(position, geometry.frontHeight, isHead, showRear)}
        textAnchor="middle"
        className="pointer-events-none fill-white font-bold"
        style={{
          fontSize: getFrontValueFontSize(isHead, showRear, position.width),
        }}
      >
        {current}
      </text>
      {!isHead && (
        <text
          x={center.x}
          y={position.y + geometry.frontHeight / 2 + (showRear ? 14 : 18)}
          textAnchor="middle"
          className="pointer-events-none fill-white/60"
          style={{ fontSize: '9px' }}
        >
          / {maximum}
        </text>
      )}
      {showRear && (
        <CleanTechRearSection
          position={position}
          geometry={geometry}
          colors={colors}
          rear={rear}
        />
      )}
    </ArmorLocationInteractionGroup>
  );
}
