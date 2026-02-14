import React from 'react';

import type { LocationContentProps } from './LocationTypes';

import {
  getArmorStatusColor,
  getTorsoFrontStatusColor,
  getTorsoRearStatusColor,
  lightenColor,
  SELECTED_COLOR,
  SELECTED_STROKE,
} from './ArmorFills';
import { ProgressRing } from './LocationRenderer';

export function CleanTechLocationContent({
  pos,
  data,
  showRear,
  label,
  isSelected,
  isHovered,
}: LocationContentProps): React.ReactElement {
  const { current, maximum, rear = 0 } = data;
  const center = { x: pos.x + pos.width / 2, y: pos.y + pos.height / 2 };

  const frontBaseColor = isSelected
    ? SELECTED_COLOR
    : showRear
      ? getTorsoFrontStatusColor(current, maximum)
      : getArmorStatusColor(current, maximum);
  const rearBaseColor = isSelected
    ? SELECTED_COLOR
    : getTorsoRearStatusColor(rear, maximum);

  const fillColor = isHovered
    ? lightenColor(frontBaseColor, 0.15)
    : frontBaseColor;
  const rearFillColor = isHovered
    ? lightenColor(rearBaseColor, 0.15)
    : rearBaseColor;
  const strokeColor = isSelected ? SELECTED_STROKE : '#475569';
  const strokeWidth = isSelected ? 2.5 : 1;

  const dividerHeight = showRear ? 2 : 0;
  const frontHeight = showRear ? pos.height * 0.65 : pos.height;
  const rearHeight = showRear ? pos.height * 0.35 - dividerHeight : 0;
  const dividerY = pos.y + frontHeight;
  const rearY = dividerY + dividerHeight;

  return (
    <>
      {pos.path ? (
        <path
          d={pos.path}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          className="transition-all duration-150"
        />
      ) : (
        <rect
          x={pos.x}
          y={pos.y}
          width={pos.width}
          height={frontHeight}
          rx={6}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          className="transition-all duration-150"
        />
      )}

      <text
        x={center.x}
        y={pos.y + frontHeight / 2 + 5}
        textAnchor="middle"
        className="pointer-events-none fill-white font-bold"
        style={{ fontSize: pos.width < 40 ? '14px' : '18px' }}
      >
        {current}
      </text>
      <text
        x={center.x}
        y={pos.y + frontHeight / 2 + 18}
        textAnchor="middle"
        className="pointer-events-none fill-white/60"
        style={{ fontSize: '9px' }}
      >
        / {maximum}
      </text>
      <text
        x={center.x}
        y={pos.y + 12}
        textAnchor="middle"
        className="pointer-events-none fill-white/80 font-semibold"
        style={{ fontSize: showRear ? '8px' : '10px' }}
      >
        {showRear ? `${label} FRONT` : label}
      </text>

      {showRear && (
        <>
          <line
            x1={pos.x + 4}
            y1={dividerY + 1}
            x2={pos.x + pos.width - 4}
            y2={dividerY + 1}
            stroke="#334155"
            strokeWidth={1}
            strokeDasharray="3 2"
            className="pointer-events-none"
          />
          <rect
            x={pos.x}
            y={rearY}
            width={pos.width}
            height={rearHeight}
            rx={6}
            fill={rearFillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className="transition-all duration-150"
          />
          <text
            x={center.x}
            y={rearY + 11}
            textAnchor="middle"
            className="pointer-events-none fill-white/80 font-semibold"
            style={{ fontSize: '8px' }}
          >
            REAR
          </text>
          <text
            x={center.x}
            y={rearY + rearHeight / 2 + 6}
            textAnchor="middle"
            className="pointer-events-none fill-white font-bold"
            style={{ fontSize: '14px' }}
          >
            {rear}
          </text>
        </>
      )}
    </>
  );
}

export function NeonLocationContent({
  pos,
  data,
  showRear,
  label,
  isSelected,
  isHovered,
}: LocationContentProps): React.ReactElement {
  const { current, maximum, rear = 0 } = data;
  const center = { x: pos.x + pos.width / 2, y: pos.y + pos.height / 2 };

  const expectedFrontMax = showRear ? Math.round(maximum * 0.75) : maximum;
  const expectedRearMax = showRear ? Math.round(maximum * 0.25) : 1;
  const frontPercent =
    expectedFrontMax > 0
      ? Math.min(100, (current / expectedFrontMax) * 100)
      : 0;
  const rearPercent =
    expectedRearMax > 0 ? Math.min(100, (rear / expectedRearMax) * 100) : 0;

  const frontColor = isSelected
    ? SELECTED_COLOR
    : showRear
      ? getTorsoFrontStatusColor(current, maximum)
      : getArmorStatusColor(current, maximum);
  const rearColor = isSelected
    ? SELECTED_COLOR
    : getTorsoRearStatusColor(rear, maximum);
  const glowColor = isHovered ? lightenColor(frontColor, 0.2) : frontColor;
  const fillOpacity = isHovered ? 0.4 : 0.25;

  const frontSectionHeight = showRear ? pos.height * 0.55 : pos.height;
  const rearSectionHeight = showRear ? pos.height * 0.45 : 0;
  const frontCenterY = pos.y + frontSectionHeight / 2;
  const rearCenterY = pos.y + frontSectionHeight + rearSectionHeight / 2;
  const dividerY = pos.y + frontSectionHeight;

  const frontRingRadius = showRear
    ? Math.min(pos.width, frontSectionHeight) * 0.3
    : Math.min(pos.width, pos.height) * 0.35;
  const rearRingRadius = showRear
    ? Math.min(pos.width, rearSectionHeight) * 0.35
    : 0;

  return (
    <>
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
            y={pos.y + 11}
            textAnchor="middle"
            className="pointer-events-none fill-white/70 font-medium"
            style={{ fontSize: '7px', textShadow: `0 0 5px ${frontColor}` }}
          >
            {label} FRONT
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
            style={{ fontSize: '14px', textShadow: `0 0 10px ${frontColor}` }}
          >
            {current}
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
            y={dividerY + 10}
            textAnchor="middle"
            className="pointer-events-none fill-white/70 font-medium"
            style={{ fontSize: '7px', textShadow: `0 0 5px ${rearColor}` }}
          >
            REAR
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
            style={{ fontSize: '12px', textShadow: `0 0 10px ${rearColor}` }}
          >
            {rear}
          </text>
        </>
      ) : (
        <>
          <text
            x={center.x}
            y={pos.y + 12}
            textAnchor="middle"
            className="pointer-events-none fill-white/70 font-medium"
            style={{ fontSize: '8px', textShadow: `0 0 5px ${glowColor}` }}
          >
            {label}
          </text>
          <ProgressRing
            cx={center.x}
            cy={pos.y + pos.height / 2 + 4}
            radius={frontRingRadius}
            progress={frontPercent}
            color={glowColor}
            strokeWidth={isHovered ? 4 : 3}
          />
          <text
            x={center.x}
            y={pos.y + pos.height / 2 + 8}
            textAnchor="middle"
            className="pointer-events-none fill-white font-bold"
            style={{
              fontSize: pos.width < 40 ? '12px' : '16px',
              textShadow: `0 0 10px ${glowColor}`,
            }}
          >
            {current}
          </text>
        </>
      )}
    </>
  );
}
