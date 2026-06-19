/**
 * InfantryToken — renders an infantry platoon on the hex map.
 *
 * Shape: stacked-lines icon (classic infantry counter) with a trooper-count
 * label (e.g. "28") and a motive-type badge (Foot / Motorized / Jump /
 * Mechanized / Beast).
 *
 * Infantry has no facing in Total Warfare, so no facing arrow is rendered.
 * Multiple platoons per hex: stack indicator badge "×N" appears when
 * platoonCount > 1 (set by the parent based on stacking rules).
 *
 * Counter decrements as troopers are lost (infantryCount drives the label).
 *
 * @spec openspec/changes/add-per-type-hex-tokens/specs/tactical-map-interface/spec.md
 *        §Per-Type Token Rendering — Infantry renders stack icon with count
 *        §Per-Type Facing Rules — Infantry has no facing
 *        §Per-Type Stacking Rules — Infantry platoons stack to 4
 */

import React from 'react';

import type { IInfantryToken } from '@/types/gameplay';

import { HEX_SIZE } from '@/constants/hexMap';
import {
  InfantryMotiveType,
  InfantryTokenSpecialization,
} from '@/types/gameplay';

import type { ITokenSharedProps } from './tokenTypes';

import {
  DestroyedCrossOverlay,
  TOKEN_BODY_OUTLINE_COLOR,
  TOKEN_BODY_STROKE_WIDTH,
  TokenDesignationLabel,
  selectionTargetRingColor,
  tokenSideBodyColor,
} from './tokenVisuals';

export const INF_TOKEN_RADIUS = HEX_SIZE * 0.38;
export const INF_RING_RADIUS = HEX_SIZE * 0.5;

/** Short 2-char label for each motive type shown in the badge. */
function motiveLabel(m: InfantryMotiveType | undefined): string {
  switch (m) {
    case InfantryMotiveType.Foot:
      return 'FT';
    case InfantryMotiveType.Motorized:
      return 'MT';
    case InfantryMotiveType.Jump:
      return 'JP';
    case InfantryMotiveType.Mechanized:
      return 'MZ';
    case InfantryMotiveType.Beast:
      return 'BS';
    default:
      return 'FT';
  }
}

/** Short label for specialization overlays. */
function specLabel(s: InfantryTokenSpecialization | undefined): string | null {
  switch (s) {
    case InfantryTokenSpecialization.AntiMech:
      return 'AM';
    case InfantryTokenSpecialization.Marine:
      return 'MR';
    case InfantryTokenSpecialization.Scuba:
      return 'SC';
    case InfantryTokenSpecialization.Mountain:
      return 'MN';
    case InfantryTokenSpecialization.XCT:
      return 'XC';
    default:
      return null;
  }
}

export interface InfantryTokenProps extends ITokenSharedProps {
  token: IInfantryToken;
}

export const InfantryToken = React.memo(function InfantryToken({
  token,
  eventState,
}: InfantryTokenProps): React.ReactElement {
  const isDestroyed = token.isDestroyed || eventState.destroyed;
  // infantryCount + platoonCount are wired from
  // IInfantryCombatState.survivingTroopers via the unitStateToToken adapter
  // (per `wire-combat-behavior-dispatch`, Council #1 PR7).
  const trooperCount = token.infantryCount;
  const platoonCount = token.platoonCount;

  const bodyColor = tokenSideBodyColor(token.side, isDestroyed);

  const ringColor = selectionTargetRingColor(token);

  const spec = specLabel(token.infantrySpecialization);

  return (
    <>
      {/* Selection ring — no facing rotation for infantry */}
      <circle
        r={INF_RING_RADIUS}
        fill="none"
        stroke={ringColor}
        strokeWidth={2.5}
      />

      {/* Background circle */}
      <circle
        r={INF_TOKEN_RADIUS}
        fill={bodyColor}
        stroke={TOKEN_BODY_OUTLINE_COLOR}
        strokeWidth={TOKEN_BODY_STROKE_WIDTH}
      />

      {/* Stack icon: three horizontal lines (classic infantry counter symbol) */}
      <g stroke="white" strokeWidth={1.8} strokeLinecap="round">
        <line x1={-8} y1={-6} x2={8} y2={-6} />
        <line x1={-8} y1={-1} x2={8} y2={-1} />
        <line x1={-8} y1={4} x2={8} y2={4} />
      </g>

      {/* Trooper count label — top-right, decrements as troopers are lost */}
      <g
        transform={`translate(${INF_TOKEN_RADIUS - 2}, ${-INF_TOKEN_RADIUS + 2})`}
      >
        <rect
          x={-9}
          y={-7}
          width={18}
          height={11}
          rx={2}
          fill="#1e293b"
          opacity={0.8}
        />
        <text
          textAnchor="middle"
          fontSize={7}
          fontWeight="bold"
          fill="white"
          dy={2}
          data-testid="infantry-count"
        >
          {trooperCount}
        </text>
      </g>

      {/* Motive-type badge — bottom-left corner */}
      <g
        transform={`translate(${-INF_TOKEN_RADIUS + 2}, ${INF_TOKEN_RADIUS - 2})`}
      >
        <rect
          x={-8}
          y={-8}
          width={16}
          height={11}
          rx={2}
          fill="#374151"
          opacity={0.9}
        />
        <text
          textAnchor="middle"
          fontSize={6}
          fontWeight="bold"
          fill="#e2e8f0"
          dy={-1}
        >
          {motiveLabel(token.infantryMotiveType)}
        </text>
      </g>

      {/* Specialization icon — bottom-right corner (optional) */}
      {spec !== null && (
        <g
          transform={`translate(${INF_TOKEN_RADIUS - 2}, ${INF_TOKEN_RADIUS - 2})`}
        >
          <rect
            x={-8}
            y={-8}
            width={16}
            height={11}
            rx={2}
            fill="#7c3aed"
            opacity={0.9}
          />
          <text
            textAnchor="middle"
            fontSize={6}
            fontWeight="bold"
            fill="white"
            dy={-1}
            data-testid="infantry-spec"
          >
            {spec}
          </text>
        </g>
      )}

      {/* Designation label */}
      <TokenDesignationLabel y={INF_RING_RADIUS + 10} fontSize={7}>
        {token.designation}
      </TokenDesignationLabel>

      {/* Stack indicator badge "×N" when multiple platoons share the hex. */}
      {platoonCount > 1 && (
        <g
          transform={`translate(${INF_TOKEN_RADIUS + 2}, 0)`}
          data-testid="infantry-stack-indicator"
        >
          <rect
            x={-10}
            y={-8}
            width={20}
            height={14}
            rx={3}
            fill="#0f172a"
            opacity={0.85}
          />
          <text
            textAnchor="middle"
            fontSize={8}
            fontWeight="bold"
            fill="#fbbf24"
            dy={3}
          >
            {'\u00d7'}
            {platoonCount}
          </text>
        </g>
      )}

      {/* Destroyed cross overlay */}
      {isDestroyed && <DestroyedCrossOverlay xRadius={10} strokeWidth={2.5} />}
    </>
  );
});
