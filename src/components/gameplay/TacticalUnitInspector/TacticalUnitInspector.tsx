/**
 * TacticalUnitInspector — right-tray unit inspector for the Tactical Command Shell.
 *
 * Renders the correct projection tier for the inspected (or selected) unit:
 *
 *   - `friendly`  — full exact state (name, chassis, pilot, heat, weapons,
 *                   critical effects, movement).
 *   - `target`    — partial state for a visible opponent; numeric fields only
 *                   when `isExact` is true, band descriptors otherwise.
 *   - `redacted`  — generic "Unknown Contact" placeholder; ZERO exact values
 *                   in the rendered output (per the spec's "SHALL not be
 *                   recoverable from labels, tooltips, DOM text, ARIA text,
 *                   or test ids" requirement).
 *
 * The projection itself is derived by `useUnitInspectorProjection`; this
 * component only renders what the projection exposes.
 *
 * @spec openspec/changes/add-tactical-unit-inspector-drawers/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-unit-inspector-drawers/tasks.md §2.1
 */

import React from "react";

import type { GameSide } from "@/types/gameplay";
import type { IGameSession } from "@/types/gameplay";
import type { IWeaponStatus } from "@/types/gameplay";
import type { IInspectorProjection } from "@/types/gameplay/TacticalInspectorInterfaces";
import type {
  OpponentIntelTier,
  PlayerId,
} from "@/types/gameplay/TacticalShellInterfaces";

import {
  useUnitInspectorProjection,
  type IInspectorSupplementalData,
} from "@/hooks/gameplay/useUnitInspectorProjection";
import { useTacticalShell } from "@/components/gameplay/TacticalCommandShell";

// =============================================================================
// Props
// =============================================================================

export interface TacticalUnitInspectorProps {
  /**
   * The unit to inspect. When null the component renders an empty
   * "no unit selected" placeholder.
   *
   * Callers MUST bind this to `shellState.inspectedUnit ?? selectedUnitId`.
   * NEVER bind to `activeUnit` — Wave 7.0 Gate 4.
   */
  readonly inspectedUnitId: string | null;
  /** Current game session. */
  readonly session: IGameSession;
  /** Local viewer's player id (from TacticalCommandShell context). */
  readonly viewerPlayerId: PlayerId;
  /** The game side the viewer controls. */
  readonly viewerSide: GameSide;
  /**
   * Per-opponent intel tier map from `ITacticalShellState.opponentVisibilityScopes`.
   * An empty map means no per-opponent redaction policy has been set
   * (single-player default: every opponent defaults to 'rough').
   */
  readonly opponentVisibilityScopes: Readonly<
    Record<PlayerId, OpponentIntelTier>
  >;
  /** Optional supplemental display data (pilot names, weapons, armor max). */
  readonly supplemental?: IInspectorSupplementalData;
  /** Optional extra CSS classes for the root container. */
  readonly className?: string;
}

// =============================================================================
// Sub-views (one per projection kind)
// =============================================================================

/** Friendly unit — full exact state. */
function FriendlyView({
  projection,
}: {
  projection: Extract<IInspectorProjection, { kind: "friendly" }>;
}): React.ReactElement {
  const pilotStatusColor = !projection.pilotConscious
    ? "text-red-600"
    : projection.pilotWounds >= 3
      ? "text-amber-600"
      : "text-gray-700";

  // Wave 8 PR-K8 — G1: render a "Spotting for: {attackerId}" badge when
  // the inspected unit is currently an elected LOS spotter. Pulls from
  // the shell context's electedSpotters list (populated by event
  // subscription in TacticalCommandShell). Only shown for friendly
  // inspectors — opponent unit's spotting role for ITS team is hidden
  // from the player by the fog-of-war contract.
  const shellSpotters = (() => {
    try {
      return useTacticalShell().state.electedSpotters;
    } catch {
      return [];
    }
  })();
  const spotterEntry = shellSpotters.find(
    (s) => s.spotterId === projection.unitId,
  );

  return (
    <div className="flex flex-col gap-2 p-3" data-testid="inspector-friendly">
      {/* Header */}
      <div className="border-b border-blue-200 pb-2">
        <div
          className="text-sm font-semibold text-blue-900"
          data-testid="inspector-unit-name"
        >
          {projection.name}
        </div>
        <div className="text-xs text-gray-500" data-testid="inspector-chassis">
          {projection.chassis}
        </div>
        {spotterEntry && (
          <div
            className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
            data-testid="inspector-spotting-badge"
          >
            Spotting for: {spotterEntry.attackerId}
          </div>
        )}
      </div>

      {/* Pilot */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">Pilot</span>
        <span
          className={`font-medium ${pilotStatusColor}`}
          data-testid="inspector-pilot-name"
        >
          {projection.pilotName}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">Skills</span>
        <span className="text-gray-800" data-testid="inspector-pilot-skills">
          G{projection.gunnery} / P{projection.piloting}
        </span>
      </div>
      {projection.pilotWounds > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Pilot Wounds</span>
          <span
            className={pilotStatusColor}
            data-testid="inspector-pilot-wounds"
          >
            {projection.pilotConscious ? `${projection.pilotWounds}/5` : "KIA"}
          </span>
        </div>
      )}

      {/* Heat */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">Heat</span>
        <span
          className={
            projection.heat >= 20
              ? "font-semibold text-red-600"
              : projection.heat >= 10
                ? "font-medium text-amber-600"
                : "text-gray-800"
          }
          data-testid="inspector-heat"
        >
          {projection.heat}
        </span>
      </div>

      {/* Armor / Structure */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">Armor</span>
        <span className="text-gray-800" data-testid="inspector-armor">
          {projection.totalArmorRemaining}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">Structure</span>
        <span className="text-gray-800" data-testid="inspector-structure">
          {projection.totalStructureRemaining}
        </span>
      </div>

      {/* Status flags */}
      {(projection.prone ||
        projection.shutdown ||
        projection.destroyed ||
        projection.isWithdrawing) && (
        <div
          className="flex flex-wrap gap-1"
          data-testid="inspector-status-flags"
        >
          {projection.destroyed && (
            <span className="rounded bg-red-100 px-1 py-0.5 text-xs font-semibold text-red-700">
              DESTROYED
            </span>
          )}
          {projection.shutdown && (
            <span className="rounded bg-gray-200 px-1 py-0.5 text-xs font-semibold text-gray-700">
              SHUTDOWN
            </span>
          )}
          {projection.prone && (
            <span className="rounded bg-yellow-100 px-1 py-0.5 text-xs font-semibold text-yellow-700">
              PRONE
            </span>
          )}
          {projection.isWithdrawing && (
            <span className="rounded bg-orange-100 px-1 py-0.5 text-xs font-semibold text-orange-700">
              WITHDRAWING
            </span>
          )}
        </div>
      )}

      {/* Critical effects */}
      {projection.criticalEffects.length > 0 && (
        <div className="rounded bg-red-50 p-1.5">
          <div className="mb-1 text-xs font-medium text-red-700">
            Critical Damage
          </div>
          {projection.criticalEffects.map((effect, i) => (
            <div
              key={i}
              className="text-xs text-red-600"
              data-testid={`inspector-crit-${i}`}
            >
              {effect}
            </div>
          ))}
        </div>
      )}

      {/* Movement */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">Movement</span>
        <span className="text-gray-800" data-testid="inspector-movement">
          {projection.movementThisTurn} ({projection.hexesMoved} hex
          {projection.hexesMoved !== 1 ? "es" : ""})
        </span>
      </div>

      {/* Weapons */}
      {projection.weapons.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-medium text-gray-600">Weapons</div>
          {projection.weapons.map((w) => (
            <div
              key={w.weaponId}
              className={`flex items-center justify-between text-xs ${w.disabled ? "opacity-50" : ""}`}
              data-testid={`inspector-weapon-${w.weaponId}`}
            >
              <span className={w.disabled ? "line-through" : ""}>
                {w.displayName}
              </span>
              {w.disabledReason && (
                <span className="text-red-500">{w.disabledReason}</span>
              )}
              {w.hasAmmoWarning && !w.disabled && (
                <span className="text-amber-500">Low ammo</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Opponent unit at 'rough' or 'exact' intel tier — partial state. */
function TargetView({
  projection,
}: {
  projection: Extract<IInspectorProjection, { kind: "target" }>;
}): React.ReactElement {
  const bandLabel: Record<string, string> = {
    pristine: "Pristine",
    "lightly-damaged": "Lightly Damaged",
    "moderately-damaged": "Moderately Damaged",
    "heavily-damaged": "Heavily Damaged",
    crippled: "Crippled",
  };
  const bandColor: Record<string, string> = {
    pristine: "text-green-600",
    "lightly-damaged": "text-green-700",
    "moderately-damaged": "text-amber-600",
    "heavily-damaged": "text-orange-600",
    crippled: "text-red-600",
  };

  return (
    <div className="flex flex-col gap-2 p-3" data-testid="inspector-target">
      {/* Header */}
      <div className="border-b border-red-200 pb-2">
        <div
          className="text-sm font-semibold text-red-900"
          data-testid="inspector-unit-name"
        >
          {projection.name}
        </div>
        {projection.chassis !== null && (
          <div
            className="text-xs text-gray-500"
            data-testid="inspector-chassis"
          >
            {projection.chassis}
          </div>
        )}
        {!projection.isExact && (
          <div className="text-xs text-gray-400 italic">Rough intel</div>
        )}
      </div>

      {/* Damage band (always shown) */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">Damage</span>
        <span
          className={`font-medium ${bandColor[projection.damageBand] ?? "text-gray-800"}`}
          data-testid="inspector-damage-band"
        >
          {bandLabel[projection.damageBand] ?? projection.damageBand}
        </span>
      </div>

      {/* Exact-tier only fields */}
      {projection.isExact && (
        <>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Heat</span>
            <span
              className={
                (projection.heat ?? 0) >= 20
                  ? "font-semibold text-red-600"
                  : (projection.heat ?? 0) >= 10
                    ? "font-medium text-amber-600"
                    : "text-gray-800"
              }
              data-testid="inspector-heat"
            >
              {projection.heat}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Armor</span>
            <span className="text-gray-800" data-testid="inspector-armor">
              {projection.totalArmorRemaining}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Structure</span>
            <span className="text-gray-800" data-testid="inspector-structure">
              {projection.totalStructureRemaining}
            </span>
          </div>
        </>
      )}

      {/* Observable state — both tiers */}
      {(projection.prone || projection.destroyed || projection.shutdown) && (
        <div
          className="flex flex-wrap gap-1"
          data-testid="inspector-status-flags"
        >
          {projection.destroyed && (
            <span className="rounded bg-red-100 px-1 py-0.5 text-xs font-semibold text-red-700">
              DESTROYED
            </span>
          )}
          {projection.shutdown !== null && projection.shutdown && (
            <span className="rounded bg-gray-200 px-1 py-0.5 text-xs font-semibold text-gray-700">
              SHUTDOWN
            </span>
          )}
          {projection.prone && (
            <span className="rounded bg-yellow-100 px-1 py-0.5 text-xs font-semibold text-yellow-700">
              PRONE
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Opponent at 'hidden' or 'unknown' tier — completely opaque placeholder.
 *
 * Per spec: ZERO exact values anywhere in the rendered output. Not in DOM
 * text, not in ARIA attributes, not in data-testid values. This component
 * deliberately contains no numeric or identity-revealing content.
 */
function RedactedView(): React.ReactElement {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 p-6 text-center"
      data-testid="inspector-redacted"
      aria-label="Unknown contact — no intelligence available"
    >
      <div className="text-sm font-medium text-gray-500">Unknown Contact</div>
      <div className="text-xs text-gray-400">No intelligence available</div>
    </div>
  );
}

// =============================================================================
// Main component
// =============================================================================

/**
 * TacticalUnitInspector — right-tray inspector for the tactical shell.
 *
 * Derives the projection via `useUnitInspectorProjection` and delegates
 * rendering to the appropriate sub-view. When `inspectedUnitId` is null,
 * renders a neutral "Select a unit" placeholder.
 */
export function TacticalUnitInspector({
  inspectedUnitId,
  session,
  viewerPlayerId,
  viewerSide,
  opponentVisibilityScopes,
  supplemental,
  className = "",
}: TacticalUnitInspectorProps): React.ReactElement {
  const projection = useUnitInspectorProjection({
    unitId: inspectedUnitId,
    session,
    viewerPlayerId,
    viewerSide,
    opponentVisibilityScopes,
    supplemental,
  });

  if (!projection) {
    return (
      <div
        className={`flex items-center justify-center p-6 text-xs text-gray-400 ${className}`}
        data-testid="inspector-empty"
      >
        Select a unit to inspect
      </div>
    );
  }

  return (
    <div
      className={`h-full overflow-y-auto bg-white ${className}`}
      data-testid="tactical-unit-inspector"
    >
      {projection.kind === "friendly" && (
        <FriendlyView projection={projection} />
      )}
      {projection.kind === "target" && <TargetView projection={projection} />}
      {projection.kind === "redacted" && <RedactedView />}
    </div>
  );
}

export default TacticalUnitInspector;
