import React from 'react';

import type { LocationContentProps } from './LocationTypes';

import {
  getArmorStatusColor,
  getTorsoFrontStatusColor,
  getTorsoRearStatusColor,
  lightenColor,
  SELECTED_COLOR,
} from './ArmorFills';

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
