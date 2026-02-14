import React from 'react';

import type { LocationArmorData } from '@/types/construction/LocationArmorData';
import type { MechConfigType } from '@/types/construction/MechConfigType';

import { MechLocation } from '@/types/construction';

import {
  getArmorStatusColor,
  getTorsoFrontStatusColor,
  getTorsoRearStatusColor,
  darkenColor,
  lightenColor,
} from '../shared/ArmorFills';
import { ResolvedPosition } from '../shared/layout';
import { getLocationLabel, hasTorsoRear } from '../shared/MechSilhouette';

interface NumberBadgeProps {
  x: number;
  y: number;
  value: number;
  color: string;
  size?: number;
}

function NumberBadge({
  x,
  y,
  value,
  color,
  size = 24,
}: NumberBadgeProps): React.ReactElement {
  const radius = size / 2;

  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={radius + 2}
        fill="none"
        stroke={lightenColor(color, 0.2)}
        strokeWidth={1.5}
        opacity={0.6}
      />
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={darkenColor(color, 0.3)}
        stroke={color}
        strokeWidth={1}
      />
      <circle
        cx={x}
        cy={y - radius * 0.3}
        r={radius * 0.6}
        fill="url(#armor-metallic)"
        opacity={0.5}
      />
      <text
        x={x}
        y={y + size * 0.15}
        textAnchor="middle"
        fontSize={size * 0.55}
        fontWeight="bold"
        fill="white"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
      >
        {value}
      </text>
    </g>
  );
}

interface DotIndicatorProps {
  x: number;
  y: number;
  fillPercent: number;
  color: string;
  dots?: number;
  dotSize?: number;
  gap?: number;
}

function DotIndicator({
  x,
  y,
  fillPercent,
  color,
  dots = 5,
  dotSize = 4,
  gap = 2,
}: DotIndicatorProps): React.ReactElement {
  const filledDots = Math.ceil((fillPercent / 100) * dots);
  const totalWidth = dots * dotSize + (dots - 1) * gap;
  const startX = x - totalWidth / 2;

  return (
    <g>
      {Array.from({ length: dots }).map((_, i) => {
        const isFilled = i < filledDots;
        return (
          <circle
            key={i}
            cx={startX + i * (dotSize + gap) + dotSize / 2}
            cy={y}
            r={dotSize / 2}
            fill={isFilled ? color : '#334155'}
            stroke={isFilled ? lightenColor(color, 0.2) : '#475569'}
            strokeWidth={0.5}
            className="transition-all duration-200"
          />
        );
      })}
    </g>
  );
}

interface PremiumLocationProps {
  location: MechLocation;
  position: ResolvedPosition;
  data?: LocationArmorData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
  configType?: MechConfigType;
}

export function PremiumLocation({
  location,
  position,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
  configType = 'biped',
}: PremiumLocationProps): React.ReactElement {
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
    ? '#3b82f6'
    : showRear
      ? getTorsoFrontStatusColor(front, frontMax)
      : getArmorStatusColor(front, frontMax);
  const rearColor = isSelected
    ? '#2563eb'
    : getTorsoRearStatusColor(rear, frontMax);

  const liftOffset = isHovered ? -2 : 0;

  const frontSectionHeight = showRear ? pos.height * 0.6 : pos.height;
  const rearSectionHeight = showRear ? pos.height * 0.4 : 0;
  const dividerY = pos.y + frontSectionHeight;

  const center = pos.center;
  const frontCenterY = pos.y + frontSectionHeight / 2;
  const rearCenterY = dividerY + rearSectionHeight / 2;

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
          ry={8}
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
          y={pos.y + (isHead ? 9 : showRear ? 10 : 12)}
          textAnchor="middle"
          fontSize={isHead ? '7' : showRear ? '8' : '10'}
          fill="rgba(255,255,255,0.8)"
          fontWeight="600"
          letterSpacing="0.5"
        >
          {frontLabel}
        </text>

        <NumberBadge
          x={center.x}
          y={frontCenterY + (isHead ? 1 : 2)}
          value={front}
          color={frontColor}
          size={
            isHead
              ? 14
              : showRear
                ? pos.width < 50
                  ? 18
                  : 22
                : pos.width < 50
                  ? 20
                  : 28
          }
        />

        {!isHead && (
          <DotIndicator
            x={center.x}
            y={pos.y + frontSectionHeight - 10}
            fillPercent={frontPercent}
            color={frontColor}
            dots={showRear ? 4 : 5}
            dotSize={showRear ? 3 : pos.width < 50 ? 3 : 4}
          />
        )}

        {pos.width > 40 && !showRear && (
          <>
            <circle cx={pos.x + 8} cy={pos.y + 8} r={2} fill="#64748b" />
            <circle
              cx={pos.x + pos.width - 8}
              cy={pos.y + 8}
              r={2}
              fill="#64748b"
            />
            <circle
              cx={pos.x + 8}
              cy={pos.y + frontSectionHeight - 8}
              r={2}
              fill="#64748b"
            />
            <circle
              cx={pos.x + pos.width - 8}
              cy={pos.y + frontSectionHeight - 8}
              r={2}
              fill="#64748b"
            />
          </>
        )}
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
            fill={darkenColor(rearColor, 0.4)}
            stroke={isSelected ? '#60a5fa' : darkenColor(rearColor, 0.2)}
            strokeWidth={isSelected ? 2 : 1}
            className="transition-colors duration-150"
          />

          <rect
            x={pos.x}
            y={dividerY}
            width={pos.width}
            height={rearSectionHeight}
            rx={8}
            fill="url(#armor-carbon)"
            opacity={0.3}
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
            y={dividerY + 9}
            textAnchor="middle"
            fontSize="8"
            fill="rgba(255,255,255,0.7)"
            fontWeight="500"
          >
            {rearLabel}
          </text>

          <NumberBadge
            x={center.x}
            y={rearCenterY + 2}
            value={rear}
            color={rearColor}
            size={pos.width < 50 ? 16 : 20}
          />

          <DotIndicator
            x={center.x}
            y={dividerY + rearSectionHeight - 8}
            fillPercent={rearPercent}
            color={rearColor}
            dots={4}
            dotSize={3}
          />
        </>
      )}

      <rect
        x={pos.x}
        y={pos.y}
        width={pos.width}
        height={pos.height}
        rx={8}
        fill="none"
        stroke={isSelected ? '#60a5fa' : isHovered ? '#64748b' : 'transparent'}
        strokeWidth={isSelected ? 2 : 1}
        className="transition-colors duration-150"
      />
    </g>
  );
}
