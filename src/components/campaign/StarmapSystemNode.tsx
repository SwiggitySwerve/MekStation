import React from 'react';
import { Circle, Group, Label, Ring, Tag, Text } from 'react-konva';

import type {
  IStarSystem,
  IStarmapSystemAnnotation,
  LODLevel,
} from './StarmapDisplay.model';

import {
  annotationToneGlyph,
  getDotSize,
  getFactionColor,
  isMajorSystem,
} from './StarmapDisplay.model';

interface StarSystemNodeProps {
  system: IStarSystem;
  lod: LODLevel;
  isSelected: boolean;
  isHovered: boolean;
  annotation?: IStarmapSystemAnnotation;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function annotationToneColor(
  tone: IStarmapSystemAnnotation['tone'] | undefined,
): string {
  if (tone === 'risk') return '#f97316';
  if (tone === 'warn') return '#facc15';
  return '#22c55e';
}

function shouldShowSystemLabel({
  system,
  lod,
  isSelected,
  isHovered,
  annotation,
}: {
  readonly system: IStarSystem;
  readonly lod: LODLevel;
  readonly isSelected: boolean;
  readonly isHovered: boolean;
  readonly annotation?: IStarmapSystemAnnotation;
}): boolean {
  if (annotation || isSelected || isHovered || lod === 'close') return true;
  return lod === 'medium' && isMajorSystem(system);
}

function systemStroke({
  isSelected,
  isHovered,
}: {
  readonly isSelected: boolean;
  readonly isHovered: boolean;
}): string {
  if (isSelected) return '#fbbf24';
  return isHovered ? '#ffffff' : '#1e293b';
}

function SelectionRing({
  isSelected,
  displaySize,
}: {
  readonly isSelected: boolean;
  readonly displaySize: number;
}): React.ReactElement | null {
  if (!isSelected) return null;
  return (
    <Ring
      innerRadius={displaySize + 2}
      outerRadius={displaySize + 5}
      fill="#fbbf24"
      opacity={0.9}
    />
  );
}

function HoverHalo({
  isVisible,
  displaySize,
  factionColor,
}: {
  readonly isVisible: boolean;
  readonly displaySize: number;
  readonly factionColor: string;
}): React.ReactElement | null {
  if (!isVisible) return null;
  return <Circle radius={displaySize + 8} fill={factionColor} opacity={0.2} />;
}

function FactionIndicator({
  showFactionIndicator,
  displaySize,
  factionColor,
}: {
  readonly showFactionIndicator: boolean;
  readonly displaySize: number;
  readonly factionColor: string;
}): React.ReactElement | null {
  if (!showFactionIndicator) return null;
  return (
    <Circle
      radius={displaySize + 1}
      stroke={factionColor}
      strokeWidth={2}
      opacity={0.6}
      listening={false}
    />
  );
}

function SystemLabels({
  showLabel,
  system,
  lod,
  displaySize,
}: {
  readonly showLabel: boolean;
  readonly system: IStarSystem;
  readonly lod: LODLevel;
  readonly displaySize: number;
}): React.ReactElement | null {
  if (!showLabel) return null;
  return (
    <>
      <Text
        text={system.name}
        x={displaySize + 6}
        y={-6}
        fontSize={lod === 'close' ? 12 : 10}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="#e2e8f0"
        shadowColor="#000000"
        shadowBlur={2}
        shadowOpacity={0.8}
        listening={false}
      />
      {lod === 'close' ? (
        <Text
          text={system.faction}
          x={displaySize + 6}
          y={7}
          fontSize={8}
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="#94a3b8"
          shadowColor="#000000"
          shadowBlur={2}
          shadowOpacity={0.8}
          listening={false}
        />
      ) : null}
    </>
  );
}

function AnnotationChip({
  annotation,
  lod,
  displaySize,
}: {
  readonly annotation?: IStarmapSystemAnnotation;
  readonly lod: LODLevel;
  readonly displaySize: number;
}): React.ReactElement | null {
  if (!annotation || lod === 'far') return null;
  return (
    <Label x={-displaySize} y={displaySize + 4} listening={false}>
      <Tag fill="#0f172a" opacity={0.85} cornerRadius={3} />
      <Text
        text={`${annotationToneGlyph(annotation.tone)}${annotation.label}`}
        fontSize={10}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill={annotationToneColor(annotation.tone)}
        fontStyle="bold"
        padding={3}
      />
    </Label>
  );
}

export const StarSystemNode = React.memo(function StarSystemNode({
  system,
  lod,
  isSelected,
  isHovered,
  annotation,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: StarSystemNodeProps): React.ReactElement {
  const baseSize = getDotSize(lod);
  const hoverScale = isHovered ? 1.3 : 1;
  const displaySize = baseSize * hoverScale;
  const factionColor = getFactionColor(system.faction);
  const showLabel = shouldShowSystemLabel({
    system,
    lod,
    isSelected,
    isHovered,
    annotation,
  });
  const showFactionIndicator = lod === 'close';

  return (
    <Group
      x={system.position.x}
      y={system.position.y}
      onClick={onClick}
      onTap={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <SelectionRing isSelected={isSelected} displaySize={displaySize} />
      <HoverHalo
        isVisible={isHovered && !isSelected}
        displaySize={displaySize}
        factionColor={factionColor}
      />

      <Circle
        radius={displaySize}
        fill={factionColor}
        stroke={systemStroke({ isSelected, isHovered })}
        strokeWidth={isSelected ? 2 : 1}
        shadowColor={factionColor}
        shadowBlur={isHovered ? 10 : 0}
        shadowOpacity={0.5}
      />

      <FactionIndicator
        showFactionIndicator={showFactionIndicator}
        displaySize={displaySize}
        factionColor={factionColor}
      />

      <SystemLabels
        showLabel={showLabel}
        system={system}
        lod={lod}
        displaySize={displaySize}
      />

      <AnnotationChip
        annotation={annotation}
        lod={lod}
        displaySize={displaySize}
      />
    </Group>
  );
});
