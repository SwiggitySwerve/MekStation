import React from 'react';

import {
  getArmorStatusColor,
  getTorsoFrontStatusColor,
  getTorsoRearStatusColor,
  lightenColor,
  darkenColor,
  SELECTED_COLOR,
} from './ArmorFills';
import {
  LEDDigit,
  BarGauge,
  CornerBrackets,
  NumberBadge,
  DotIndicator,
  LocationContentProps,
} from './LocationRenderer';

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

export function MegaMekLocationContent({
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
    ? lightenColor(frontBaseColor, 0.1)
    : frontBaseColor;
  const shadowColor = '#1a1a1a';
  const outlineColor = isSelected ? '#fbbf24' : '#000000';
  const outlineWidth = isSelected ? 2 : 1.2;

  const frontHeight = showRear ? pos.height * 0.65 : pos.height;
  const rearHeight = showRear ? pos.height * 0.35 : 0;
  const dividerY = pos.y + frontHeight;

  return (
    <>
      {pos.path && (
        <path
          d={pos.path}
          fill={shadowColor}
          stroke="none"
          className="pointer-events-none"
          transform="translate(2, 2)"
          opacity={0.3}
        />
      )}

      {pos.path ? (
        <path
          d={pos.path}
          fill={fillColor}
          stroke="none"
          className="transition-all duration-150"
        />
      ) : (
        <rect
          x={pos.x}
          y={pos.y}
          width={pos.width}
          height={frontHeight}
          rx={4}
          fill={fillColor}
          className="transition-all duration-150"
        />
      )}

      {pos.path ? (
        <path
          d={pos.path}
          fill="none"
          stroke={outlineColor}
          strokeWidth={outlineWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="transition-all duration-150"
        />
      ) : (
        <rect
          x={pos.x}
          y={pos.y}
          width={pos.width}
          height={frontHeight}
          rx={4}
          fill="none"
          stroke={outlineColor}
          strokeWidth={outlineWidth}
        />
      )}

      <text
        x={center.x}
        y={showRear ? pos.y + 14 : pos.y + 14}
        textAnchor="middle"
        className="pointer-events-none fill-white/80 font-semibold"
        style={{
          fontSize: showRear ? '9px' : '10px',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        }}
      >
        {showRear ? `${label} FRONT` : label}
      </text>
      <text
        x={center.x}
        y={showRear ? pos.y + frontHeight / 2 + 8 : pos.y + pos.height / 2 + 10}
        textAnchor="middle"
        className="pointer-events-none fill-white font-bold"
        style={{
          fontSize: pos.width < 40 ? '16px' : '20px',
          textShadow: '0 1px 3px rgba(0,0,0,0.9)',
        }}
      >
        {current}
      </text>
      <text
        x={center.x}
        y={
          showRear ? pos.y + frontHeight / 2 + 22 : pos.y + pos.height / 2 + 24
        }
        textAnchor="middle"
        className="pointer-events-none fill-white/60"
        style={{ fontSize: '9px' }}
      >
        / {maximum}
      </text>

      {showRear && (
        <>
          <line
            x1={pos.x + 8}
            y1={dividerY}
            x2={pos.x + pos.width - 8}
            y2={dividerY}
            stroke="#475569"
            strokeWidth={1}
            strokeDasharray="4 2"
            className="pointer-events-none"
          />
          <rect
            x={pos.x}
            y={dividerY}
            width={pos.width}
            height={rearHeight}
            rx={4}
            fill={isHovered ? lightenColor(rearBaseColor, 0.1) : rearBaseColor}
            className="transition-all duration-150"
          />
          <rect
            x={pos.x}
            y={dividerY}
            width={pos.width}
            height={rearHeight}
            rx={4}
            fill="none"
            stroke={outlineColor}
            strokeWidth={outlineWidth}
          />
          <text
            x={center.x}
            y={dividerY + 12}
            textAnchor="middle"
            className="pointer-events-none fill-white/80 font-semibold"
            style={{ fontSize: '8px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
          >
            REAR
          </text>
          <text
            x={center.x}
            y={dividerY + rearHeight / 2 + 8}
            textAnchor="middle"
            className="pointer-events-none fill-white font-bold"
            style={{
              fontSize: '16px',
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            }}
          >
            {rear}
          </text>
        </>
      )}
    </>
  );
}
