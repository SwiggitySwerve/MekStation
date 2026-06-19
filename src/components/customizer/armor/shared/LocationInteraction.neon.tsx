import type { ReactElement } from 'react';

import type { LocationContentProps } from './LocationTypes';

import * as ArmorFills from './ArmorFills';
import { ProgressRing } from './LocationRenderer';

type ArmorPosition = LocationContentProps['pos'];

function getFillPercent(value: number, maximum: number): number {
  return maximum > 0 ? Math.min(100, (value / maximum) * 100) : 0;
}

function getSplitArmorPercents({
  current,
  maximum,
  rear = 0,
  showRear,
}: {
  current: number;
  maximum: number;
  rear?: number;
  showRear: boolean;
}): { frontPercent: number; rearPercent: number } {
  const expectedFrontMax = showRear ? Math.round(maximum * 0.75) : maximum;
  const expectedRearMax = showRear ? Math.round(maximum * 0.25) : 1;

  return {
    frontPercent: getFillPercent(current, expectedFrontMax),
    rearPercent: getFillPercent(rear, expectedRearMax),
  };
}

function getNeonLocationColors({
  current,
  maximum,
  rear,
  showRear,
  isSelected,
  isHovered,
}: {
  current: number;
  maximum: number;
  rear: number;
  showRear: boolean;
  isSelected: boolean;
  isHovered: boolean;
}): {
  frontColor: string;
  rearColor: string;
  glowColor: string;
  fillOpacity: number;
} {
  const frontColor = isSelected
    ? ArmorFills.SELECTED_COLOR
    : showRear
      ? ArmorFills.getTorsoFrontStatusColor(current, maximum)
      : ArmorFills.getArmorStatusColor(current, maximum);
  const rearColor = isSelected
    ? ArmorFills.SELECTED_COLOR
    : ArmorFills.getTorsoRearStatusColor(rear, maximum);

  return {
    frontColor,
    rearColor,
    glowColor: isHovered
      ? ArmorFills.lightenColor(frontColor, 0.2)
      : frontColor,
    fillOpacity: isHovered ? 0.4 : 0.25,
  };
}

function getNeonSections(
  pos: ArmorPosition,
  showRear: boolean,
): {
  frontCenterY: number;
  rearCenterY: number;
  dividerY: number;
  frontRingRadius: number;
  rearRingRadius: number;
} {
  const frontSectionHeight = showRear ? pos.height * 0.55 : pos.height;
  const rearSectionHeight = showRear ? pos.height * 0.45 : 0;

  return {
    frontCenterY: pos.y + frontSectionHeight / 2,
    rearCenterY: pos.y + frontSectionHeight + rearSectionHeight / 2,
    dividerY: pos.y + frontSectionHeight,
    frontRingRadius: showRear
      ? Math.min(pos.width, frontSectionHeight) * 0.3
      : Math.min(pos.width, pos.height) * 0.35,
    rearRingRadius: showRear
      ? Math.min(pos.width, rearSectionHeight) * 0.35
      : 0,
  };
}

function NeonLocationFrame({
  pos,
  glowColor,
  fillOpacity,
  isSelected,
  isHovered,
}: {
  pos: ArmorPosition;
  glowColor: string;
  fillOpacity: number;
  isSelected: boolean;
  isHovered: boolean;
}): ReactElement {
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
    </>
  );
}

function NeonSplitLocationContent({
  pos,
  label,
  current,
  rear,
  centerX,
  frontColor,
  rearColor,
  frontPercent,
  rearPercent,
  isHovered,
  sections,
}: {
  pos: ArmorPosition;
  label: string;
  current: number;
  rear: number;
  centerX: number;
  frontColor: string;
  rearColor: string;
  frontPercent: number;
  rearPercent: number;
  isHovered: boolean;
  sections: ReturnType<typeof getNeonSections>;
}): ReactElement {
  return (
    <>
      <text
        x={centerX}
        y={pos.y + 11}
        textAnchor="middle"
        className="pointer-events-none fill-white/70 font-medium"
        style={{ fontSize: '7px', textShadow: `0 0 5px ${frontColor}` }}
      >
        {label} FRONT
      </text>
      <ProgressRing
        cx={centerX}
        cy={sections.frontCenterY + 4}
        radius={sections.frontRingRadius}
        progress={frontPercent}
        color={
          isHovered ? ArmorFills.lightenColor(frontColor, 0.2) : frontColor
        }
        strokeWidth={isHovered ? 4 : 3}
      />
      <text
        x={centerX}
        y={sections.frontCenterY + 8}
        textAnchor="middle"
        className="pointer-events-none fill-white font-bold"
        style={{ fontSize: '14px', textShadow: `0 0 10px ${frontColor}` }}
      >
        {current}
      </text>
      <line
        x1={pos.x + 6}
        y1={sections.dividerY}
        x2={pos.x + pos.width - 6}
        y2={sections.dividerY}
        stroke="#64748b"
        strokeWidth={1}
        strokeDasharray="4 3"
        opacity={0.6}
      />
      <text
        x={centerX}
        y={sections.dividerY + 10}
        textAnchor="middle"
        className="pointer-events-none fill-white/70 font-medium"
        style={{ fontSize: '7px', textShadow: `0 0 5px ${rearColor}` }}
      >
        REAR
      </text>
      <ProgressRing
        cx={centerX}
        cy={sections.rearCenterY + 2}
        radius={sections.rearRingRadius}
        progress={rearPercent}
        color={isHovered ? ArmorFills.lightenColor(rearColor, 0.2) : rearColor}
        strokeWidth={isHovered ? 3 : 2}
      />
      <text
        x={centerX}
        y={sections.rearCenterY + 5}
        textAnchor="middle"
        className="pointer-events-none fill-white font-bold"
        style={{ fontSize: '12px', textShadow: `0 0 10px ${rearColor}` }}
      >
        {rear}
      </text>
    </>
  );
}

function NeonSingleLocationContent({
  pos,
  label,
  current,
  centerX,
  glowColor,
  frontPercent,
  isHovered,
  sections,
}: {
  pos: ArmorPosition;
  label: string;
  current: number;
  centerX: number;
  glowColor: string;
  frontPercent: number;
  isHovered: boolean;
  sections: ReturnType<typeof getNeonSections>;
}): ReactElement {
  return (
    <>
      <text
        x={centerX}
        y={pos.y + 12}
        textAnchor="middle"
        className="pointer-events-none fill-white/70 font-medium"
        style={{ fontSize: '8px', textShadow: `0 0 5px ${glowColor}` }}
      >
        {label}
      </text>
      <ProgressRing
        cx={centerX}
        cy={pos.y + pos.height / 2 + 4}
        radius={sections.frontRingRadius}
        progress={frontPercent}
        color={glowColor}
        strokeWidth={isHovered ? 4 : 3}
      />
      <text
        x={centerX}
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
  );
}

export function NeonLocationContent({
  pos,
  data,
  showRear,
  label,
  isSelected,
  isHovered,
}: LocationContentProps): ReactElement {
  const { current, maximum, rear = 0 } = data;
  const centerX = pos.x + pos.width / 2;
  const { frontPercent, rearPercent } = getSplitArmorPercents({
    current,
    maximum,
    rear,
    showRear,
  });
  const { frontColor, rearColor, glowColor, fillOpacity } =
    getNeonLocationColors({
      current,
      maximum,
      rear,
      showRear,
      isSelected,
      isHovered,
    });
  const sections = getNeonSections(pos, showRear);

  return (
    <>
      <NeonLocationFrame
        pos={pos}
        glowColor={glowColor}
        fillOpacity={fillOpacity}
        isSelected={isSelected}
        isHovered={isHovered}
      />
      {showRear ? (
        <NeonSplitLocationContent
          pos={pos}
          label={label}
          current={current}
          rear={rear}
          centerX={centerX}
          frontColor={frontColor}
          rearColor={rearColor}
          frontPercent={frontPercent}
          rearPercent={rearPercent}
          isHovered={isHovered}
          sections={sections}
        />
      ) : (
        <NeonSingleLocationContent
          pos={pos}
          label={label}
          current={current}
          centerX={centerX}
          glowColor={glowColor}
          frontPercent={frontPercent}
          isHovered={isHovered}
          sections={sections}
        />
      )}
    </>
  );
}
