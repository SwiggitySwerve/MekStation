import React from 'react';

import type { LocationArmorData } from '@/types/construction/LocationArmorData';
import type { MechConfigType } from '@/types/construction/MechConfigType';

import { MechLocation } from '@/types/construction';

import {
  getArmorStatusColor,
  getTorsoFrontStatusColor,
  getTorsoRearStatusColor,
  darkenColor,
} from '../shared/ArmorFills';
import { ResolvedPosition } from '../shared/layout';
import { getLocationLabel, hasTorsoRear } from '../shared/MechSilhouette';

interface LEDDigitProps {
  value: string;
  x: number;
  y: number;
  size?: number;
  color?: string;
}

function LEDDigit({
  value,
  x,
  y,
  size = 12,
  color = '#22d3ee',
}: LEDDigitProps): React.ReactElement {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontFamily="'Courier New', monospace"
      fontWeight="bold"
      fontSize={size}
      fill={color}
      style={{
        textShadow: `0 0 4px ${color}, 0 0 8px ${color}50`,
        letterSpacing: '1px',
      }}
    >
      {value}
    </text>
  );
}

interface BarGaugeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  fillPercent: number;
  color: string;
}

function BarGauge({
  x,
  y,
  width,
  height,
  fillPercent,
  color,
}: BarGaugeProps): React.ReactElement {
  const fillWidth = (width - 2) * (fillPercent / 100);

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={1}
        fill="#1e293b"
        stroke="#334155"
        strokeWidth={0.5}
      />
      <rect
        x={x + 1}
        y={y + 1}
        width={Math.max(0, fillWidth)}
        height={height - 2}
        rx={0.5}
        fill={color}
        className="transition-all duration-300"
      />
      {[25, 50, 75].map((tick) => (
        <line
          key={tick}
          x1={x + (width * tick) / 100}
          y1={y}
          x2={x + (width * tick) / 100}
          y2={y + height}
          stroke="#475569"
          strokeWidth={0.5}
        />
      ))}
    </g>
  );
}

interface CornerBracketsProps {
  x: number;
  y: number;
  width: number;
  height: number;
  size?: number;
  color?: string;
}

function CornerBrackets({
  x,
  y,
  width,
  height,
  size = 8,
  color = '#22d3ee',
}: CornerBracketsProps): React.ReactElement {
  return (
    <g
      stroke={color}
      strokeWidth={1.5}
      fill="none"
      style={{ filter: 'url(#armor-glow)' }}
    >
      <path d={`M ${x} ${y + size} L ${x} ${y} L ${x + size} ${y}`} />
      <path
        d={`M ${x + width - size} ${y} L ${x + width} ${y} L ${x + width} ${y + size}`}
      />
      <path
        d={`M ${x} ${y + height - size} L ${x} ${y + height} L ${x + size} ${y + height}`}
      />
      <path
        d={`M ${x + width - size} ${y + height} L ${x + width} ${y + height} L ${x + width} ${y + height - size}`}
      />
    </g>
  );
}

interface TacticalLocationProps {
  location: MechLocation;
  position: ResolvedPosition;
  data?: LocationArmorData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
  configType?: MechConfigType;
}

export function TacticalLocation({
  location,
  position,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
  configType = 'biped',
}: TacticalLocationProps): React.ReactElement {
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
    ? '#3b82f6'
    : getTorsoRearStatusColor(rear, frontMax);
  const darkFrontFill = darkenColor(frontColor, 0.6);
  const darkRearFill = darkenColor(rearColor, 0.6);

  const frontSectionHeight = showRear ? pos.height * 0.6 : pos.height;
  const rearSectionHeight = showRear ? pos.height * 0.4 : 0;
  const dividerY = pos.y + frontSectionHeight;

  const frontFillHeight = frontSectionHeight * (frontPercent / 100);
  const frontFillY = pos.y + frontSectionHeight - frontFillHeight;
  const rearFillHeight = rearSectionHeight * (rearPercent / 100);
  const rearFillY = dividerY + rearSectionHeight - rearFillHeight;

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
        height={frontSectionHeight}
        fill={darkFrontFill}
        stroke="#475569"
        strokeWidth={1}
        className="transition-colors duration-200"
      />

      <rect
        x={pos.x}
        y={frontFillY}
        width={pos.width}
        height={frontFillHeight}
        fill={frontColor}
        opacity={0.8}
        className="transition-all duration-300"
      />

      <rect
        x={pos.x}
        y={pos.y}
        width={pos.width}
        height={frontSectionHeight}
        fill="url(#armor-grid)"
        opacity={0.5}
      />

      <text
        x={center.x}
        y={pos.y + (isHead ? 8 : 10)}
        textAnchor="middle"
        fontSize={isHead ? 7 : 9}
        fill="#94a3b8"
        fontFamily="monospace"
      >
        {showRear ? `${label}-F` : label}
      </text>

      <LEDDigit
        value={front.toString().padStart(2, '0')}
        x={center.x}
        y={pos.y + frontSectionHeight / 2 + (isHead ? 3 : 4)}
        size={isHead ? 10 : showRear ? 12 : 14}
        color={frontColor}
      />

      {!isHead && (
        <BarGauge
          x={pos.x + 4}
          y={pos.y + frontSectionHeight - 8}
          width={pos.width - 8}
          height={4}
          fillPercent={frontPercent}
          color={frontColor}
        />
      )}

      {showRear && (
        <>
          <line
            x1={pos.x}
            y1={dividerY}
            x2={pos.x + pos.width}
            y2={dividerY}
            stroke="#64748b"
            strokeWidth={1}
            strokeDasharray="3 2"
          />

          <rect
            x={pos.x}
            y={dividerY}
            width={pos.width}
            height={rearSectionHeight}
            fill={darkRearFill}
            stroke="#475569"
            strokeWidth={1}
            className="transition-colors duration-200"
          />

          <rect
            x={pos.x}
            y={rearFillY}
            width={pos.width}
            height={rearFillHeight}
            fill={rearColor}
            opacity={0.8}
            className="transition-all duration-300"
          />

          <rect
            x={pos.x}
            y={dividerY}
            width={pos.width}
            height={rearSectionHeight}
            fill="url(#armor-grid)"
            opacity={0.5}
          />

          <text
            x={center.x}
            y={dividerY + 10}
            textAnchor="middle"
            fontSize={9}
            fill="#94a3b8"
            fontFamily="monospace"
          >
            {label}-R
          </text>

          <LEDDigit
            value={rear.toString().padStart(2, '0')}
            x={center.x}
            y={dividerY + rearSectionHeight / 2 + 4}
            size={10}
            color={rearColor}
          />

          <BarGauge
            x={pos.x + 4}
            y={dividerY + rearSectionHeight - 7}
            width={pos.width - 8}
            height={3}
            fillPercent={rearPercent}
            color={rearColor}
          />
        </>
      )}

      <rect
        x={pos.x}
        y={pos.y}
        width={pos.width}
        height={pos.height}
        fill="none"
        stroke={isSelected ? '#60a5fa' : '#64748b'}
        strokeWidth={isSelected ? 2 : 1}
      />

      {(isHovered || isSelected) && (
        <CornerBrackets
          x={pos.x - 2}
          y={pos.y - 2}
          width={pos.width + 4}
          height={pos.height + 4}
          color={isSelected ? '#60a5fa' : '#22d3ee'}
        />
      )}
    </g>
  );
}
