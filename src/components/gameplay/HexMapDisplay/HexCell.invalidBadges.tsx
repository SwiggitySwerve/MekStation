import React from 'react';

import type {
  ICombatRangeHex,
  IHexCoordinate,
  IMovementRangeHex,
} from '@/types/gameplay';
import type { ITacticalMapProjectionSourceReference } from '@/utils/gameplay/tacticalMapProjection';

import {
  HexCellSvgTextBadge,
  type MovementProjectionBadgeProps,
} from './HexCell.badgePrimitives';
import {
  tacticalProjectionDataAttributes,
  tacticalProjectionSourceMetadata,
  tacticalProjectionSourceReferencesFor,
} from './HexMapDisplay.tacticalProjectionAttributes';

type ReasonPatternBadgeLabelResolver = {
  readonly label: string;
  readonly patterns: readonly string[];
};

type MovementInvalidBadgeLabelResolver =
  | ReasonPatternBadgeLabelResolver
  | {
      readonly label: string;
      readonly requiresAltitudeControl: true;
    };

type MovementInvalidReason = NonNullable<
  IMovementRangeHex['movementInvalidReason']
>;

type AttackInvalidReason = NonNullable<ICombatRangeHex['attackInvalidReason']>;

const MOVEMENT_INVALID_BADGE_LABEL_RESOLVERS = [
  { label: 'WTR', patterns: ['water'] },
  { label: 'ALT', requiresAltitudeControl: true },
  { label: 'ALT', patterns: ['altitude controls'] },
  { label: 'BRDG', patterns: ['bridge', 'clearance'] },
  { label: 'ELEV', patterns: ['elevation'] },
  { label: 'OCC', patterns: ['occupied'] },
  { label: 'OOB', patterns: ['outside'] },
  { label: 'STAND', patterns: ['stand'] },
  { label: 'NO MP', patterns: ['path costs'] },
  { label: 'NO PATH', patterns: ['no legal'] },
  { label: 'SHUT', patterns: ['shut down'] },
  { label: 'KO', patterns: ['unconscious'] },
  { label: 'AERO', patterns: ['aerospace', 'flight'] },
] as const satisfies readonly MovementInvalidBadgeLabelResolver[];

const MOVEMENT_INVALID_REASON_LABELS: Readonly<
  Partial<Record<MovementInvalidReason, string>>
> = {
  DestinationOccupied: 'OCC',
  DestinationOutOfBounds: 'OOB',
  InsufficientMP: 'NO MP',
  UnitImmobile: 'NO MOVE',
  InvalidPath: 'BAD PATH',
  JumpUnavailable: 'NO JUMP',
  NoLegalPath: 'NO PATH',
  NoMovementCapability: 'NO MOVE',
  TerrainBlocked: 'TERR',
  InvalidDestination: 'BAD',
};

const NO_LINE_OF_SIGHT_BADGE_LABEL_RESOLVERS = [
  { label: 'TAG', patterns: ['tag', 'ecm'] },
  { label: 'ELEV', patterns: ['elevation'] },
  { label: 'BLDG', patterns: ['building'] },
  { label: 'WOOD', patterns: ['woods'] },
  { label: 'SMK', patterns: ['smoke'] },
] as const satisfies readonly ReasonPatternBadgeLabelResolver[];

const ATTACK_INVALID_REASON_LABELS: Readonly<
  Partial<Record<AttackInvalidReason, string>>
> = {
  NoLineOfSight: 'LOS',
  OutOfAmmo: 'AMMO',
  OutOfArc: 'ARC',
  OutOfRange: 'OUT',
  SameHex: 'SAME',
  TargetNotVisible: 'HIDDEN',
  InvalidTarget: 'INVALID',
};

function reasonMatchesAny(
  text: string | undefined,
  patterns: readonly string[],
): boolean {
  const normalizedText = text?.toLowerCase();
  return normalizedText
    ? patterns.some((pattern) => normalizedText.includes(pattern))
    : false;
}

function isReasonPatternResolver(
  resolver: MovementInvalidBadgeLabelResolver,
): resolver is ReasonPatternBadgeLabelResolver {
  return 'patterns' in resolver;
}

function movementBadgeResolverMatches(
  resolver: MovementInvalidBadgeLabelResolver,
  movementInfo: IMovementRangeHex,
  reason: string | undefined,
): boolean {
  if (isReasonPatternResolver(resolver)) {
    return reasonMatchesAny(reason, resolver.patterns);
  }

  return movementInfo.altitudeControlRequired === true;
}

function resolveReasonPatternBadgeLabel(
  reason: string | undefined,
  resolvers: readonly ReasonPatternBadgeLabelResolver[],
): string | undefined {
  return resolvers.find((resolver) =>
    reasonMatchesAny(reason, resolver.patterns),
  )?.label;
}

function resolveMovementInvalidBadgeLabel(
  movementInfo: IMovementRangeHex,
  reason: string | undefined,
): string | undefined {
  return MOVEMENT_INVALID_BADGE_LABEL_RESOLVERS.find((resolver) =>
    movementBadgeResolverMatches(resolver, movementInfo, reason),
  )?.label;
}

function movementReasonText(
  movementInfo: IMovementRangeHex,
): string | undefined {
  return (
    movementInfo.movementInvalidDetails ??
    movementInfo.blockedReason ??
    movementInfo.movementInvalidReason
  );
}

function combatReasonText(combatInfo: ICombatRangeHex): string | undefined {
  return (
    combatInfo.attackInvalidDetails ??
    combatInfo.indirectFireUnavailableReason ??
    combatInfo.lineOfSightBlockerReason ??
    combatInfo.visibilityBlockedReason ??
    combatInfo.blockedReason ??
    combatInfo.attackInvalidReason
  );
}

function movementSourceReferencesFor(
  sourceReferences:
    | readonly ITacticalMapProjectionSourceReference[]
    | undefined,
): readonly ITacticalMapProjectionSourceReference[] {
  return tacticalProjectionSourceReferencesFor(sourceReferences, 'movement');
}

function combatSourceReferencesFor(
  sourceReferences:
    | readonly ITacticalMapProjectionSourceReference[]
    | undefined,
): readonly ITacticalMapProjectionSourceReference[] {
  return tacticalProjectionSourceReferencesFor(sourceReferences, [
    'combat',
    'los-blocker',
  ]);
}

function formatMovementInvalidBadgeLabel(
  movementInfo: IMovementRangeHex,
): string {
  const reason = movementReasonText(movementInfo);

  return (
    resolveMovementInvalidBadgeLabel(movementInfo, reason) ??
    (movementInfo.movementInvalidReason
      ? MOVEMENT_INVALID_REASON_LABELS[movementInfo.movementInvalidReason]
      : undefined) ??
    (movementInfo.blockedReason ? 'BLK' : 'NO')
  );
}

function resolveNoLineOfSightBadgeLabel(
  combatInfo: ICombatRangeHex,
  blockerReason: string | undefined,
): string | undefined {
  if (combatInfo.attackInvalidReason !== 'NoLineOfSight') {
    return undefined;
  }

  return resolveReasonPatternBadgeLabel(
    blockerReason,
    NO_LINE_OF_SIGHT_BADGE_LABEL_RESOLVERS,
  );
}

function formatCombatInvalidBadgeLabel(combatInfo: ICombatRangeHex): string {
  const blockerReason = combatReasonText(combatInfo);

  return (
    resolveNoLineOfSightBadgeLabel(combatInfo, blockerReason) ??
    (combatInfo.attackInvalidReason
      ? ATTACK_INVALID_REASON_LABELS[combatInfo.attackInvalidReason]
      : undefined) ??
    (combatInfo.blockedReason ? 'BLOCK' : 'NO')
  );
}

function Badge({
  x,
  y,
  width,
  fill,
  text,
  testId,
  reason,
  reasonCode,
  reasonKind,
  projectionExplanation,
  sourceReferences,
}: {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly fill: string;
  readonly text: string;
  readonly testId: string;
  readonly reason?: string;
  readonly reasonCode?: string;
  readonly reasonKind: 'movement' | 'combat';
  readonly projectionExplanation?: string;
  readonly sourceReferences?: readonly ITacticalMapProjectionSourceReference[];
}): React.ReactElement {
  const label = reason ?? text;
  const source = tacticalProjectionSourceMetadata(sourceReferences, reasonKind);
  return (
    <HexCellSvgTextBadge
      testId={testId}
      title={label}
      label={text}
      dataAttributes={{
        ...tacticalProjectionDataAttributes(source),
        'data-invalid-badge-kind': reasonKind,
        'data-invalid-badge-reason': reason,
        'data-invalid-badge-code': reasonCode,
        'data-invalid-badge-source-refs': source.sourceRefs,
        'data-invalid-badge-rule-refs': source.ruleRefs,
        'data-invalid-badge-projection-explanation': projectionExplanation,
      }}
      rect={{
        x: x - width / 2,
        y,
        width,
        height: 12,
        rx: 3,
        fill,
        opacity: 0.92,
      }}
      text={{
        x,
        y: y + 9,
        fontSize: 8,
        fontWeight: 'bold',
        fill: '#fff7ed',
      }}
    />
  );
}

export function MovementInvalidBadge(
  props: MovementProjectionBadgeProps,
): React.ReactElement | null {
  const { x, y, hex, movementInfo, projectionExplanation, sourceReferences } =
    props;
  if (!movementInfo || movementInfo.reachable) return null;

  const label = formatMovementInvalidBadgeLabel(movementInfo);
  const reason = movementReasonText(movementInfo);
  return (
    <Badge
      x={x}
      y={y + 7}
      width={Math.max(30, label.length * 6 + 8)}
      fill="#7f1d1d"
      text={label}
      testId={`hex-movement-invalid-badge-${hex.q}-${hex.r}`}
      reason={reason}
      reasonCode={movementInfo.movementInvalidReason}
      reasonKind="movement"
      projectionExplanation={projectionExplanation}
      sourceReferences={movementSourceReferencesFor(sourceReferences)}
    />
  );
}

export function CombatInvalidBadge({
  x,
  y,
  hex,
  combatInfo,
  projectionExplanation,
  sourceReferences,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly combatInfo?: ICombatRangeHex;
  readonly projectionExplanation?: string;
  readonly sourceReferences?: readonly ITacticalMapProjectionSourceReference[];
}): React.ReactElement | null {
  if (!combatInfo?.attackInvalidReason) return null;

  const label = formatCombatInvalidBadgeLabel(combatInfo);
  const reason = combatReasonText(combatInfo);
  const combatSourceReferences = combatSourceReferencesFor(sourceReferences);
  return (
    <Badge
      x={x}
      y={y + 58}
      width={Math.max(30, label.length * 6 + 8)}
      fill="#7f1d1d"
      text={label}
      testId={`hex-combat-invalid-badge-${hex.q}-${hex.r}`}
      reason={reason}
      reasonCode={combatInfo.attackInvalidReason}
      reasonKind="combat"
      projectionExplanation={projectionExplanation}
      sourceReferences={combatSourceReferences}
    />
  );
}
