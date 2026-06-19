/**
 * TacticalTurnRail
 *
 * Horizontal top-band rail that displays the activation order for the
 * current phase. Replaces `PhaseBanner` in the `top-band` ShellSlot.
 *
 * Layout (desktop — horizontal rail):
 *   [Phase label | Round N]  [token…] [token…] [token…]  [blocker badge?]
 *
 * Unit token visual states (per spec "Tactical Turn Order Rail"):
 *   active    — pulsing ring, full opacity
 *   upcoming  — full opacity, neutral ring
 *   completed — reduced opacity, checkmark
 *   skipped   — italic, muted
 *   destroyed — strikethrough, dark bg
 *   withdrawn — italic, muted, arrow icon
 *
 * Wave 7.0 Gate 4 invariant (MUST NOT be violated):
 *   Rail clicks call `onUnitSelect` → `setSelectedUnit` ONLY.
 *   `setActiveUnit` is owned exclusively by the game engine.
 *
 * @spec openspec/changes/add-tactical-turn-order-and-phase-rail/specs/tactical-map-interface/spec.md
 *   "Tactical Turn Order Rail" ADDED requirement
 *   "Phase Progression Controls" ADDED requirement
 */

import React, { useMemo } from 'react';

import { getPhaseRailLabel } from '@/components/gameplay/EventLogDisplay.helpers';
import {
  GamePhase,
  GameSide,
  LockState,
} from '@/types/gameplay/GameSessionCoreTypes';

import type {
  IRailUnit,
  TacticalTurnRailProps,
  UnitRailStatus,
} from './TacticalTurnRail.types';

function getPhaseBgClass(phase: GamePhase): string {
  switch (phase) {
    case GamePhase.Initiative:
      return 'bg-blue-700';
    case GamePhase.Movement:
      return 'bg-green-700';
    case GamePhase.WeaponAttack:
      return 'bg-red-700';
    case GamePhase.PhysicalAttack:
      return 'bg-orange-700';
    case GamePhase.Heat:
      return 'bg-yellow-700';
    case GamePhase.End:
      return 'bg-gray-700';
    default:
      return 'bg-gray-700';
  }
}

// ---------------------------------------------------------------------------
// Unit status derivation
// ---------------------------------------------------------------------------

function deriveUnitStatus(
  unitId: string,
  activeUnitId: string | null,
  unitStates: TacticalTurnRailProps['unitStates'],
): UnitRailStatus {
  const state = unitStates[unitId];
  if (!state) return 'upcoming';

  if (state.destroyed) return 'destroyed';
  if (state.hasRetreated || state.isWithdrawing) return 'withdrawn';
  if (state.shutdown || state.prone) return 'skipped';
  if (state.lockState === LockState.Resolved) return 'completed';
  if (unitId === activeUnitId) return 'active';
  return 'upcoming';
}

// ---------------------------------------------------------------------------
// Token styling
// ---------------------------------------------------------------------------

const STATUS_TOKEN_CLASSES: Record<UnitRailStatus, string> = {
  active: 'ring-2 ring-white animate-pulse bg-white/20 font-bold text-white',
  upcoming: 'ring-1 ring-white/40 bg-white/10 text-white/90',
  completed: 'ring-1 ring-white/20 bg-black/30 text-white/50 line-through',
  skipped: 'ring-1 ring-white/20 bg-black/20 text-white/40 italic',
  destroyed:
    'ring-1 ring-red-900/60 bg-red-950/60 text-red-300/60 line-through',
  withdrawn: 'ring-1 ring-gray-500/40 bg-gray-800/40 text-gray-400/60 italic',
};

const SIDE_BADGE_CLASSES: Record<GameSide, string> = {
  [GameSide.Player]: 'bg-blue-500',
  [GameSide.Opponent]: 'bg-red-500',
};

const STATUS_ICON: Partial<Record<UnitRailStatus, string>> = {
  completed: '✓',
  destroyed: '✕',
  withdrawn: '→',
  skipped: '~',
};

// ---------------------------------------------------------------------------
// RailToken sub-component
// ---------------------------------------------------------------------------

interface RailTokenProps {
  readonly unit: IRailUnit;
  readonly isSelected: boolean;
  readonly onClick: (unitId: string) => void;
  readonly shellMode: TacticalTurnRailProps['shellMode'];
}

function RailToken({
  unit,
  isSelected,
  onClick,
  shellMode,
}: RailTokenProps): React.ReactElement {
  const tokenClass = STATUS_TOKEN_CLASSES[unit.status];
  const sideBadge = SIDE_BADGE_CLASSES[unit.side] ?? 'bg-gray-500';
  const icon = STATUS_ICON[unit.status];

  // In replay / spectator mode we still allow selection for inspection
  // but active-unit pulsing is suppressed (the cursor drives focus instead).
  const isInteractive = unit.status !== 'destroyed';
  const showActivePulse = unit.status === 'active' && shellMode === 'combat';

  const selectedRing = isSelected
    ? 'outline outline-2 outline-yellow-400 outline-offset-1'
    : '';

  return (
    <button
      type="button"
      disabled={!isInteractive}
      onClick={() => isInteractive && onClick(unit.id)}
      className={[
        'flex min-w-[6rem] max-w-[9rem] flex-col items-start gap-0.5 rounded px-2 py-1 text-left text-xs transition-opacity',
        tokenClass,
        selectedRing,
        showActivePulse ? 'animate-pulse' : '',
        isInteractive
          ? 'cursor-pointer hover:brightness-110'
          : 'cursor-default',
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={`rail-unit-${unit.id}`}
      data-status={unit.status}
      data-side={unit.side}
      aria-label={`${unit.name} — ${unit.status}${unit.isActive ? ' (active)' : ''}`}
      aria-current={unit.isActive ? 'true' : undefined}
      aria-pressed={isSelected ? 'true' : 'false'}
    >
      <div className="flex w-full items-center justify-between gap-1">
        {/* Side indicator dot */}
        <span
          className={`h-2 w-2 flex-shrink-0 rounded-full ${sideBadge}`}
          aria-hidden="true"
        />
        {icon && (
          <span className="ml-auto text-[10px] opacity-70" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <span className="w-full truncate leading-tight font-medium">
        {unit.name}
      </span>
      <span className="truncate font-mono text-[10px] leading-tight opacity-60">
        {unit.unitRef}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Blocker badge
// ---------------------------------------------------------------------------

interface BlockerBadgeProps {
  readonly count: number;
  readonly phase: GamePhase;
}

function BlockerBadge({
  count,
  phase,
}: BlockerBadgeProps): React.ReactElement | null {
  if (count === 0) return null;

  const phaseLabel = getPhaseRailLabel(phase).toLowerCase();

  return (
    <div
      className="flex flex-shrink-0 items-center gap-1 rounded bg-amber-600/80 px-2 py-1 text-xs text-white"
      data-testid="rail-blocker-badge"
      aria-label={`${count} unit${count === 1 ? '' : 's'} awaiting ${phaseLabel}`}
      role="status"
    >
      <span className="font-bold">{count}</span>
      <span className="opacity-80">pending</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * TacticalTurnRail — replaces PhaseBanner in the `top-band` ShellSlot.
 *
 * Shows phase/round header, per-unit activation tokens, and blocker badge.
 * The drawer toggle (mobile record-sheet) is preserved from PhaseBanner.
 */
export function TacticalTurnRail({
  projection,
  gameUnits,
  unitStates,
  shellMode,
  turn,
  phase,
  selectedUnitId,
  onUnitSelect,
  drawer,
  className = '',
}: TacticalTurnRailProps): React.ReactElement {
  const phaseBg = getPhaseBgClass(phase);
  const phaseLabel = getPhaseRailLabel(phase);

  // Build enriched rail units from the projection's initiativeOrder.
  const railUnits: IRailUnit[] = useMemo(() => {
    const unitMap = new Map(gameUnits.map((u) => [u.id, u]));
    return projection.initiativeOrder.map((unitId) => {
      const gameUnit = unitMap.get(unitId);
      const status = deriveUnitStatus(
        unitId,
        projection.activeUnitId,
        unitStates,
      );
      return {
        id: unitId,
        name: gameUnit?.name ?? unitId,
        unitRef: gameUnit?.unitRef ?? '',
        side: gameUnit?.side ?? GameSide.Player,
        status,
        isActive: unitId === projection.activeUnitId,
      };
    });
  }, [
    projection.initiativeOrder,
    projection.activeUnitId,
    gameUnits,
    unitStates,
  ]);

  // Replay mode: show a label indicating read-only historical state.
  const isReplayMode = shellMode === 'replay';
  const isSpectatorMode = shellMode === 'spectator';

  return (
    <div
      className={`${phaseBg} flex min-h-[3rem] items-center gap-3 px-3 py-1.5 text-white ${className}`}
      data-testid="tactical-turn-rail"
      role="region"
      aria-label={`Turn ${turn} — ${phaseLabel} phase activation rail`}
    >
      {/* Phase / Round header */}
      <div className="flex flex-shrink-0 flex-col items-start leading-tight">
        {/* `phase-name` testid preserved from PhaseBanner — addInteractiveCombatCoreUI
            smoke test asserts on this label, and other downstream tests + the
            screen-reader contract know this id. */}
        <span
          className="text-sm font-bold tracking-wide uppercase"
          data-testid="phase-name"
        >
          {phaseLabel}
        </span>
        <span className="text-xs opacity-75" data-testid="turn-number">
          Round {turn}
        </span>
      </div>

      {/* Divider */}
      <div className="h-8 w-px flex-shrink-0 bg-white/20" aria-hidden="true" />

      {/* Mode badge (replay / spectator) */}
      {isReplayMode && (
        <span
          className="flex-shrink-0 rounded bg-black/30 px-2 py-0.5 text-xs font-semibold tracking-wide uppercase"
          data-testid="rail-mode-badge-replay"
          aria-label="Replay mode — read only"
        >
          Replay
        </span>
      )}
      {isSpectatorMode && (
        <span
          className="flex-shrink-0 rounded bg-black/30 px-2 py-0.5 text-xs font-semibold tracking-wide uppercase"
          data-testid="rail-mode-badge-spectator"
          aria-label="Spectator mode"
        >
          Spectator
        </span>
      )}

      {/* Activation token strip — horizontally scrollable */}
      <div
        className="flex flex-1 gap-1.5 overflow-x-auto pb-0.5"
        data-testid="rail-token-strip"
        role="list"
        aria-label="Unit activation order"
      >
        {railUnits.length === 0 && (
          <span className="self-center text-xs opacity-50" aria-live="polite">
            No units
          </span>
        )}
        {railUnits.map((unit) => (
          <div key={unit.id} role="listitem">
            <RailToken
              unit={unit}
              isSelected={unit.id === selectedUnitId}
              onClick={onUnitSelect}
              shellMode={shellMode}
            />
          </div>
        ))}
      </div>

      {/* Blocker badge — only shown in combat / gm mode */}
      {(shellMode === 'combat' || shellMode === 'gm') && (
        <BlockerBadge count={projection.blockers.length} phase={phase} />
      )}

      {/* Mobile drawer toggle (preserved from PhaseBanner) */}
      {drawer && (
        <button
          type="button"
          onClick={drawer.onToggleDrawer}
          className="ml-1 flex-shrink-0 rounded bg-black/25 px-3 py-1 text-xs font-semibold tracking-wide uppercase hover:bg-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white lg:hidden"
          data-testid="record-sheet-drawer-toggle"
          aria-expanded={drawer.isDrawerOpen}
          aria-controls="record-sheet-drawer"
        >
          {drawer.isDrawerOpen ? 'Close Sheet' : 'Record Sheet'}
        </button>
      )}
    </div>
  );
}

export default TacticalTurnRail;
