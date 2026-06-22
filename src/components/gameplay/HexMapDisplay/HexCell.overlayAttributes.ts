import type { IHexCoordinate } from '@/types/gameplay';
import type {
  TacticalMapCombatProjectionStatus,
  TacticalMapHexProjectionStatus,
  TacticalMapMovementCostProjectionStatus,
  TacticalMapMovementHazardProjectionStatus,
  TacticalMapMovementProjectionStatus,
} from '@/utils/gameplay/tacticalMapProjection';

import type { HexOverlayKind, HexOverlayState } from './HexCell.overlayModel';

export type SvgDataAttributes = Record<
  string,
  string | number | null | undefined
>;

export function formatHexOverlayLabel({
  hex,
  overlayKind,
  status,
  movementStatus,
  combatStatus,
  blockedReasons,
  explanation,
}: {
  readonly hex: IHexCoordinate;
  readonly overlayKind: HexOverlayKind;
  readonly status?: TacticalMapHexProjectionStatus;
  readonly movementStatus?: TacticalMapMovementProjectionStatus;
  readonly combatStatus?: TacticalMapCombatProjectionStatus;
  readonly blockedReasons?: readonly string[];
  readonly explanation?: string;
}): string {
  const parts = [
    `Hex ${hex.q},${hex.r} ${overlayKind} highlight`,
    status ? `projection ${status}` : '',
    movementStatus ? `movement ${movementStatus}` : '',
    combatStatus ? `combat ${combatStatus}` : '',
    blockedReasons && blockedReasons.length > 0
      ? `blocked ${blockedReasons.join('; ')}`
      : '',
    explanation ? `detail ${explanation}` : '',
  ];

  return parts.filter(Boolean).join('; ');
}

export function buildOverlayAttributes({
  overlayBlockedReasons,
  overlayLabel,
  overlayRuleReferences,
  overlaySourceReferences,
  tacticalProjectionCombatStatus,
  tacticalProjectionExplanation,
  tacticalProjectionMovementCostReasons,
  tacticalProjectionMovementCostStatus,
  tacticalProjectionMovementHazardReasons,
  tacticalProjectionMovementHazardStatus,
  tacticalProjectionMovementStatus,
  tacticalProjectionStatus,
  overlayState,
}: {
  readonly overlayBlockedReasons?: string;
  readonly overlayLabel?: string;
  readonly overlayRuleReferences?: string;
  readonly overlaySourceReferences?: string;
  readonly tacticalProjectionCombatStatus?: TacticalMapCombatProjectionStatus;
  readonly tacticalProjectionExplanation?: string;
  readonly tacticalProjectionMovementCostReasons?: readonly string[];
  readonly tacticalProjectionMovementCostStatus?: TacticalMapMovementCostProjectionStatus;
  readonly tacticalProjectionMovementHazardReasons?: readonly string[];
  readonly tacticalProjectionMovementHazardStatus?: TacticalMapMovementHazardProjectionStatus;
  readonly tacticalProjectionMovementStatus?: TacticalMapMovementProjectionStatus;
  readonly tacticalProjectionStatus?: TacticalMapHexProjectionStatus;
  readonly overlayState: HexOverlayState;
}): SvgDataAttributes {
  return {
    role: 'img',
    'aria-label': overlayLabel,
    'data-hex-overlay-kind': overlayState.kind ?? undefined,
    'data-movement-non-color-encoding': overlayState.movementNonColorEncoding,
    'data-hex-overlay-status': tacticalProjectionStatus,
    'data-hex-overlay-movement-status': tacticalProjectionMovementStatus,
    'data-hex-overlay-movement-cost-status':
      tacticalProjectionMovementCostStatus,
    'data-hex-overlay-movement-cost-reasons':
      tacticalProjectionMovementCostReasons &&
      tacticalProjectionMovementCostReasons.length > 0
        ? tacticalProjectionMovementCostReasons.join('|')
        : undefined,
    'data-hex-overlay-movement-hazard-status':
      tacticalProjectionMovementHazardStatus,
    'data-hex-overlay-movement-hazard-reasons':
      tacticalProjectionMovementHazardReasons &&
      tacticalProjectionMovementHazardReasons.length > 0
        ? tacticalProjectionMovementHazardReasons.join('|')
        : undefined,
    'data-hex-overlay-combat-status': tacticalProjectionCombatStatus,
    'data-hex-overlay-blocked-reasons': overlayBlockedReasons,
    'data-hex-overlay-sources': overlaySourceReferences,
    'data-hex-overlay-rule-refs': overlayRuleReferences,
    'data-hex-overlay-explanation': tacticalProjectionExplanation,
    'data-hex-overlay-legacy-fallback': overlayState.isLegacyAttackRangeFallback
      ? 'true'
      : undefined,
  };
}
