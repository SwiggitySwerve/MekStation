import React from 'react';

import { lightenColor, darkenColor } from './ArmorFills';
export type { LocationContentProps } from './LocationTypes';

export function ProgressRing({
  cx,
  cy,
  radius,
  progress,
  color,
  strokeWidth = 3,
}: {
  cx: number;
  cy: number;
  radius: number;
  progress: number;
  color: string;
  strokeWidth?: number;
}): React.ReactElement {
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

export function LEDDigit({
  value,
  x,
  y,
  size = 12,
  color = '#22d3ee',
}: {
  value: string;
  x: number;
  y: number;
  size?: number;
  color?: string;
}): React.ReactElement {
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

export function BarGauge({
  x,
  y,
  width,
  height,
  fillPercent,
  color,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  fillPercent: number;
  color: string;
}): React.ReactElement {
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

export function CornerBrackets({
  x,
  y,
  width,
  height,
  size = 8,
  color = '#22d3ee',
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  size?: number;
  color?: string;
}): React.ReactElement {
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

export function NumberBadge({
  x,
  y,
  value,
  color,
  size = 24,
}: {
  x: number;
  y: number;
  value: number;
  color: string;
  size?: number;
}): React.ReactElement {
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

export function DotIndicator({
  x,
  y,
  fillPercent,
  color,
  dots = 5,
  dotSize = 4,
  gap = 2,
}: {
  x: number;
  y: number;
  fillPercent: number;
  color: string;
  dots?: number;
  dotSize?: number;
  gap?: number;
}): React.ReactElement {
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
