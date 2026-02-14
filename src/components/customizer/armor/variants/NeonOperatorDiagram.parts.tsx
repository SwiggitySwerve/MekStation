import React from 'react';

import type { LocationArmorData } from '@/types/construction/LocationArmorData';
import type { MechConfigType } from '@/types/construction/MechConfigType';

import { MechLocation } from '@/types/construction';

import {
  getArmorStatusColor,
  getTorsoFrontStatusColor,
  getTorsoRearStatusColor,
  lightenColor,
  SELECTED_COLOR,
} from '../shared/ArmorFills';
import { ResolvedPosition } from '../shared/layout';
import { getLocationLabel, hasTorsoRear } from '../shared/MechSilhouette';

interface ProgressRingProps {
  cx: number;
  cy: number;
  radius: number;
  progress: number;
  color: string;
  strokeWidth?: number;
}

function ProgressRing({
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

interface NeonLocationProps {
  location: MechLocation;
  position: ResolvedPosition;
  data?: LocationArmorData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
  configType?: MechConfigType;
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
  const pos = position;

  const frontLabel = showRear ? `${label}-F` : label;
  const rearLabel = 'R';

  const front = data?.current ?? 0;
  const frontMax = data?.maximum ?? 1;
  const rear = data?.rear ?? 0;
  const rearMax = data?.rearMaximum ?? 1;

  const expectedFrontMax = showRear ? Math.round(frontMax * 0.75) : frontMax;
  const expectedRearMax = showRear ? Math.round(frontMax * 0.25) : 1;

  const frontPercent =
    expectedFrontMax > 0 ? Math.min(100, (front / expectedFrontMax) * 100) : 0;
  const rearPercent =
    expectedRearMax > 0 ? Math.min(100, (rear / expectedRearMax) * 100) : 0;

  const frontColor = isSelected
    ? SELECTED_COLOR
    : showRear
      ? getTorsoFrontStatusColor(front, frontMax)
      : getArmorStatusColor(front, frontMax);
  const rearColor = isSelected
    ? SELECTED_COLOR
    : getTorsoRearStatusColor(rear, frontMax);

  const glowColor = isHovered ? lightenColor(frontColor, 0.2) : frontColor;
  const fillOpacity = isHovered ? 0.4 : 0.25;

  const frontSectionHeight = showRear ? pos.height * 0.6 : pos.height;
  const rearSectionHeight = showRear ? pos.height * 0.4 : 0;
  const frontCenterY = pos.y + frontSectionHeight / 2;
  const rearCenterY = pos.y + frontSectionHeight + rearSectionHeight / 2;
  const dividerY = pos.y + frontSectionHeight;

  const frontRingRadius = showRear
    ? Math.min(pos.width, frontSectionHeight) * 0.3
    : Math.min(pos.width, pos.height) * 0.35;
  const rearRingRadius = showRear
    ? Math.min(pos.width, rearSectionHeight) * 0.35
    : 0;

  const center = pos.center;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${location} armor: ${front} of ${frontMax}${showRear ? `, rear: ${rear} of ${rearMax}` : ''}`}
      aria-pressed={isSelected}
      className="cursor-pointer focus:outline-none"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
    >
      <rect
        x={pos.x}
        y={pos.y}
        width={pos.width}
        height={pos.height}
        rx={4}
        fill={glowColor}
        fillOpacity={fillOpacity}
        className="transition-all duration-200"
      />

      <rect
        x={pos.x}
        y={pos.y}
        width={pos.width}
        height={pos.height}
        rx={4}
        fill="none"
        stroke={glowColor}
        strokeWidth={isSelected ? 2.5 : 1.5}
        className="transition-all duration-200"
        style={{
          filter:
            isHovered || isSelected
              ? 'url(#armor-neon-glow)'
              : 'url(#armor-glow)',
        }}
      />

      {showRear ? (
        <>
          <text
            x={center.x}
            y={pos.y + 10}
            textAnchor="middle"
            className="pointer-events-none fill-white/70 font-medium"
            style={{
              fontSize: '8px',
              textShadow: `0 0 3px ${frontColor}`,
            }}
          >
            {frontLabel}
          </text>

          <ProgressRing
            cx={center.x}
            cy={frontCenterY + 4}
            radius={frontRingRadius}
            progress={frontPercent}
            color={isHovered ? lightenColor(frontColor, 0.2) : frontColor}
            strokeWidth={isHovered ? 4 : 3}
          />

          <text
            x={center.x}
            y={frontCenterY + 8}
            textAnchor="middle"
            className="pointer-events-none fill-white font-bold"
            style={{
              fontSize: '14px',
              textShadow: `0 0 10px ${frontColor}`,
            }}
          >
            {front}
          </text>

          <line
            x1={pos.x + 6}
            y1={dividerY}
            x2={pos.x + pos.width - 6}
            y2={dividerY}
            stroke="#64748b"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.6}
          />

          <text
            x={center.x}
            y={dividerY + 9}
            textAnchor="middle"
            className="pointer-events-none fill-white/70 font-medium"
            style={{
              fontSize: '8px',
              textShadow: `0 0 3px ${rearColor}`,
            }}
          >
            {rearLabel}
          </text>

          <ProgressRing
            cx={center.x}
            cy={rearCenterY + 2}
            radius={rearRingRadius}
            progress={rearPercent}
            color={isHovered ? lightenColor(rearColor, 0.2) : rearColor}
            strokeWidth={isHovered ? 3 : 2}
          />

          <text
            x={center.x}
            y={rearCenterY + 5}
            textAnchor="middle"
            className="pointer-events-none fill-white font-bold"
            style={{
              fontSize: '12px',
              textShadow: `0 0 10px ${rearColor}`,
            }}
          >
            {rear}
          </text>
        </>
      ) : (
        <>
          <text
            x={center.x}
            y={pos.y + (isHead ? 9 : 12)}
            textAnchor="middle"
            className="pointer-events-none fill-white/70 font-medium"
            style={{
              fontSize: isHead ? '7px' : '9px',
              textShadow: `0 0 3px ${glowColor}`,
            }}
          >
            {label}
          </text>

          {!isHead && (
            <ProgressRing
              cx={center.x}
              cy={pos.y + pos.height / 2 + 4}
              radius={frontRingRadius}
              progress={frontPercent}
              color={glowColor}
              strokeWidth={isHovered ? 4 : 3}
            />
          )}

          <text
            x={center.x}
            y={pos.y + (isHead ? pos.height / 2 + 4 : pos.height / 2 + 8)}
            textAnchor="middle"
            className="pointer-events-none fill-white font-bold"
            style={{
              fontSize: isHead ? '12px' : pos.width < 40 ? '12px' : '16px',
              textShadow: `0 0 10px ${glowColor}`,
            }}
          >
            {front}
          </text>
        </>
      )}
    </g>
  );
}

export function getLocationsForConfig(
  configType: MechConfigType,
): MechLocation[] {
  switch (configType) {
    case 'quad':
    case 'quadvee':
      return [
        MechLocation.HEAD,
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.FRONT_LEFT_LEG,
        MechLocation.FRONT_RIGHT_LEG,
        MechLocation.REAR_LEFT_LEG,
        MechLocation.REAR_RIGHT_LEG,
      ];
    case 'tripod':
      return [
        MechLocation.HEAD,
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.LEFT_ARM,
        MechLocation.RIGHT_ARM,
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
        MechLocation.CENTER_LEG,
      ];
    case 'lam':
    case 'biped':
    default:
      return [
        MechLocation.HEAD,
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.LEFT_ARM,
        MechLocation.RIGHT_ARM,
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
      ];
  }
}
