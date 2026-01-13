import React from 'react';
import { MechLocation } from '@/types/construction';
import { ArmorDiagramVariant } from '@/stores/useAppSettingsStore';
import {
  getArmorStatusColor,
  getTorsoFrontStatusColor,
  getTorsoRearStatusColor,
  lightenColor,
  darkenColor,
  SELECTED_COLOR,
  SELECTED_STROKE,
} from './ArmorFills';
import { LocationPosition } from './MechSilhouette';

export interface LocationArmorValues {
  current: number;
  maximum: number;
  rear?: number;
  rearMaximum?: number;
}

export interface VariantLocationProps {
  location: MechLocation;
  label: string;
  pos: LocationPosition;
  data: LocationArmorValues;
  showRear: boolean;
  isSelected: boolean;
  isHovered: boolean;
  variant: ArmorDiagramVariant;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
}

function ProgressRing({
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

function LEDDigit({ 
  value, 
  x, 
  y, 
  size = 12, 
  color = '#22d3ee' 
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

function BarGauge({
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
      <rect x={x} y={y} width={width} height={height} rx={1} fill="#1e293b" stroke="#334155" strokeWidth={0.5} />
      <rect x={x + 1} y={y + 1} width={Math.max(0, fillWidth)} height={height - 2} rx={0.5} fill={color} className="transition-all duration-300" />
      {[25, 50, 75].map((tick) => (
        <line key={tick} x1={x + (width * tick) / 100} y1={y} x2={x + (width * tick) / 100} y2={y + height} stroke="#475569" strokeWidth={0.5} />
      ))}
    </g>
  );
}

function CornerBrackets({
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
    <g stroke={color} strokeWidth={1.5} fill="none" style={{ filter: 'url(#armor-glow)' }}>
      <path d={`M ${x} ${y + size} L ${x} ${y} L ${x + size} ${y}`} />
      <path d={`M ${x + width - size} ${y} L ${x + width} ${y} L ${x + width} ${y + size}`} />
      <path d={`M ${x} ${y + height - size} L ${x} ${y + height} L ${x + size} ${y + height}`} />
      <path d={`M ${x + width - size} ${y + height} L ${x + width} ${y + height} L ${x + width} ${y + height - size}`} />
    </g>
  );
}

function NumberBadge({
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
      <circle cx={x} cy={y} r={radius + 2} fill="none" stroke={lightenColor(color, 0.2)} strokeWidth={1.5} opacity={0.6} />
      <circle cx={x} cy={y} r={radius} fill={darkenColor(color, 0.3)} stroke={color} strokeWidth={1} />
      <circle cx={x} cy={y - radius * 0.3} r={radius * 0.6} fill="url(#armor-metallic)" opacity={0.5} />
      <text x={x} y={y + size * 0.15} textAnchor="middle" fontSize={size * 0.55} fontWeight="bold" fill="white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
        {value}
      </text>
    </g>
  );
}

function DotIndicator({
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

function CleanTechLocationContent({
  pos,
  data,
  showRear,
  label,
  isSelected,
  isHovered,
}: {
  pos: LocationPosition;
  data: LocationArmorValues;
  showRear: boolean;
  label: string;
  isSelected: boolean;
  isHovered: boolean;
}): React.ReactElement {
  const { current, maximum, rear = 0 } = data;
  const center = { x: pos.x + pos.width / 2, y: pos.y + pos.height / 2 };

  const frontBaseColor = isSelected ? SELECTED_COLOR : showRear ? getTorsoFrontStatusColor(current, maximum) : getArmorStatusColor(current, maximum);
  const rearBaseColor = isSelected ? SELECTED_COLOR : getTorsoRearStatusColor(rear, maximum);

  const fillColor = isHovered ? lightenColor(frontBaseColor, 0.15) : frontBaseColor;
  const rearFillColor = isHovered ? lightenColor(rearBaseColor, 0.15) : rearBaseColor;
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
        <path d={pos.path} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} className="transition-all duration-150" />
      ) : (
        <rect x={pos.x} y={pos.y} width={pos.width} height={frontHeight} rx={6} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} className="transition-all duration-150" />
      )}

      <text x={center.x} y={pos.y + frontHeight / 2 + 5} textAnchor="middle" className="fill-white font-bold pointer-events-none" style={{ fontSize: pos.width < 40 ? '14px' : '18px' }}>
        {current}
      </text>
      <text x={center.x} y={pos.y + frontHeight / 2 + 18} textAnchor="middle" className="fill-white/60 pointer-events-none" style={{ fontSize: '9px' }}>
        / {maximum}
      </text>
      <text x={center.x} y={pos.y + 12} textAnchor="middle" className="fill-white/80 font-semibold pointer-events-none" style={{ fontSize: showRear ? '8px' : '10px' }}>
        {showRear ? `${label} FRONT` : label}
      </text>

      {showRear && (
        <>
          <line x1={pos.x + 4} y1={dividerY + 1} x2={pos.x + pos.width - 4} y2={dividerY + 1} stroke="#334155" strokeWidth={1} strokeDasharray="3 2" className="pointer-events-none" />
          <rect x={pos.x} y={rearY} width={pos.width} height={rearHeight} rx={6} fill={rearFillColor} stroke={strokeColor} strokeWidth={strokeWidth} className="transition-all duration-150" />
          <text x={center.x} y={rearY + 11} textAnchor="middle" className="fill-white/80 font-semibold pointer-events-none" style={{ fontSize: '8px' }}>REAR</text>
          <text x={center.x} y={rearY + rearHeight / 2 + 6} textAnchor="middle" className="fill-white font-bold pointer-events-none" style={{ fontSize: '14px' }}>{rear}</text>
        </>
      )}
    </>
  );
}

function NeonLocationContent({
  pos,
  data,
  showRear,
  label,
  isSelected,
  isHovered,
}: {
  pos: LocationPosition;
  data: LocationArmorValues;
  showRear: boolean;
  label: string;
  isSelected: boolean;
  isHovered: boolean;
}): React.ReactElement {
  const { current, maximum, rear = 0 } = data;
  const center = { x: pos.x + pos.width / 2, y: pos.y + pos.height / 2 };

  const expectedFrontMax = showRear ? Math.round(maximum * 0.75) : maximum;
  const expectedRearMax = showRear ? Math.round(maximum * 0.25) : 1;
  const frontPercent = expectedFrontMax > 0 ? Math.min(100, (current / expectedFrontMax) * 100) : 0;
  const rearPercent = expectedRearMax > 0 ? Math.min(100, (rear / expectedRearMax) * 100) : 0;

  const frontColor = isSelected ? SELECTED_COLOR : showRear ? getTorsoFrontStatusColor(current, maximum) : getArmorStatusColor(current, maximum);
  const rearColor = isSelected ? SELECTED_COLOR : getTorsoRearStatusColor(rear, maximum);
  const glowColor = isHovered ? lightenColor(frontColor, 0.2) : frontColor;
  const fillOpacity = isHovered ? 0.4 : 0.25;

  const frontSectionHeight = showRear ? pos.height * 0.55 : pos.height;
  const rearSectionHeight = showRear ? pos.height * 0.45 : 0;
  const frontCenterY = pos.y + frontSectionHeight / 2;
  const rearCenterY = pos.y + frontSectionHeight + rearSectionHeight / 2;
  const dividerY = pos.y + frontSectionHeight;

  const frontRingRadius = showRear ? Math.min(pos.width, frontSectionHeight) * 0.3 : Math.min(pos.width, pos.height) * 0.35;
  const rearRingRadius = showRear ? Math.min(pos.width, rearSectionHeight) * 0.35 : 0;

  return (
    <>
      <rect x={pos.x} y={pos.y} width={pos.width} height={pos.height} rx={4} fill={glowColor} fillOpacity={fillOpacity} className="transition-all duration-200" />
      <rect x={pos.x} y={pos.y} width={pos.width} height={pos.height} rx={4} fill="none" stroke={glowColor} strokeWidth={isSelected ? 2.5 : 1.5} className="transition-all duration-200" style={{ filter: isHovered || isSelected ? 'url(#armor-neon-glow)' : 'url(#armor-glow)' }} />

      {showRear ? (
        <>
          <text x={center.x} y={pos.y + 11} textAnchor="middle" className="fill-white/70 font-medium pointer-events-none" style={{ fontSize: '7px', textShadow: `0 0 5px ${frontColor}` }}>{label} FRONT</text>
          <ProgressRing cx={center.x} cy={frontCenterY + 4} radius={frontRingRadius} progress={frontPercent} color={isHovered ? lightenColor(frontColor, 0.2) : frontColor} strokeWidth={isHovered ? 4 : 3} />
          <text x={center.x} y={frontCenterY + 8} textAnchor="middle" className="fill-white font-bold pointer-events-none" style={{ fontSize: '14px', textShadow: `0 0 10px ${frontColor}` }}>{current}</text>
          <line x1={pos.x + 6} y1={dividerY} x2={pos.x + pos.width - 6} y2={dividerY} stroke="#64748b" strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
          <text x={center.x} y={dividerY + 10} textAnchor="middle" className="fill-white/70 font-medium pointer-events-none" style={{ fontSize: '7px', textShadow: `0 0 5px ${rearColor}` }}>REAR</text>
          <ProgressRing cx={center.x} cy={rearCenterY + 2} radius={rearRingRadius} progress={rearPercent} color={isHovered ? lightenColor(rearColor, 0.2) : rearColor} strokeWidth={isHovered ? 3 : 2} />
          <text x={center.x} y={rearCenterY + 5} textAnchor="middle" className="fill-white font-bold pointer-events-none" style={{ fontSize: '12px', textShadow: `0 0 10px ${rearColor}` }}>{rear}</text>
        </>
      ) : (
        <>
          <text x={center.x} y={pos.y + 12} textAnchor="middle" className="fill-white/70 font-medium pointer-events-none" style={{ fontSize: '8px', textShadow: `0 0 5px ${glowColor}` }}>{label}</text>
          <ProgressRing cx={center.x} cy={pos.y + pos.height / 2 + 4} radius={frontRingRadius} progress={frontPercent} color={glowColor} strokeWidth={isHovered ? 4 : 3} />
          <text x={center.x} y={pos.y + pos.height / 2 + 8} textAnchor="middle" className="fill-white font-bold pointer-events-none" style={{ fontSize: pos.width < 40 ? '12px' : '16px', textShadow: `0 0 10px ${glowColor}` }}>{current}</text>
        </>
      )}
    </>
  );
}

function TacticalLocationContent({
  pos,
  data,
  showRear,
  label,
  isSelected,
  isHovered,
}: {
  pos: LocationPosition;
  data: LocationArmorValues;
  showRear: boolean;
  label: string;
  isSelected: boolean;
  isHovered: boolean;
}): React.ReactElement {
  const { current, maximum, rear = 0 } = data;
  const center = { x: pos.x + pos.width / 2, y: pos.y + pos.height / 2 };

  const expectedFrontMax = showRear ? Math.round(maximum * 0.75) : maximum;
  const expectedRearMax = showRear ? Math.round(maximum * 0.25) : 1;
  const frontPercent = expectedFrontMax > 0 ? Math.min(100, (current / expectedFrontMax) * 100) : 0;
  const rearPercent = expectedRearMax > 0 ? Math.min(100, (rear / expectedRearMax) * 100) : 0;

  const frontColor = isSelected ? '#3b82f6' : showRear ? getTorsoFrontStatusColor(current, maximum) : getArmorStatusColor(current, maximum);
  const rearColor = isSelected ? '#3b82f6' : getTorsoRearStatusColor(rear, maximum);
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
      <rect x={pos.x} y={pos.y} width={pos.width} height={frontSectionHeight} fill={darkFrontFill} stroke="#475569" strokeWidth={1} className="transition-colors duration-200" />
      <rect x={pos.x} y={frontFillY} width={pos.width} height={frontFillHeight} fill={frontColor} opacity={0.8} className="transition-all duration-300" />
      <rect x={pos.x} y={pos.y} width={pos.width} height={frontSectionHeight} fill="url(#armor-grid)" opacity={0.5} />

      <text x={center.x} y={pos.y + 10} textAnchor="middle" fontSize={7} fill="#94a3b8" fontFamily="monospace">{showRear ? `${label}-F` : label}</text>
      <LEDDigit value={current.toString().padStart(2, '0')} x={center.x} y={pos.y + frontSectionHeight / 2 + 4} size={showRear ? 12 : 14} color={frontColor} />
      <BarGauge x={pos.x + 4} y={pos.y + frontSectionHeight - 10} width={pos.width - 8} height={5} fillPercent={frontPercent} color={frontColor} />

      {isHovered && <CornerBrackets x={pos.x} y={pos.y} width={pos.width} height={frontSectionHeight} size={6} color={frontColor} />}

      {showRear && (
        <>
          <line x1={pos.x + 4} y1={dividerY} x2={pos.x + pos.width - 4} y2={dividerY} stroke="#475569" strokeWidth={1} strokeDasharray="2 2" />
          <rect x={pos.x} y={dividerY} width={pos.width} height={rearSectionHeight} fill={darkRearFill} stroke="#475569" strokeWidth={1} className="transition-colors duration-200" />
          <rect x={pos.x} y={rearFillY} width={pos.width} height={rearFillHeight} fill={rearColor} opacity={0.8} className="transition-all duration-300" />
          <rect x={pos.x} y={dividerY} width={pos.width} height={rearSectionHeight} fill="url(#armor-grid)" opacity={0.5} />
          <text x={center.x} y={dividerY + 10} textAnchor="middle" fontSize={7} fill="#94a3b8" fontFamily="monospace">{label}-R</text>
          <LEDDigit value={rear.toString().padStart(2, '0')} x={center.x} y={dividerY + rearSectionHeight / 2 + 4} size={10} color={rearColor} />
          <BarGauge x={pos.x + 4} y={dividerY + rearSectionHeight - 8} width={pos.width - 8} height={4} fillPercent={rearPercent} color={rearColor} />
        </>
      )}
    </>
  );
}

function PremiumLocationContent({
  pos,
  data,
  showRear,
  label,
  isSelected,
  isHovered,
}: {
  pos: LocationPosition;
  data: LocationArmorValues;
  showRear: boolean;
  label: string;
  isSelected: boolean;
  isHovered: boolean;
}): React.ReactElement {
  const { current, maximum, rear = 0 } = data;
  const center = { x: pos.x + pos.width / 2, y: pos.y + pos.height / 2 };

  const expectedFrontMax = showRear ? Math.round(maximum * 0.75) : maximum;
  const expectedRearMax = showRear ? Math.round(maximum * 0.25) : 1;
  const frontPercent = expectedFrontMax > 0 ? Math.min(100, (current / expectedFrontMax) * 100) : 0;
  const rearPercent = expectedRearMax > 0 ? Math.min(100, (rear / expectedRearMax) * 100) : 0;

  const frontColor = isSelected ? '#3b82f6' : showRear ? getTorsoFrontStatusColor(current, maximum) : getArmorStatusColor(current, maximum);
  const rearColor = isSelected ? '#2563eb' : getTorsoRearStatusColor(rear, maximum);
  const liftOffset = isHovered ? -2 : 0;

  const frontSectionHeight = showRear ? pos.height * 0.58 : pos.height;
  const rearSectionHeight = showRear ? pos.height * 0.42 : 0;
  const dividerY = pos.y + frontSectionHeight;
  const frontCenterY = pos.y + frontSectionHeight / 2;
  const rearCenterY = dividerY + rearSectionHeight / 2;

  return (
    <>
      <g transform={`translate(0, ${liftOffset})`} style={{ filter: isHovered ? 'url(#armor-lift-shadow)' : undefined, transition: 'transform 0.15s ease-out' }}>
        <rect x={pos.x} y={pos.y} width={pos.width} height={frontSectionHeight} rx={8} fill={darkenColor(frontColor, 0.3)} stroke={isSelected ? '#60a5fa' : darkenColor(frontColor, 0.1)} strokeWidth={isSelected ? 2 : 1} className="transition-colors duration-150" />
        <rect x={pos.x} y={pos.y} width={pos.width} height={frontSectionHeight} rx={8} fill="url(#armor-metallic)" opacity={0.6} />
        <rect x={pos.x + 2} y={pos.y + 2} width={pos.width - 4} height={frontSectionHeight * 0.12} rx={6} fill="white" opacity={0.1} />
        <rect x={pos.x} y={pos.y + frontSectionHeight * (1 - frontPercent / 100)} width={pos.width} height={frontSectionHeight * (frontPercent / 100)} rx={8} fill={frontColor} opacity={0.4} className="transition-all duration-300" />
        <text x={center.x} y={pos.y + 12} textAnchor="middle" fontSize={showRear ? '7' : '9'} fill="rgba(255,255,255,0.8)" fontWeight="600" letterSpacing="0.5">{showRear ? `${label} FRONT` : label}</text>
        <NumberBadge x={center.x} y={frontCenterY + 2} value={current} color={frontColor} size={showRear ? (pos.width < 50 ? 18 : 22) : (pos.width < 50 ? 20 : 28)} />
        <DotIndicator x={center.x} y={pos.y + frontSectionHeight - 10} fillPercent={frontPercent} color={frontColor} dots={showRear ? 4 : 5} dotSize={showRear ? 3 : (pos.width < 50 ? 3 : 4)} />
      </g>

      {showRear && (
        <>
          <line x1={pos.x + 4} y1={dividerY} x2={pos.x + pos.width - 4} y2={dividerY} stroke="#475569" strokeWidth={1} strokeDasharray="3 2" />
          <rect x={pos.x} y={dividerY} width={pos.width} height={rearSectionHeight} rx={8} fill={darkenColor(rearColor, 0.3)} stroke={darkenColor(rearColor, 0.1)} strokeWidth={1} className="transition-colors duration-150" />
          <rect x={pos.x} y={dividerY} width={pos.width} height={rearSectionHeight} rx={8} fill="url(#armor-metallic)" opacity={0.4} />
          <rect x={pos.x} y={dividerY + rearSectionHeight * (1 - rearPercent / 100)} width={pos.width} height={rearSectionHeight * (rearPercent / 100)} rx={8} fill={rearColor} opacity={0.4} className="transition-all duration-300" />
          <text x={center.x} y={dividerY + 10} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.7)" fontWeight="500">REAR</text>
          <NumberBadge x={center.x} y={rearCenterY + 2} value={rear} color={rearColor} size={pos.width < 50 ? 14 : 18} />
          <DotIndicator x={center.x} y={dividerY + rearSectionHeight - 8} fillPercent={rearPercent} color={rearColor} dots={4} dotSize={2.5} />
        </>
      )}
    </>
  );
}

function MegaMekLocationContent({
  pos,
  data,
  showRear,
  label,
  isSelected,
  isHovered,
}: {
  pos: LocationPosition;
  data: LocationArmorValues;
  showRear: boolean;
  label: string;
  isSelected: boolean;
  isHovered: boolean;
}): React.ReactElement {
  const { current, maximum, rear = 0 } = data;
  const center = { x: pos.x + pos.width / 2, y: pos.y + pos.height / 2 };

  const frontBaseColor = isSelected ? SELECTED_COLOR : showRear ? getTorsoFrontStatusColor(current, maximum) : getArmorStatusColor(current, maximum);
  const rearBaseColor = isSelected ? SELECTED_COLOR : getTorsoRearStatusColor(rear, maximum);

  const fillColor = isHovered ? lightenColor(frontBaseColor, 0.1) : frontBaseColor;
  const shadowColor = '#1a1a1a';
  const outlineColor = isSelected ? '#fbbf24' : '#000000';
  const outlineWidth = isSelected ? 2 : 1.2;

  const frontHeight = showRear ? pos.height * 0.65 : pos.height;
  const rearHeight = showRear ? pos.height * 0.35 : 0;
  const dividerY = pos.y + frontHeight;

  return (
    <>
      {pos.path && <path d={pos.path} fill={shadowColor} stroke="none" className="pointer-events-none" transform="translate(2, 2)" opacity={0.3} />}

      {pos.path ? (
        <path d={pos.path} fill={fillColor} stroke="none" className="transition-all duration-150" />
      ) : (
        <rect x={pos.x} y={pos.y} width={pos.width} height={frontHeight} rx={4} fill={fillColor} className="transition-all duration-150" />
      )}

      {pos.path ? (
        <path d={pos.path} fill="none" stroke={outlineColor} strokeWidth={outlineWidth} strokeLinejoin="round" strokeLinecap="round" className="transition-all duration-150" />
      ) : (
        <rect x={pos.x} y={pos.y} width={pos.width} height={frontHeight} rx={4} fill="none" stroke={outlineColor} strokeWidth={outlineWidth} />
      )}

      <text x={center.x} y={showRear ? pos.y + 14 : pos.y + 14} textAnchor="middle" className="fill-white/80 font-semibold pointer-events-none" style={{ fontSize: showRear ? '9px' : '10px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
        {showRear ? `${label} FRONT` : label}
      </text>
      <text x={center.x} y={showRear ? pos.y + frontHeight / 2 + 8 : pos.y + pos.height / 2 + 10} textAnchor="middle" className="fill-white font-bold pointer-events-none" style={{ fontSize: pos.width < 40 ? '16px' : '20px', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
        {current}
      </text>
      <text x={center.x} y={showRear ? pos.y + frontHeight / 2 + 22 : pos.y + pos.height / 2 + 24} textAnchor="middle" className="fill-white/60 pointer-events-none" style={{ fontSize: '9px' }}>
        / {maximum}
      </text>

      {showRear && (
        <>
          <line x1={pos.x + 8} y1={dividerY} x2={pos.x + pos.width - 8} y2={dividerY} stroke="#475569" strokeWidth={1} strokeDasharray="4 2" className="pointer-events-none" />
          <rect x={pos.x} y={dividerY} width={pos.width} height={rearHeight} rx={4} fill={isHovered ? lightenColor(rearBaseColor, 0.1) : rearBaseColor} className="transition-all duration-150" />
          <rect x={pos.x} y={dividerY} width={pos.width} height={rearHeight} rx={4} fill="none" stroke={outlineColor} strokeWidth={outlineWidth} />
          <text x={center.x} y={dividerY + 12} textAnchor="middle" className="fill-white/80 font-semibold pointer-events-none" style={{ fontSize: '8px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>REAR</text>
          <text x={center.x} y={dividerY + rearHeight / 2 + 8} textAnchor="middle" className="fill-white font-bold pointer-events-none" style={{ fontSize: '16px', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>{rear}</text>
        </>
      )}
    </>
  );
}

export function VariantLocation({
  location,
  label,
  pos,
  data,
  showRear,
  isSelected,
  isHovered,
  variant,
  onClick,
  onHover,
}: VariantLocationProps): React.ReactElement {
  const { current, maximum, rear = 0, rearMaximum = 1 } = data;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${location} armor: ${current} of ${maximum}${showRear ? `, rear: ${rear} of ${rearMaximum}` : ''}`}
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
      {variant === 'clean-tech' && (
        <CleanTechLocationContent pos={pos} data={data} showRear={showRear} label={label} isSelected={isSelected} isHovered={isHovered} />
      )}
      {variant === 'neon-operator' && (
        <NeonLocationContent pos={pos} data={data} showRear={showRear} label={label} isSelected={isSelected} isHovered={isHovered} />
      )}
      {variant === 'tactical-hud' && (
        <TacticalLocationContent pos={pos} data={data} showRear={showRear} label={label} isSelected={isSelected} isHovered={isHovered} />
      )}
      {variant === 'premium-material' && (
        <PremiumLocationContent pos={pos} data={data} showRear={showRear} label={label} isSelected={isSelected} isHovered={isHovered} />
      )}
      {variant === 'megamek' && (
        <MegaMekLocationContent pos={pos} data={data} showRear={showRear} label={label} isSelected={isSelected} isHovered={isHovered} />
      )}
    </g>
  );
}
