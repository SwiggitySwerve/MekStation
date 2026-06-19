import React from 'react';

import { MechLocation } from '@/types/construction';

import type { BaseArmorLocationProps } from '../shared/ArmorVariantRenderHelpers';
import type { ResolvedPosition } from '../shared/layout';

import {
  getMegaMekStatusColor,
  getMegaMekFrontStatusColor,
  getMegaMekRearStatusColor,
  lightenColor,
  SELECTED_COLOR,
  MEGAMEK_COLORS,
} from '../shared/ArmorFills';
import { ArmorLocationInteractionGroup } from '../shared/ArmorLocationInteractionGroup';
import { getLocationLabel, hasTorsoRear } from '../shared/MechSilhouette';

type MegaMekLocationProps = BaseArmorLocationProps;

interface MegaMekArmorValues {
  current: number;
  maximum: number;
  rear: number;
  rearMax: number;
}

interface MegaMekGeometry {
  frontHeight: number;
  rearHeight: number;
  dividerY: number;
}

interface MegaMekColors {
  fillColor: string;
  rearFillColor: string;
  shadowColor: string;
  outlineColor: string;
  outlineWidth: number;
}

interface MegaMekColorInput {
  values: MegaMekArmorValues;
  showRear: boolean;
  isSelected: boolean;
  isHovered: boolean;
}

function resolveMegaMekArmorValues(
  data: MegaMekLocationProps['data'],
): MegaMekArmorValues {
  return {
    current: data?.current ?? 0,
    maximum: data?.maximum ?? 1,
    rear: data?.rear ?? 0,
    rearMax: data?.rearMaximum ?? 1,
  };
}

function resolveMegaMekGeometry(
  position: ResolvedPosition,
  showRear: boolean,
): MegaMekGeometry {
  const frontHeight = showRear ? position.height * 0.6 : position.height;

  return {
    frontHeight,
    rearHeight: showRear ? position.height * 0.4 : 0,
    dividerY: position.y + frontHeight,
  };
}

function resolveMegaMekColors({
  values,
  showRear,
  isSelected,
  isHovered,
}: MegaMekColorInput): MegaMekColors {
  const { current, maximum, rear } = values;
  const frontBaseColor = isSelected
    ? SELECTED_COLOR
    : showRear
      ? getMegaMekFrontStatusColor(current, maximum)
      : getMegaMekStatusColor(current, maximum);
  const rearBaseColor = isSelected
    ? SELECTED_COLOR
    : getMegaMekRearStatusColor(rear, maximum);

  return {
    fillColor: isHovered ? lightenColor(frontBaseColor, 0.1) : frontBaseColor,
    rearFillColor: isHovered ? lightenColor(rearBaseColor, 0.1) : rearBaseColor,
    shadowColor: MEGAMEK_COLORS.SHADOW,
    outlineColor: isSelected ? SELECTED_COLOR : MEGAMEK_COLORS.OUTLINE,
    outlineWidth: isSelected ? 2 : 1.2,
  };
}

function getFrontLabelY(
  position: ResolvedPosition,
  isHead: boolean,
  showRear: boolean,
): number {
  if (isHead) return position.y + 10;
  if (showRear) return position.y + 12;
  return position.y + 14;
}

function getFrontValueY(
  position: ResolvedPosition,
  frontHeight: number,
  isHead: boolean,
  showRear: boolean,
): number {
  if (isHead) return position.y + position.height / 2 + 4;
  if (showRear) return position.y + frontHeight / 2 + 8;
  return position.y + position.height / 2 + 10;
}

function getFrontValueFontSize(
  isHead: boolean,
  position: ResolvedPosition,
): string {
  if (isHead) return '12px';
  return position.width < 40 ? '16px' : '20px';
}

interface MegaMekShapeProps {
  position: ResolvedPosition;
  geometry: MegaMekGeometry;
  colors: MegaMekColors;
}

function MegaMekShadow({
  position,
  colors,
}: MegaMekShapeProps): React.ReactElement | null {
  if (!position.path) return null;

  return (
    <path
      d={position.path}
      fill={colors.shadowColor}
      stroke="none"
      className="pointer-events-none"
      transform="translate(2, 2)"
      opacity={0.3}
    />
  );
}

function MegaMekFill({
  position,
  geometry,
  colors,
}: MegaMekShapeProps): React.ReactElement {
  if (position.path) {
    return (
      <path
        d={position.path}
        fill={colors.fillColor}
        stroke="none"
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
      rx={4}
      fill={colors.fillColor}
      className="transition-all duration-150"
    />
  );
}

function MegaMekOutline({
  position,
  geometry,
  colors,
}: MegaMekShapeProps): React.ReactElement {
  if (position.path) {
    return (
      <path
        d={position.path}
        fill="none"
        stroke={colors.outlineColor}
        strokeWidth={colors.outlineWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
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
      rx={4}
      fill="none"
      stroke={colors.outlineColor}
      strokeWidth={colors.outlineWidth}
    />
  );
}

interface MegaMekFrontLabelsProps {
  position: ResolvedPosition;
  geometry: MegaMekGeometry;
  label: string;
  isHead: boolean;
  showRear: boolean;
  current: number;
  maximum: number;
}

function MegaMekFrontLabels({
  position,
  geometry,
  label,
  isHead,
  showRear,
  current,
  maximum,
}: MegaMekFrontLabelsProps): React.ReactElement {
  const center = position.center;

  return (
    <>
      <text
        x={center.x}
        y={getFrontLabelY(position, isHead, showRear)}
        textAnchor="middle"
        className="pointer-events-none"
        style={{
          fontSize: isHead ? '7px' : showRear ? '8px' : '10px',
          fill: '#4a3f2f',
          fontWeight: 600,
        }}
      >
        {label}
      </text>
      <text
        x={center.x}
        y={getFrontValueY(position, geometry.frontHeight, isHead, showRear)}
        textAnchor="middle"
        className="pointer-events-none"
        style={{
          fontSize: getFrontValueFontSize(isHead, position),
          fill: '#1a1a1a',
          fontWeight: 700,
        }}
      >
        {current}
      </text>
      {!isHead && (
        <text
          x={center.x}
          y={
            showRear
              ? position.y + geometry.frontHeight / 2 + 22
              : position.y + position.height / 2 + 24
          }
          textAnchor="middle"
          className="pointer-events-none"
          style={{ fontSize: '9px', fill: '#5c4f3d' }}
        >
          / {maximum}
        </text>
      )}
    </>
  );
}

interface MegaMekRearSectionProps {
  position: ResolvedPosition;
  geometry: MegaMekGeometry;
  colors: MegaMekColors;
  rear: number;
}

function MegaMekRearSection({
  position,
  geometry,
  colors,
  rear,
}: MegaMekRearSectionProps): React.ReactElement {
  const center = position.center;

  return (
    <>
      <line
        x1={position.x + 8}
        y1={geometry.dividerY}
        x2={position.x + position.width - 8}
        y2={geometry.dividerY}
        stroke="#475569"
        strokeWidth={1}
        strokeDasharray="4 2"
        className="pointer-events-none"
      />

      <rect
        x={position.x}
        y={geometry.dividerY}
        width={position.width}
        height={geometry.rearHeight}
        rx={4}
        fill={colors.rearFillColor}
        className="transition-all duration-150"
      />

      <rect
        x={position.x}
        y={geometry.dividerY}
        width={position.width}
        height={geometry.rearHeight}
        rx={4}
        fill="none"
        stroke={colors.outlineColor}
        strokeWidth={colors.outlineWidth}
      />

      <text
        x={center.x}
        y={geometry.dividerY + 10}
        textAnchor="middle"
        className="pointer-events-none"
        style={{
          fontSize: '8px',
          fill: '#4a3f2f',
          fontWeight: 600,
        }}
      >
        R
      </text>

      <text
        x={center.x}
        y={geometry.dividerY + geometry.rearHeight / 2 + 8}
        textAnchor="middle"
        className="pointer-events-none"
        style={{
          fontSize: '16px',
          fill: '#1a1a1a',
          fontWeight: 700,
        }}
      >
        {rear}
      </text>
    </>
  );
}

export function MegaMekLocation({
  location,
  position,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
  configType = 'biped',
}: MegaMekLocationProps): React.ReactElement {
  const label = getLocationLabel(location, configType);
  const showRear = hasTorsoRear(location);
  const isHead = location === MechLocation.HEAD;
  const values = resolveMegaMekArmorValues(data);
  const geometry = resolveMegaMekGeometry(position, showRear);
  const colors = resolveMegaMekColors({
    values,
    showRear,
    isSelected,
    isHovered,
  });
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
      <MegaMekShadow position={position} geometry={geometry} colors={colors} />
      <MegaMekFill position={position} geometry={geometry} colors={colors} />
      <MegaMekOutline position={position} geometry={geometry} colors={colors} />
      <MegaMekFrontLabels
        position={position}
        geometry={geometry}
        label={frontLabel}
        isHead={isHead}
        showRear={showRear}
        current={current}
        maximum={maximum}
      />
      {showRear && (
        <MegaMekRearSection
          position={position}
          geometry={geometry}
          colors={colors}
          rear={rear}
        />
      )}
    </ArmorLocationInteractionGroup>
  );
}
