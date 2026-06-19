import React from 'react';

import { MechLocation } from '@/types/construction';

import type { BaseArmorLocationProps } from '../shared/ArmorVariantRenderHelpers';
import type { ResolvedPosition } from '../shared/layout';

import { ArmorLocationInteractionGroup } from '../shared/ArmorLocationInteractionGroup';
import { getLocationLabel, hasTorsoRear } from '../shared/MechSilhouette';
import {
  getFrameFilter,
  type NeonArmorValues,
  type NeonColors,
  type NeonGeometry,
  ProgressRing,
  resolveNeonArmorValues,
  resolveNeonColors,
  resolveNeonGeometry,
} from './NeonOperatorDiagram.locationHelpers';

type NeonLocationProps = BaseArmorLocationProps;

interface NeonLocationFrameProps {
  position: ResolvedPosition;
  colors: NeonColors;
  isSelected: boolean;
  isHovered: boolean;
}

function NeonLocationFrame({
  position,
  colors,
  isSelected,
  isHovered,
}: NeonLocationFrameProps): React.ReactElement {
  return (
    <>
      <rect
        x={position.x}
        y={position.y}
        width={position.width}
        height={position.height}
        rx={4}
        fill={colors.glowColor}
        fillOpacity={colors.fillOpacity}
        className="transition-all duration-200"
      />

      <rect
        x={position.x}
        y={position.y}
        width={position.width}
        height={position.height}
        rx={4}
        fill="none"
        stroke={colors.glowColor}
        strokeWidth={isSelected ? 2.5 : 1.5}
        className="transition-all duration-200"
        style={{
          filter: getFrameFilter(isHovered, isSelected),
        }}
      />
    </>
  );
}

interface NeonRearSectionsProps {
  position: ResolvedPosition;
  geometry: NeonGeometry;
  values: NeonArmorValues;
  colors: NeonColors;
  isHovered: boolean;
  frontLabel: string;
}

function NeonRearSections({
  position,
  geometry,
  values,
  colors,
  isHovered,
  frontLabel,
}: NeonRearSectionsProps): React.ReactElement {
  const center = position.center;

  return (
    <>
      <text
        x={center.x}
        y={position.y + 10}
        textAnchor="middle"
        className="pointer-events-none fill-white/70 font-medium"
        style={{
          fontSize: '8px',
          textShadow: `0 0 3px ${colors.frontColor}`,
        }}
      >
        {frontLabel}
      </text>

      <ProgressRing
        cx={center.x}
        cy={geometry.frontCenterY + 4}
        radius={geometry.frontRingRadius}
        progress={values.frontPercent}
        color={colors.frontRingColor}
        strokeWidth={isHovered ? 4 : 3}
      />

      <text
        x={center.x}
        y={geometry.frontCenterY + 8}
        textAnchor="middle"
        className="pointer-events-none fill-white font-bold"
        style={{
          fontSize: '14px',
          textShadow: `0 0 10px ${colors.frontColor}`,
        }}
      >
        {values.current}
      </text>

      <line
        x1={position.x + 6}
        y1={geometry.dividerY}
        x2={position.x + position.width - 6}
        y2={geometry.dividerY}
        stroke="#64748b"
        strokeWidth={1}
        strokeDasharray="4 3"
        opacity={0.6}
      />

      <text
        x={center.x}
        y={geometry.dividerY + 9}
        textAnchor="middle"
        className="pointer-events-none fill-white/70 font-medium"
        style={{
          fontSize: '8px',
          textShadow: `0 0 3px ${colors.rearColor}`,
        }}
      >
        R
      </text>

      <ProgressRing
        cx={center.x}
        cy={geometry.rearCenterY + 2}
        radius={geometry.rearRingRadius}
        progress={values.rearPercent}
        color={colors.rearRingColor}
        strokeWidth={isHovered ? 3 : 2}
      />

      <text
        x={center.x}
        y={geometry.rearCenterY + 5}
        textAnchor="middle"
        className="pointer-events-none fill-white font-bold"
        style={{
          fontSize: '12px',
          textShadow: `0 0 10px ${colors.rearColor}`,
        }}
      >
        {values.rear}
      </text>
    </>
  );
}

interface NeonSingleSectionProps {
  position: ResolvedPosition;
  geometry: NeonGeometry;
  values: NeonArmorValues;
  colors: NeonColors;
  isHovered: boolean;
  isHead: boolean;
  label: string;
}

function NeonSingleSection({
  position,
  geometry,
  values,
  colors,
  isHovered,
  isHead,
  label,
}: NeonSingleSectionProps): React.ReactElement {
  const center = position.center;

  return (
    <>
      <text
        x={center.x}
        y={position.y + (isHead ? 9 : 12)}
        textAnchor="middle"
        className="pointer-events-none fill-white/70 font-medium"
        style={{
          fontSize: isHead ? '7px' : '9px',
          textShadow: `0 0 3px ${colors.glowColor}`,
        }}
      >
        {label}
      </text>

      {!isHead && (
        <ProgressRing
          cx={center.x}
          cy={position.y + position.height / 2 + 4}
          radius={geometry.frontRingRadius}
          progress={values.frontPercent}
          color={colors.glowColor}
          strokeWidth={isHovered ? 4 : 3}
        />
      )}

      <text
        x={center.x}
        y={
          position.y +
          (isHead ? position.height / 2 + 4 : position.height / 2 + 8)
        }
        textAnchor="middle"
        className="pointer-events-none fill-white font-bold"
        style={{
          fontSize: isHead ? '12px' : position.width < 40 ? '12px' : '16px',
          textShadow: `0 0 10px ${colors.glowColor}`,
        }}
      >
        {values.current}
      </text>
    </>
  );
}

export function NeonLocation({
  location,
  position,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
  configType = 'biped',
}: NeonLocationProps): React.ReactElement {
  const label = getLocationLabel(location, configType);
  const showRear = hasTorsoRear(location);
  const isHead = location === MechLocation.HEAD;
  const values = resolveNeonArmorValues(data, showRear);
  const colors = resolveNeonColors({
    current: values.current,
    maximum: values.maximum,
    rear: values.rear,
    showRear,
    isSelected,
    isHovered,
  });
  const geometry = resolveNeonGeometry(position, showRear);
  const frontLabel = showRear ? `${label}-F` : label;

  return (
    <ArmorLocationInteractionGroup
      location={location}
      current={values.current}
      maximum={values.maximum}
      rear={values.rear}
      rearMaximum={values.rearMaximum}
      showRear={showRear}
      isSelected={isSelected}
      onClick={onClick}
      onHover={onHover}
    >
      <NeonLocationFrame
        position={position}
        colors={colors}
        isSelected={isSelected}
        isHovered={isHovered}
      />

      {showRear ? (
        <NeonRearSections
          position={position}
          geometry={geometry}
          values={values}
          colors={colors}
          isHovered={isHovered}
          frontLabel={frontLabel}
        />
      ) : (
        <NeonSingleSection
          position={position}
          geometry={geometry}
          values={values}
          colors={colors}
          isHovered={isHovered}
          isHead={isHead}
          label={label}
        />
      )}
    </ArmorLocationInteractionGroup>
  );
}
