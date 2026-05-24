/**
 * useCommandPreview — derives the active command's preview payload
 * for the map overlay / inspector consumers.
 *
 * Per the spec's `Command Preview Lifecycle` requirement, irreversible
 * commands MUST preview their outcome before commit. This hook is the
 * single hand-off point — given a selected command + the live shell
 * context, it returns the typed `ICommandPreview` payload (movement
 * path / attack envelope / physical attack consequences) that the
 * existing overlay surfaces consume.
 *
 * Scope clarification (Wave 7.2 PR-D):
 *
 *   - Movement preview is the WIRED case today. The host (GameplayLayout)
 *     already forwards `highlightPath`, `hoverMpCost`, `hoverUnreachable`,
 *     and `mpLegend` to HexMapDisplay. This hook produces an
 *     `IMovementCommandPreview` that mirrors those values so dock-side
 *     callers can render a heat / MP / facing summary alongside the
 *     overlay.
 *
 *   - Weapon attack preview is PARTIAL today. The to-hit number is
 *     plumbed through `hitChance` and the attack plan ID through the
 *     gameplay store. When the caller supplies the shared combat hex
 *     projection, the preview also mirrors the map's range band, to-hit
 *     number, heat cost, ammo usage, and expected damage envelope.
 *
 *   - Physical attack preview mirrors the shared physical eligibility
 *     projection, including to-hit, damage, self-risk, PSR triggers, and
 *     typed restriction reasons for blocked rows.
 *
 * Preview state is SCOPED — when the active command changes the
 * prior preview clears; when the command commits the preview clears.
 * That scoping lives at the call site (the dock + map host) since
 * this hook is a pure projection, not a stateful store.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-action-menu-system/tasks.md §3.1, §3.2
 */

import { useMemo } from 'react';

import type {
  ICombatRangeHex,
  ICombatWeaponImpact,
  ICommandPreview,
  IHexCoordinate,
  IMovementRangeHex,
  IMovementCommandPreview,
  IPhysicalAttackCommandPreview,
  ITacticalCommand,
  ITacticalCommandContext,
  IWeaponStatus,
  IWeaponAttackCommandPreview,
} from '@/types/gameplay';
import type {
  IPhysicalAttackOption,
  PhysicalAttackLimb,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks/types';

import { RangeBracket } from '@/types/gameplay';

import { REASON_COPY } from '../PhysicalAttackPanel.helpers';

/**
 * Auxiliary inputs the preview hook needs that don't live on
 * `ITacticalCommandContext` — these are projections of the existing
 * map / gameplay state already plumbed through GameplayLayout.
 */
export interface ICommandPreviewInputs {
  /** Live movement path from useMapInteraction (start..end inclusive). */
  readonly highlightPath?: readonly IHexCoordinate[];
  /** MP cost of the previewed destination (from useMapInteraction). */
  readonly hoverMpCost?: number;
  /** True if the previewed destination is over the unit's MP envelope. */
  readonly hoverUnreachable?: boolean;
  /** Shared rules-backed movement projection for the hovered destination. */
  readonly movementInfo?: IMovementRangeHex;
  /** Player-facing blocked reason when no full movement projection is present. */
  readonly movementBlockedReason?: string;
  /** Active movement mode (walk / run / jump). */
  readonly movementMode?: 'walk' | 'run' | 'jump';
  /** Final facing the previewed movement ends on (0..5). */
  readonly previewFacing?: number;
  /** To-hit number for the current weapon attack (2..12 or null). */
  readonly hitChance?: number | null;
  /** Range band for the current weapon attack. */
  readonly weaponRangeBand?: 'short' | 'medium' | 'long' | 'extreme' | 'out';
  /** Shared rules-backed combat projection for the hovered/target hex. */
  readonly combatInfo?: ICombatRangeHex;
  /** Target-id keyed shared combat projections for command availability. */
  readonly combatInfoByTargetId?: Readonly<Record<string, ICombatRangeHex>>;
  /** Selected unit weapon statuses retained for call-site compatibility. */
  readonly weaponStatuses?: readonly IWeaponStatus[];
  /** Target unit selected in the physical-attack planning projection. */
  readonly physicalTargetUnitId?: string | null;
  /** Active physical attack type from the physical-attack plan. */
  readonly physicalAttackType?: PhysicalAttackType | null;
  /** Selected physical attack limb, when the projection row is limb-specific. */
  readonly physicalAttackLimb?: PhysicalAttackLimb | null;
  /** Shared rules-backed physical-attack option projection. */
  readonly physicalAttackOption?: IPhysicalAttackOption;
}

/**
 * Pure preview projection — same input -> same output, no store
 * reads, no engine mutation. Tests call this directly without React.
 */
export function buildCommandPreview(
  command: ITacticalCommand | null,
  ctx: ITacticalCommandContext,
  inputs: ICommandPreviewInputs,
): ICommandPreview | null {
  if (!command) return null;

  // If the command supplies its own preview() builder use it first —
  // adapter authors can return a more accurate preview when the
  // engine state is reachable in context.
  if (command.preview) {
    const builderResult = command.preview(ctx);
    if (builderResult) return builderResult;
  }

  switch (command.category) {
    case 'movement':
      return buildMovementPreview(inputs);
    case 'weapon':
      return buildWeaponPreview(ctx, inputs);
    case 'physical':
      return buildPhysicalPreview(ctx, inputs);
    default:
      // facing / heat-end / utility / gm have no map preview.
      return null;
  }
}

function buildMovementPreview(
  inputs: ICommandPreviewInputs,
): IMovementCommandPreview | null {
  const movementInfo = inputs.movementInfo;
  const path = movementInfo
    ? movementInfo.path && movementInfo.path.length > 0
      ? movementInfo.path
      : [movementInfo.hex]
    : (inputs.highlightPath ?? []);
  if (path.length === 0) return null;
  const blockedReason =
    movementInfo?.movementInvalidDetails ??
    movementInfo?.blockedReason ??
    movementInfo?.movementInvalidReason ??
    inputs.movementBlockedReason;

  return {
    kind: 'movement',
    path,
    mpCost: movementInfo?.mpCost ?? inputs.hoverMpCost ?? 0,
    finalFacing: inputs.previewFacing ?? 0,
    mode: toPreviewMovementMode(
      movementInfo?.movementType,
      inputs.movementMode,
    ),
    movementMode: movementInfo?.movementMode,
    terrainCost: movementInfo?.terrainCost,
    elevationDelta: movementInfo?.elevationDelta,
    elevationCost: movementInfo?.elevationCost,
    heatGenerated: movementInfo?.heatGenerated,
    blockedReason,
    unreachable:
      movementInfo !== undefined
        ? !movementInfo.reachable
        : Boolean(inputs.hoverUnreachable),
  };
}

function toPreviewMovementMode(
  movementType?: IMovementRangeHex['movementType'],
  fallback?: IMovementCommandPreview['mode'],
): IMovementCommandPreview['mode'] {
  if (movementType === 'run') return 'run';
  if (movementType === 'jump') return 'jump';
  return fallback ?? 'walk';
}

function buildWeaponPreview(
  ctx: ITacticalCommandContext,
  inputs: ICommandPreviewInputs,
): IWeaponAttackCommandPreview | null {
  const targetUnitId =
    ctx.targetUnitId ??
    inputs.combatInfo?.validTargetUnitIds[0] ??
    inputs.combatInfo?.visibleTargetUnitIds[0] ??
    null;
  if (!targetUnitId) return null;

  const toHit = inputs.combatInfo?.toHitNumber ?? inputs.hitChance ?? null;
  const attackable = inputs.combatInfo?.attackable ?? true;
  const blockedReason = inputs.combatInfo
    ? combatBlockedReason(inputs.combatInfo)
    : undefined;
  const availableWeaponImpacts =
    attackable && inputs.combatInfo
      ? inputs.combatInfo.availableWeaponImpacts
      : [];

  return {
    kind: 'weapon-attack',
    targetUnitId,
    attackable,
    toHit,
    rangeBand: toPreviewRangeBand(
      inputs.combatInfo?.rangeBracket,
      inputs.weaponRangeBand,
    ),
    attackInvalidReason: inputs.combatInfo?.attackInvalidReason,
    attackInvalidDetails: inputs.combatInfo?.attackInvalidDetails,
    blockedReason,
    heatCost:
      availableWeaponImpacts.length > 0 && inputs.combatInfo
        ? inputs.combatInfo.availableWeaponHeat
        : 0,
    weaponIds: availableWeaponImpacts.map((impact) => impact.weaponId),
    weaponNames: availableWeaponImpacts.map((impact) => impact.weaponName),
    ammoUsage: ammoUsageForImpacts(availableWeaponImpacts),
    expectedDamage:
      attackable && inputs.combatInfo
        ? (inputs.combatInfo.expectedDamage ?? 0)
        : 0,
  };
}

function combatBlockedReason(combatInfo: ICombatRangeHex): string | undefined {
  if (combatInfo.attackable) return undefined;
  return (
    combatInfo.attackInvalidDetails ??
    combatInfo.blockedReason ??
    combatInfo.lineOfSightBlockerReason ??
    combatInfo.visibilityBlockedReason ??
    combatInfo.attackInvalidReason
  );
}

function toPreviewRangeBand(
  rangeBracket: ICombatRangeHex['rangeBracket'] | undefined,
  fallback: IWeaponAttackCommandPreview['rangeBand'] | undefined,
): IWeaponAttackCommandPreview['rangeBand'] {
  switch (rangeBracket) {
    case RangeBracket.Short:
      return 'short';
    case RangeBracket.Medium:
      return 'medium';
    case RangeBracket.Long:
      return 'long';
    case RangeBracket.Extreme:
      return 'extreme';
    case RangeBracket.OutOfRange:
      return 'out';
    default:
      return fallback ?? 'medium';
  }
}

function ammoUsageForImpacts(
  impacts: readonly ICombatWeaponImpact[],
): Readonly<Record<string, number>> {
  return impacts.reduce<Record<string, number>>((usage, impact) => {
    if (impact.ammoConsumed <= 0) return usage;
    usage[impact.weaponName] =
      (usage[impact.weaponName] ?? 0) + impact.ammoConsumed;
    return usage;
  }, {});
}

function buildPhysicalPreview(
  ctx: ITacticalCommandContext,
  inputs: ICommandPreviewInputs,
): IPhysicalAttackCommandPreview | null {
  const targetUnitId = ctx.targetUnitId ?? inputs.physicalTargetUnitId ?? null;
  const attackType =
    inputs.physicalAttackOption?.attackType ??
    inputs.physicalAttackType ??
    null;
  if (!targetUnitId) return null;
  if (!attackType) return null;
  const option = inputs.physicalAttackOption;
  const attackable = option
    ? option.toHit.allowed && option.restrictionsFailed.length === 0
    : true;
  const restrictionReasonCodes = option?.restrictionsFailed;
  const blockedReasons = restrictionReasonCodes?.map(
    (reason) => REASON_COPY[reason],
  );
  const toHit =
    option && Number.isFinite(option.toHit.finalToHit)
      ? option.toHit.finalToHit
      : null;

  return {
    kind: 'physical-attack',
    targetUnitId,
    attackType,
    limb: option?.limb ?? inputs.physicalAttackLimb,
    attackable,
    toHit,
    damage: option?.damage.targetDamage ?? 0,
    selfDamage:
      option?.selfRisk.damageToAttacker ?? option?.damage.attackerDamage ?? 0,
    requiresPSR: Boolean(
      option?.selfRisk.pilotingSkillRoll?.required ||
      option?.damage.targetPSR ||
      option?.damage.attackerPSR,
    ),
    attackerLegDamagePerLeg: option?.selfRisk.legDamagePerLeg,
    onMiss: option?.selfRisk.onMiss,
    restrictionReasonCodes,
    blockedReasons,
  };
}

/**
 * React hook wrapper. Memoised on the command id + context fields +
 * the relevant inputs so the preview only recomputes when something
 * meaningful changes. The dock host clears the active command (passes
 * null) when the user cancels — that flips the result to null and
 * the overlay subscribers unmount their preview chrome.
 */
export function useCommandPreview(
  command: ITacticalCommand | null,
  ctx: ITacticalCommandContext,
  inputs: ICommandPreviewInputs,
): ICommandPreview | null {
  // ctx + inputs are intentionally exploded so callers can pass
  // fresh objects each render. See useCommandRegistry for the same
  // pattern.
  /* eslint-disable react-hooks/exhaustive-deps */
  const memoised = useMemo(
    () => buildCommandPreview(command, ctx, inputs),
    [
      command,
      ctx.activeUnitId,
      ctx.selectedUnitId,
      ctx.targetUnitId,
      ctx.hoveredHex?.q,
      ctx.hoveredHex?.r,
      ctx.phase,
      ctx.canAct,
      inputs.highlightPath,
      inputs.hoverMpCost,
      inputs.hoverUnreachable,
      inputs.movementInfo,
      inputs.movementBlockedReason,
      inputs.movementMode,
      inputs.previewFacing,
      inputs.hitChance,
      inputs.weaponRangeBand,
      inputs.combatInfo,
      inputs.physicalTargetUnitId,
      inputs.physicalAttackType,
      inputs.physicalAttackLimb,
      inputs.physicalAttackOption,
    ],
  );
  /* eslint-enable react-hooks/exhaustive-deps */
  return memoised;
}
