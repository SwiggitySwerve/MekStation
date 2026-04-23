/**
 * Record Sheet Display Component
 * Shows unit status in traditional record sheet format.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 * @spec openspec/changes/add-interactive-combat-core-ui/specs/tactical-map-interface/spec.md
 */

import React, { useMemo } from 'react';

import type {
  IDamageAppliedPayload,
  IGameEvent,
  IPilotHitPayload,
} from '@/types/gameplay';

import {
  GameEventType,
  GameSide,
  IPilotSpaSummary,
  IUnitGameState,
  IWeaponStatus,
} from '@/types/gameplay';

import { LOCATION_ORDER, REAR_ARMOR_LOCATIONS } from './recordSheet.helpers';
import {
  LocationStatusRow,
  WeaponRow,
  SimpleHeatDisplay,
  PilotStatus,
} from './RecordSheetPanels';

// =============================================================================
// Types
// =============================================================================

export interface RecordSheetDisplayProps {
  /** Unit name */
  unitName: string;
  /** Unit designation (e.g., "ATL-7K") */
  designation: string;
  /** Current unit state */
  state: IUnitGameState;
  /** Maximum armor values per location */
  maxArmor: Record<string, number>;
  /** Maximum structure values per location */
  maxStructure: Record<string, number>;
  /** Weapons on this unit */
  weapons: readonly IWeaponStatus[];
  /** Pilot name */
  pilotName: string;
  /** Gunnery skill */
  gunnery: number;
  /** Piloting skill */
  piloting: number;
  /** Heat sink count */
  heatSinks: number;
  /** Selected weapon IDs (for attack UI) */
  selectedWeaponIds?: readonly string[];
  /** Callback when weapon selection changes */
  onWeaponToggle?: (weaponId: string) => void;
  /**
   * Per `add-interactive-combat-core-ui` § 4.2: the side controlling
   * this unit, rendered as a colored badge in the header (blue =
   * Player, red = Opponent). Matches the hex-map token palette.
   */
  side?: GameSide;
  /**
   * Per `add-interactive-combat-core-ui` § 4.2: unit tonnage shown in
   * the header. Optional because not all upstream unit records carry
   * a `tonnage` field yet — when absent the header omits the weight
   * line rather than rendering a misleading zero.
   */
  tonnage?: number;
  /**
   * Per `add-interactive-combat-core-ui` § 4.2: unit chassis string
   * ("Atlas", "Hunchback", …). Optional for the same reason as
   * `tonnage` — when absent the header falls back to `unitName`.
   */
  chassis?: string;
  /**
   * Per `add-interactive-combat-core-ui` § 8: Special Pilot Abilities
   * for this unit. Empty array → "No SPAs" placeholder; `undefined`
   * → same as empty so callers that don't project SPAs see the same
   * placeholder (conservative default).
   */
  spas?: readonly IPilotSpaSummary[];
  /**
   * Per `add-damage-feedback-ui` task 1.1: the selected unit's id, used
   * to project `events` down to just the events that should animate
   * on this action panel. When omitted, subscriptions are no-ops
   * (legacy callers that render a static record sheet stay working).
   */
  unitId?: string;
  /**
   * Per `add-damage-feedback-ui` task 1.1 + 1.3: the full game event
   * stream. The record sheet projects it down to `DamageApplied` /
   * `CriticalHit` / `PilotHit` events for this `unitId` and feeds
   * them to the appropriate child components (pilot wound track,
   * future armor-pip animation). The subscription is a pure
   * `useMemo` over props, so it automatically tears down when the
   * selected unit changes (task 1.3).
   */
  events?: readonly IGameEvent[];
  /** Optional className for styling */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Record sheet display showing full unit status.
 */
export function RecordSheetDisplay({
  unitName,
  designation,
  state,
  maxArmor,
  maxStructure,
  weapons,
  pilotName,
  gunnery,
  piloting,
  heatSinks,
  selectedWeaponIds = [],
  onWeaponToggle,
  side,
  tonnage,
  chassis,
  spas,
  unitId,
  events,
  className = '',
}: RecordSheetDisplayProps): React.ReactElement {
  // Per task 1.1 + 5.1: project the event stream down to the pieces
  // this unit's action panel cares about. `useMemo` subscription
  // automatically tears down (recomputes) when `unitId` changes per
  // task 1.3 — no manual unsubscribe needed because derivation is
  // pure.
  const unitEvents = useMemo(() => {
    if (!unitId || !events || events.length === 0) {
      return {
        pilotHitCount: 0,
        damageHitsByLocation: {} as Record<string, number>,
      };
    }
    let pilotHitCount = 0;
    const damageHitsByLocation: Record<string, number> = {};
    for (const ev of events) {
      if (ev.type === GameEventType.PilotHit) {
        const payload = ev.payload as IPilotHitPayload;
        if (payload.unitId === unitId) pilotHitCount += 1;
      } else if (ev.type === GameEventType.DamageApplied) {
        const payload = ev.payload as IDamageAppliedPayload;
        if (payload.unitId !== unitId) continue;
        damageHitsByLocation[payload.location] =
          (damageHitsByLocation[payload.location] ?? 0) + 1;
      }
    }
    return { pilotHitCount, damageHitsByLocation };
  }, [unitId, events]);

  // Build location statuses
  const locationStatuses = useMemo(() => {
    return LOCATION_ORDER.map((location) => {
      const hasRear = REAR_ARMOR_LOCATIONS.includes(location);
      return {
        location,
        armor: state.armor[location] ?? 0,
        maxArmor: maxArmor[location] ?? 0,
        structure: state.structure[location] ?? 0,
        maxStructure: maxStructure[location] ?? 0,
        destroyed: state.destroyedLocations.includes(location),
        rearArmor: hasRear ? (state.armor[`${location}_rear`] ?? 0) : undefined,
        maxRearArmor: hasRear ? (maxArmor[`${location}_rear`] ?? 0) : undefined,
      };
    });
  }, [state, maxArmor, maxStructure]);

  return (
    <div
      className={`bg-surface-base overflow-y-auto p-4 ${className}`}
      data-testid="record-sheet"
    >
      {/* Header — per § 4.2 shows designation, chassis, tonnage, side
          badge. Side badge uses the same blue/red palette as the hex
          map tokens so the selected-unit → token visual link is
          preserved. */}
      <div className="border-border-theme mb-4 border-b pb-2">
        <div className="flex items-center gap-3">
          <h2
            className="text-text-theme-primary text-lg font-bold"
            data-testid="record-sheet-unit-name"
          >
            {unitName}
          </h2>
          {side && (
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                side === GameSide.Player
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-red-100 text-red-700'
              }`}
              data-testid="record-sheet-side-badge"
              data-side={side === GameSide.Player ? 'player' : 'opponent'}
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${
                  side === GameSide.Player ? 'bg-blue-500' : 'bg-red-500'
                }`}
              />
              {side === GameSide.Player ? 'Player' : 'Opponent'}
            </span>
          )}
          {state.destroyed && (
            <span
              className="ml-auto font-bold text-red-600"
              data-testid="record-sheet-destroyed"
            >
              DESTROYED
            </span>
          )}
        </div>
        <div className="text-text-theme-secondary mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span data-testid="record-sheet-designation">{designation}</span>
          {chassis && <span data-testid="record-sheet-chassis">{chassis}</span>}
          {tonnage !== undefined && (
            <span data-testid="record-sheet-tonnage">{tonnage} tons</span>
          )}
        </div>
      </div>

      {/* Pilot Status */}
      <div className="mb-4">
        <h3 className="text-text-theme-primary mb-2 text-sm font-bold">
          PILOT
        </h3>
        <PilotStatus
          name={pilotName}
          gunnery={gunnery}
          piloting={piloting}
          pilotHitCount={unitEvents.pilotHitCount}
          wounds={state.pilotWounds}
          conscious={state.pilotConscious}
        />
      </div>

      {/* Heat */}
      <div className="mb-4">
        <h3 className="text-text-theme-primary mb-2 text-sm font-bold">
          HEAT ({heatSinks} sinks)
        </h3>
        <SimpleHeatDisplay heat={state.heat} heatSinks={heatSinks} />
      </div>

      {/* Armor/Structure — per task 2.4: each row receives a
          per-location `damageHitCount` sourced from the projected
          DamageApplied events. Incrementing the count drives the
          sequential armor → structure flash animation. */}
      <div className="mb-4" data-testid="armor-structure-section">
        <h3 className="text-text-theme-primary mb-2 text-sm font-bold">
          ARMOR / STRUCTURE
        </h3>
        <div className="border-border-theme divide-y rounded border">
          {locationStatuses.map((loc) => (
            <LocationStatusRow
              key={loc.location}
              {...loc}
              damageHitCount={
                unitEvents.damageHitsByLocation[loc.location] ?? 0
              }
            />
          ))}
        </div>
      </div>

      {/* Weapons */}
      <div className="mb-4" data-testid="weapons-section">
        <h3 className="text-text-theme-primary mb-2 text-sm font-bold">
          WEAPONS
        </h3>
        <div className="border-border-theme divide-y rounded border">
          <div className="bg-surface-raised text-text-theme-secondary hidden items-center px-2 py-1 text-xs md:flex">
            {onWeaponToggle && <span className="w-6" />}
            <span className="flex-1">Weapon</span>
            <span className="w-16">Loc</span>
            <span className="w-8 text-center">Heat</span>
            <span className="w-8 text-center">Dmg</span>
            <span className="w-20">S/M/L</span>
            <span className="w-20 text-right">Ammo</span>
          </div>
          {weapons.map((weapon) => (
            <WeaponRow
              key={weapon.id}
              weapon={weapon}
              isSelected={selectedWeaponIds.includes(weapon.id)}
              onToggle={
                onWeaponToggle ? () => onWeaponToggle(weapon.id) : undefined
              }
            />
          ))}
        </div>
      </div>

      {/* SPAs — per § 8: list each Special Pilot Ability with a
          description tooltip; empty list shows the "No SPAs"
          placeholder so the panel never renders an orphan header. */}
      <div className="mb-4" data-testid="spa-section">
        <h3 className="text-text-theme-primary mb-2 text-sm font-bold">
          SPECIAL PILOT ABILITIES
        </h3>
        {spas && spas.length > 0 ? (
          <ul
            className="border-border-theme divide-y rounded border"
            data-testid="spa-list"
          >
            {spas.map((spa) => (
              <li
                key={spa.id}
                className="bg-surface-raised px-3 py-2 text-sm"
                data-testid={`spa-row-${spa.id}`}
                title={spa.description}
              >
                <span
                  className="text-text-theme-primary font-medium"
                  data-testid={`spa-label-${spa.id}`}
                >
                  {spa.displayLabel}
                </span>
                <span
                  className="text-text-theme-secondary ml-2 text-xs"
                  data-testid={`spa-description-${spa.id}`}
                >
                  {spa.description}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p
            className="text-text-theme-secondary text-sm italic"
            data-testid="spa-empty"
          >
            No SPAs
          </p>
        )}
      </div>

      {/* Movement info */}
      <div
        className="text-text-theme-secondary text-sm"
        data-testid="movement-info"
      >
        <span>Movement this turn: </span>
        <strong data-testid="movement-type">{state.movementThisTurn}</strong>
        {state.hexesMovedThisTurn > 0 && (
          <span data-testid="hexes-moved">
            {' '}
            ({state.hexesMovedThisTurn} hexes)
          </span>
        )}
      </div>
    </div>
  );
}

export default RecordSheetDisplay;
