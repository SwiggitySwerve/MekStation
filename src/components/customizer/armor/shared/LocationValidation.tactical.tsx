import React from 'react';

import type { LocationContentProps } from './LocationTypes';

import {
  getArmorStatusColor,
  getTorsoFrontStatusColor,
  getTorsoRearStatusColor,
  darkenColor,
} from './ArmorFills';
import { LEDDigit, BarGauge, CornerBrackets } from './LocationRenderer';

export function TacticalLocationContent({
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
    ? '#3b82f6'
    : getTorsoRearStatusColor(rear, maximum);
  const darkFrontFill = darkenColor(frontColor, 0.6);
  const darkRearFill = darkenColor(rearColor, 0.6);

  const frontSectionHeight = showRear ? pos.height * 0.55 : pos.height;
  const rearSectionHeight = showRear ? pos.height * 0.45 : 0;
  const dividerY = pos.y + frontSectionHeight;

  const frontFillHeight = frontSectionHeight * (frontPercent / 100);
  const frontFillY = pos.y + frontSectionHeight - frontFillHeight;
  const rearFillHeight = rearSectionHeight * (rearPercent / 100);
  const rearFillY = dividerY + rearSectionHeight - rearFillHeight;

  return (
    <>
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
        y={pos.y + 10}
        textAnchor="middle"
        fontSize={7}
        fill="#94a3b8"
        fontFamily="monospace"
      >
        {showRear ? `${label}-F` : label}
      </text>
      <LEDDigit
        value={current.toString().padStart(2, '0')}
        x={center.x}
        y={pos.y + frontSectionHeight / 2 + 4}
        size={showRear ? 12 : 14}
        color={frontColor}
      />
      <BarGauge
        x={pos.x + 4}
        y={pos.y + frontSectionHeight - 10}
        width={pos.width - 8}
        height={5}
        fillPercent={frontPercent}
        color={frontColor}
      />

      {isHovered && (
        <CornerBrackets
          x={pos.x}
          y={pos.y}
          width={pos.width}
          height={frontSectionHeight}
          size={6}
          color={frontColor}
        />
      )}

      {showRear && (
        <>
          <line
            x1={pos.x + 4}
            y1={dividerY}
            x2={pos.x + pos.width - 4}
            y2={dividerY}
            stroke="#475569"
            strokeWidth={1}
            strokeDasharray="2 2"
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
            fontSize={7}
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
            y={dividerY + rearSectionHeight - 8}
            width={pos.width - 8}
            height={4}
            fillPercent={rearPercent}
            color={rearColor}
          />
        </>
      )}
    </>
  );
}
