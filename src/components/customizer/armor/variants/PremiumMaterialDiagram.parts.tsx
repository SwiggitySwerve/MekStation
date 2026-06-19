import React from 'react';

import type { MechLocation } from '@/types/construction';
import type { LocationArmorData } from '@/types/construction/LocationArmorData';
import type { MechConfigType } from '@/types/construction/MechConfigType';

import type { ResolvedPosition } from '../shared/layout';

import { darkenColor, lightenColor } from '../shared/ArmorFills';
import { ArmorLocationInteractionGroup } from '../shared/ArmorLocationInteractionGroup';
import {
  buildPremiumLocationModel,
  type PremiumLocationModel,
} from './PremiumMaterialDiagram.location';

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

interface PremiumLocationSectionProps {
  model: PremiumLocationModel;
}

function PremiumFrontSection({
  model,
}: PremiumLocationSectionProps): React.ReactElement {
  const pos = model.position;

  return (
    <g
      transform={`translate(0, ${model.liftOffset})`}
      style={{
        filter: model.isHovered ? 'url(#armor-lift-shadow)' : undefined,
        transition: 'transform 0.15s ease-out',
      }}
    >
      <rect
        x={pos.x}
        y={pos.y}
        width={pos.width}
        height={model.frontSectionHeight}
        rx={8}
        ry={8}
        fill={darkenColor(model.frontColor, 0.3)}
        stroke={
          model.isSelected ? '#60a5fa' : darkenColor(model.frontColor, 0.1)
        }
        strokeWidth={model.isSelected ? 2 : 1}
        className="transition-colors duration-150"
      />

      <rect
        x={pos.x}
        y={pos.y}
        width={pos.width}
        height={model.frontSectionHeight}
        rx={8}
        fill="url(#armor-metallic)"
        opacity={0.6}
      />

      <rect
        x={pos.x + 2}
        y={pos.y + 2}
        width={pos.width - 4}
        height={model.frontSectionHeight * 0.12}
        rx={6}
        fill="white"
        opacity={0.1}
      />

      <rect
        x={pos.x}
        y={pos.y + model.frontSectionHeight * (1 - model.frontPercent / 100)}
        width={pos.width}
        height={model.frontSectionHeight * (model.frontPercent / 100)}
        rx={8}
        fill={model.frontColor}
        opacity={0.4}
        className="transition-all duration-300"
      />

      <text
        x={model.center.x}
        y={model.frontLabelY}
        textAnchor="middle"
        fontSize={model.frontLabelFontSize}
        fill="rgba(255,255,255,0.8)"
        fontWeight="600"
        letterSpacing="0.5"
      >
        {model.frontLabel}
      </text>

      <NumberBadge
        x={model.center.x}
        y={model.frontCenterY + (model.isHead ? 1 : 2)}
        value={model.front}
        color={model.frontColor}
        size={model.frontBadgeSize}
      />

      {model.showFrontDots && (
        <DotIndicator
          x={model.center.x}
          y={pos.y + model.frontSectionHeight - 10}
          fillPercent={model.frontPercent}
          color={model.frontColor}
          dots={model.frontDotCount}
          dotSize={model.frontDotSize}
        />
      )}

      {model.cornerRivetPoints.map((point) => (
        <circle
          key={`${point.x}-${point.y}`}
          cx={point.x}
          cy={point.y}
          r={2}
          fill="#64748b"
        />
      ))}
    </g>
  );
}

function PremiumRearSection({
  model,
}: PremiumLocationSectionProps): React.ReactElement {
  const pos = model.position;

  return (
    <>
      <line
        x1={pos.x + 4}
        y1={model.dividerY}
        x2={pos.x + pos.width - 4}
        y2={model.dividerY}
        stroke="#475569"
        strokeWidth={1}
        strokeDasharray="3 2"
      />

      <rect
        x={pos.x}
        y={model.dividerY}
        width={pos.width}
        height={model.rearSectionHeight}
        rx={8}
        fill={darkenColor(model.rearColor, 0.4)}
        stroke={
          model.isSelected ? '#60a5fa' : darkenColor(model.rearColor, 0.2)
        }
        strokeWidth={model.isSelected ? 2 : 1}
        className="transition-colors duration-150"
      />

      <rect
        x={pos.x}
        y={model.dividerY}
        width={pos.width}
        height={model.rearSectionHeight}
        rx={8}
        fill="url(#armor-carbon)"
        opacity={0.3}
      />

      <rect
        x={pos.x}
        y={
          model.dividerY +
          model.rearSectionHeight * (1 - model.rearPercent / 100)
        }
        width={pos.width}
        height={model.rearSectionHeight * (model.rearPercent / 100)}
        rx={8}
        fill={model.rearColor}
        opacity={0.4}
        className="transition-all duration-300"
      />

      <text
        x={model.center.x}
        y={model.dividerY + 9}
        textAnchor="middle"
        fontSize="8"
        fill="rgba(255,255,255,0.7)"
        fontWeight="500"
      >
        {model.rearLabel}
      </text>

      <NumberBadge
        x={model.center.x}
        y={model.rearCenterY + 2}
        value={model.rear}
        color={model.rearColor}
        size={model.rearBadgeSize}
      />

      <DotIndicator
        x={model.center.x}
        y={model.dividerY + model.rearSectionHeight - 8}
        fillPercent={model.rearPercent}
        color={model.rearColor}
        dots={4}
        dotSize={3}
      />
    </>
  );
}

function PremiumSelectionOutline({
  model,
}: PremiumLocationSectionProps): React.ReactElement {
  const pos = model.position;

  return (
    <rect
      x={pos.x}
      y={pos.y}
      width={pos.width}
      height={pos.height}
      rx={8}
      fill="none"
      stroke={
        model.isSelected
          ? '#60a5fa'
          : model.isHovered
            ? '#64748b'
            : 'transparent'
      }
      strokeWidth={model.isSelected ? 2 : 1}
      className="transition-colors duration-150"
    />
  );
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
  const model = buildPremiumLocationModel({
    location,
    position,
    data,
    isSelected,
    isHovered,
    configType,
  });

  return (
    <ArmorLocationInteractionGroup
      location={String(location)}
      current={model.front}
      maximum={model.frontMax}
      rear={model.rear}
      rearMaximum={model.rearMax}
      showRear={model.showRear}
      isSelected={model.isSelected}
      onClick={onClick}
      onHover={onHover}
    >
      <PremiumFrontSection model={model} />
      {model.showRear && <PremiumRearSection model={model} />}
      <PremiumSelectionOutline model={model} />
    </ArmorLocationInteractionGroup>
  );
}
