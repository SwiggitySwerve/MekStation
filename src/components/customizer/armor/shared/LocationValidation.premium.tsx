import React from 'react';

import type { LocationContentProps } from './LocationTypes';

import {
  getArmorStatusColor,
  getTorsoFrontStatusColor,
  getTorsoRearStatusColor,
  darkenColor,
} from './ArmorFills';
import { NumberBadge, DotIndicator } from './LocationRenderer';

export function PremiumLocationContent({
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
    ? '#3b82f6'
    : showRear
      ? getTorsoFrontStatusColor(current, maximum)
      : getArmorStatusColor(current, maximum);
  const rearColor = isSelected
    ? '#2563eb'
    : getTorsoRearStatusColor(rear, maximum);
  const liftOffset = isHovered ? -2 : 0;

  const frontSectionHeight = showRear ? pos.height * 0.58 : pos.height;
  const rearSectionHeight = showRear ? pos.height * 0.42 : 0;
  const dividerY = pos.y + frontSectionHeight;
  const frontCenterY = pos.y + frontSectionHeight / 2;
  const rearCenterY = dividerY + rearSectionHeight / 2;

  return (
    <>
      <g
        transform={`translate(0, ${liftOffset})`}
        style={{
          filter: isHovered ? 'url(#armor-lift-shadow)' : undefined,
          transition: 'transform 0.15s ease-out',
        }}
      >
        <rect
          x={pos.x}
          y={pos.y}
          width={pos.width}
          height={frontSectionHeight}
          rx={8}
          fill={darkenColor(frontColor, 0.3)}
          stroke={isSelected ? '#60a5fa' : darkenColor(frontColor, 0.1)}
          strokeWidth={isSelected ? 2 : 1}
          className="transition-colors duration-150"
        />
        <rect
          x={pos.x}
          y={pos.y}
          width={pos.width}
          height={frontSectionHeight}
          rx={8}
          fill="url(#armor-metallic)"
          opacity={0.6}
        />
        <rect
          x={pos.x + 2}
          y={pos.y + 2}
          width={pos.width - 4}
          height={frontSectionHeight * 0.12}
          rx={6}
          fill="white"
          opacity={0.1}
        />
        <rect
          x={pos.x}
          y={pos.y + frontSectionHeight * (1 - frontPercent / 100)}
          width={pos.width}
          height={frontSectionHeight * (frontPercent / 100)}
          rx={8}
          fill={frontColor}
          opacity={0.4}
          className="transition-all duration-300"
        />
        <text
          x={center.x}
          y={pos.y + 12}
          textAnchor="middle"
          fontSize={showRear ? '7' : '9'}
          fill="rgba(255,255,255,0.8)"
          fontWeight="600"
          letterSpacing="0.5"
        >
          {showRear ? `${label} FRONT` : label}
        </text>
        <NumberBadge
          x={center.x}
          y={frontCenterY + 2}
          value={current}
          color={frontColor}
          size={
            showRear ? (pos.width < 50 ? 18 : 22) : pos.width < 50 ? 20 : 28
          }
        />
        <DotIndicator
          x={center.x}
          y={pos.y + frontSectionHeight - 10}
          fillPercent={frontPercent}
          color={frontColor}
          dots={showRear ? 4 : 5}
          dotSize={showRear ? 3 : pos.width < 50 ? 3 : 4}
        />
      </g>

      {showRear && (
        <>
          <line
            x1={pos.x + 4}
            y1={dividerY}
            x2={pos.x + pos.width - 4}
            y2={dividerY}
            stroke="#475569"
            strokeWidth={1}
            strokeDasharray="3 2"
          />
          <rect
            x={pos.x}
            y={dividerY}
            width={pos.width}
            height={rearSectionHeight}
            rx={8}
            fill={darkenColor(rearColor, 0.3)}
            stroke={darkenColor(rearColor, 0.1)}
            strokeWidth={1}
            className="transition-colors duration-150"
          />
          <rect
            x={pos.x}
            y={dividerY}
            width={pos.width}
            height={rearSectionHeight}
            rx={8}
            fill="url(#armor-metallic)"
            opacity={0.4}
          />
          <rect
            x={pos.x}
            y={dividerY + rearSectionHeight * (1 - rearPercent / 100)}
            width={pos.width}
            height={rearSectionHeight * (rearPercent / 100)}
            rx={8}
            fill={rearColor}
            opacity={0.4}
            className="transition-all duration-300"
          />
          <text
            x={center.x}
            y={dividerY + 10}
            textAnchor="middle"
            fontSize="7"
            fill="rgba(255,255,255,0.7)"
            fontWeight="500"
          >
            REAR
          </text>
          <NumberBadge
            x={center.x}
            y={rearCenterY + 2}
            value={rear}
            color={rearColor}
            size={pos.width < 50 ? 14 : 18}
          />
          <DotIndicator
            x={center.x}
            y={dividerY + rearSectionHeight - 8}
            fillPercent={rearPercent}
            color={rearColor}
            dots={4}
            dotSize={2.5}
          />
        </>
      )}
    </>
  );
}
