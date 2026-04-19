import React from "react";

import {
  MAX_HEAT,
  HEAT_THRESHOLDS,
  getHeatColorClass,
  getActiveHeatEffects,
} from "@/constants/heat";
import { IWeaponStatus } from "@/types/gameplay";

/**
 * Per `add-interactive-combat-core-ui` § 6.2: the heat bar labels the
 * four canonical to-hit threshold breakpoints (8 = +1, 13 = +2, 17 =
 * +3, 24 = +4) as inline tick marks so the player can see "how close
 * am I to the next penalty" at a glance. Values are pulled from
 * `HEAT_THRESHOLDS` so they stay in sync with the combat engine's
 * canonical table rather than drifting into a local literal.
 */
export const HEAT_TICK_THRESHOLDS: ReadonlyArray<{
  readonly value: number;
  readonly label: string;
  readonly modifier: string;
}> = [
  { value: HEAT_THRESHOLDS.TO_HIT_1, label: "8", modifier: "+1" },
  { value: HEAT_THRESHOLDS.TO_HIT_2, label: "13", modifier: "+2" },
  { value: HEAT_THRESHOLDS.TO_HIT_3, label: "17", modifier: "+3" },
  { value: HEAT_THRESHOLDS.TO_HIT_4, label: "24", modifier: "+4" },
];

import { LOCATION_NAMES, getStatusColor } from "./recordSheet.helpers";

// =============================================================================
// Armor Pip Rail — compact read-only visualization
// =============================================================================

/**
 * Per `add-interactive-combat-core-ui` § 5.1: compact pip rail that
 * renders per-location armor and internal structure as individual
 * dots, so the player can read damage at a glance ("3 of 8 armor
 * pips filled") without parsing numbers. Reuses the same palette
 * language as the full `ArmorPip` button component — green = filled,
 * gray = empty, red = destroyed — but at a dense 8×8px size suitable
 * for inline rendering inside `LocationStatusRow`. Non-interactive
 * by design; the interactive ArmorPip button lives in the damage-
 * feedback record sheet, which is a different surface.
 *
 * Rail caps the rendered pip count at 30 (≈ largest possible mech
 * location armor in canonical TW rules) to protect the layout. If a
 * location is destroyed every pip renders as red with an X overlay.
 */
const ARMOR_PIP_RAIL_CAP = 30;

interface PipRailProps {
  readonly label: string;
  readonly current: number;
  readonly max: number;
  readonly destroyed: boolean;
  readonly kind: "armor" | "structure";
  readonly testId: string;
}

export function ArmorPipRail({
  label,
  current,
  max,
  destroyed,
  kind,
  testId,
}: PipRailProps): React.ReactElement | null {
  if (max === 0) return null;
  const shown = Math.min(max, ARMOR_PIP_RAIL_CAP);
  const overflow = max > ARMOR_PIP_RAIL_CAP;
  const pips: React.ReactElement[] = [];
  // Structure pips use a square, armor pips use a circle so the two
  // rails stay visually distinguishable even at the compact size.
  const shapeClass = kind === "armor" ? "rounded-full" : "rounded-sm";

  for (let i = 0; i < shown; i++) {
    const filled = i < current;
    const destroyedPip = destroyed;
    let bg = "bg-gray-300";
    if (destroyedPip) {
      bg = "bg-red-500";
    } else if (filled) {
      bg = kind === "armor" ? "bg-green-500" : "bg-amber-500";
    }
    pips.push(
      <span
        key={i}
        aria-hidden="true"
        data-testid={`${testId}-pip-${i}`}
        data-filled={filled && !destroyedPip}
        data-destroyed={destroyedPip}
        className={`inline-block h-2 w-2 ${shapeClass} ${bg}`}
      />,
    );
  }

  return (
    <div
      className="flex items-center gap-1"
      data-testid={testId}
      aria-label={`${label}: ${current} of ${max}${destroyed ? " (location destroyed)" : ""}`}
    >
      <span className="text-text-theme-secondary w-6 text-[10px] uppercase tracking-wide">
        {label}
      </span>
      <span className="flex flex-wrap items-center gap-[2px]">{pips}</span>
      {overflow && (
        <span className="text-text-theme-secondary text-[10px]">…</span>
      )}
    </div>
  );
}

// =============================================================================
// Location Status Row
// =============================================================================

interface LocationStatusRowProps {
  location: string;
  armor: number;
  maxArmor: number;
  structure: number;
  maxStructure: number;
  destroyed: boolean;
  rearArmor?: number;
  maxRearArmor?: number;
}

export function LocationStatusRow({
  location,
  armor,
  maxArmor,
  structure,
  maxStructure,
  destroyed,
  rearArmor,
  maxRearArmor,
}: LocationStatusRowProps): React.ReactElement {
  const displayName = LOCATION_NAMES[location] || location;
  const armorColor = getStatusColor(armor, maxArmor);
  const structureColor = getStatusColor(structure, maxStructure);
  const rearArmorColor =
    rearArmor !== undefined && maxRearArmor !== undefined
      ? getStatusColor(rearArmor, maxRearArmor)
      : "";

  return (
    <div
      className={`px-3 py-2 md:px-2 md:py-1 ${destroyed ? "line-through opacity-50" : ""}`}
      data-testid={`location-row-${location}`}
    >
      <div className="md:flex md:items-center">
        <div className="mb-1 flex items-center justify-between md:mb-0 md:w-28">
          <span className="text-text-theme-primary text-base font-medium md:text-sm">
            {displayName}
          </span>
          {destroyed && (
            <span
              className="text-xs font-bold text-red-600 md:hidden"
              data-testid={`location-destroyed-${location}-mobile`}
            >
              DESTROYED
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 md:flex md:flex-1 md:items-center md:gap-4">
          <div className="flex items-center gap-1">
            <span className="text-text-theme-secondary text-sm md:w-6 md:text-xs">
              AR:
            </span>
            <span
              className={`font-mono text-base md:w-8 md:text-right md:text-sm ${armorColor}`}
              data-testid={`location-armor-${location}`}
            >
              {armor}/{maxArmor}
            </span>
          </div>
          {rearArmor !== undefined && maxRearArmor !== undefined ? (
            <div className="flex items-center gap-1">
              <span className="text-text-theme-secondary text-sm md:w-6 md:text-xs">
                RR:
              </span>
              <span
                className={`font-mono text-base md:w-8 md:text-right md:text-sm ${rearArmorColor}`}
                data-testid={`location-armor-${location}_rear`}
              >
                {rearArmor}/{maxRearArmor}
              </span>
            </div>
          ) : (
            <div className="md:hidden" />
          )}
          <div className="flex items-center gap-1">
            <span className="text-text-theme-secondary text-sm md:w-6 md:text-xs">
              IS:
            </span>
            <span
              className={`font-mono text-base md:w-8 md:text-right md:text-sm ${structureColor}`}
              data-testid={`location-structure-${location}`}
            >
              {structure}/{maxStructure}
            </span>
          </div>
        </div>

        {destroyed && (
          <span
            className="ml-2 hidden text-xs font-bold text-red-600 md:inline"
            data-testid={`location-destroyed-${location}`}
          >
            DESTROYED
          </span>
        )}
      </div>

      {/*
        Per § 5.1 the panel renders armor pips for every location so
        players can see remaining protection at a glance without
        parsing numbers. The numeric row above is preserved because
        many players (and existing tests) key on it directly.
      */}
      <div
        className="mt-1 flex flex-col gap-0.5"
        data-testid={`location-pips-${location}`}
      >
        <ArmorPipRail
          label="AR"
          current={armor}
          max={maxArmor}
          destroyed={destroyed}
          kind="armor"
          testId={`armor-pips-${location}`}
        />
        {rearArmor !== undefined && maxRearArmor !== undefined && (
          <ArmorPipRail
            label="RR"
            current={rearArmor}
            max={maxRearArmor}
            destroyed={destroyed}
            kind="armor"
            testId={`armor-pips-${location}_rear`}
          />
        )}
        <ArmorPipRail
          label="IS"
          current={structure}
          max={maxStructure}
          destroyed={destroyed}
          kind="structure"
          testId={`structure-pips-${location}`}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Weapon Row
// =============================================================================

interface WeaponRowProps {
  weapon: IWeaponStatus;
  isSelected: boolean;
  onToggle?: () => void;
}

/**
 * Per `add-interactive-combat-core-ui` § 7.2: compact inline ammo
 * renderer reused by both mobile and desktop layouts. When
 * `ammoMax` is known the renderer shows `N/M rds` and tints the
 * number red once ammo drops to 25% or below; when only
 * `ammoRemaining` is available it falls back to the legacy "N rds"
 * shape so callers that haven't adopted `ammoMax` keep working.
 */
function InlineAmmoCounter({
  weapon,
  testIdSuffix,
}: {
  weapon: IWeaponStatus;
  testIdSuffix: string;
}): React.ReactElement | null {
  if (weapon.ammoRemaining === undefined) return null;
  const max = weapon.ammoMax;
  const low =
    max !== undefined && max > 0 && weapon.ammoRemaining / max <= 0.25;
  const empty = weapon.ammoRemaining === 0;
  const color = empty
    ? "text-red-600"
    : low
      ? "text-amber-600"
      : "text-text-theme-secondary";
  return (
    <span
      className={`${color} text-xs`}
      data-testid={`weapon-ammo-${weapon.id}${testIdSuffix}`}
      data-ammo-low={low || empty}
    >
      {weapon.ammoRemaining}
      {max !== undefined ? `/${max}` : ""} rds
    </span>
  );
}

/**
 * Per `add-interactive-combat-core-ui` § 7.3: DESTROYED and JAMMED
 * badges rendered inline next to the weapon name. They are
 * rendered as pill-shaped spans so they read correctly at small
 * text sizes AND carry stable data-testids the smoke tests key
 * against. Both can appear at once (e.g. a destroyed weapon whose
 * last state before destruction was jammed) — the layout is
 * flex-gap driven so it handles 0/1/2 badges the same way.
 */
function WeaponStatusBadges({
  weapon,
}: {
  weapon: IWeaponStatus;
}): React.ReactElement | null {
  if (!weapon.destroyed && !weapon.jammed) return null;
  return (
    <span className="flex items-center gap-1">
      {weapon.destroyed && (
        <span
          className="rounded bg-red-600/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600"
          data-testid={`weapon-destroyed-${weapon.id}`}
        >
          Destroyed
        </span>
      )}
      {weapon.jammed && !weapon.destroyed && (
        <span
          className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600"
          data-testid={`weapon-jammed-${weapon.id}`}
        >
          Jammed
        </span>
      )}
    </span>
  );
}

export function WeaponRow({
  weapon,
  isSelected,
  onToggle,
}: WeaponRowProps): React.ReactElement {
  // Per `add-interactive-combat-core-ui` § 7.3: jammed weapons are
  // disabled for the turn just like destroyed ones, but they stay
  // visible (strike-through is reserved for destroyed rows so the
  // two states stay visually distinguishable in the list).
  const isAvailable = !weapon.destroyed && !weapon.jammed;
  const rowClasses = weapon.destroyed
    ? "opacity-50 line-through"
    : weapon.jammed
      ? "opacity-70"
      : weapon.firedThisTurn
        ? "bg-yellow-50"
        : "";

  return (
    <div
      className={`hover:bg-surface-deep px-3 py-3 md:flex md:items-center md:px-2 md:py-1 ${rowClasses}`}
      onClick={isAvailable && onToggle ? onToggle : undefined}
      style={{ cursor: isAvailable && onToggle ? "pointer" : "default" }}
      data-testid={`weapon-row-${weapon.id}`}
      data-destroyed={weapon.destroyed}
      data-jammed={weapon.jammed ?? false}
    >
      <div className="md:hidden">
        <div className="mb-2 flex items-center gap-3">
          {onToggle && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggle}
              disabled={!isAvailable}
              className="h-5 min-h-[44px] w-5 min-w-[44px] touch-manipulation"
              data-testid={`weapon-checkbox-${weapon.id}-mobile`}
            />
          )}
          <span
            className="flex-1 text-base font-medium"
            data-testid={`weapon-name-${weapon.id}`}
          >
            {weapon.name}
          </span>
          <WeaponStatusBadges weapon={weapon} />
          <span className="text-text-theme-secondary text-sm">
            {weapon.location}
          </span>
        </div>
        <div className="text-text-theme-secondary flex items-center gap-4 pl-8 text-sm">
          <span data-testid={`weapon-heat-${weapon.id}-mobile`}>
            {weapon.heat}H
          </span>
          <span data-testid={`weapon-damage-${weapon.id}-mobile`}>
            {weapon.damage}D
          </span>
          <span>
            S/M/L: {weapon.ranges.short}/{weapon.ranges.medium}/
            {weapon.ranges.long}
          </span>
          <InlineAmmoCounter weapon={weapon} testIdSuffix="-mobile" />
        </div>
      </div>

      <div className="hidden md:contents">
        {onToggle && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            disabled={!isAvailable}
            className="mr-2"
            data-testid={`weapon-checkbox-${weapon.id}`}
          />
        )}
        <span
          className="flex-1 text-sm"
          data-testid={`weapon-name-${weapon.id}-desktop`}
        >
          {weapon.name}
        </span>
        <WeaponStatusBadges weapon={weapon} />
        <span className="text-text-theme-secondary w-16 text-xs">
          {weapon.location}
        </span>
        <span
          className="text-text-theme-secondary w-8 text-center text-xs"
          data-testid={`weapon-heat-${weapon.id}`}
        >
          {weapon.heat}H
        </span>
        <span
          className="text-text-theme-secondary w-8 text-center text-xs"
          data-testid={`weapon-damage-${weapon.id}`}
        >
          {weapon.damage}D
        </span>
        <span className="text-text-theme-secondary w-20 text-xs">
          {weapon.ranges.short}/{weapon.ranges.medium}/{weapon.ranges.long}
        </span>
        <span className="w-20 text-right">
          <InlineAmmoCounter weapon={weapon} testIdSuffix="" />
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Simple Heat Display
// =============================================================================

export function SimpleHeatDisplay({
  heat,
  heatSinks,
}: {
  heat: number;
  heatSinks: number;
}): React.ReactElement {
  const heatPercent = Math.min((heat / MAX_HEAT) * 100, 100);
  const effects = getActiveHeatEffects(heat);

  return (
    <div className="bg-surface-raised rounded p-2" data-testid="heat-display">
      <div className="mb-2 flex items-center gap-4">
        <div className="flex-1">
          {/*
            Relative wrapper so the § 6.2 threshold tick marks can be
            absolute-positioned on top of the bar without disturbing
            the existing fill layout. Tick marks render as thin
            vertical lines at 8/13/17/24 with a label strip below so
            they are legible at the default 16px bar height.
          */}
          <div className="relative">
            <div
              className="bg-surface-deep relative h-4 overflow-hidden rounded"
              data-testid="heat-bar-track"
            >
              <div
                className={`h-full ${getHeatColorClass(heat)} transition-all`}
                style={{ width: `${heatPercent}%` }}
                data-testid="heat-bar"
              />
              {HEAT_TICK_THRESHOLDS.map((tick) => {
                const left = Math.min((tick.value / MAX_HEAT) * 100, 100);
                return (
                  <span
                    key={tick.value}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 w-px bg-gray-600/70"
                    style={{ left: `${left}%` }}
                    data-testid={`heat-tick-${tick.value}`}
                  />
                );
              })}
            </div>
            {/*
              Threshold label strip — each tick's numeric breakpoint
              and to-hit modifier is rendered inline so the player can
              read the scale without hovering. Absolute-positioned so
              the strip never disturbs the main flex layout.
            */}
            <div
              className="text-text-theme-secondary pointer-events-none relative h-4 text-[9px] leading-none"
              data-testid="heat-threshold-labels"
            >
              {HEAT_TICK_THRESHOLDS.map((tick) => {
                const left = Math.min((tick.value / MAX_HEAT) * 100, 100);
                return (
                  <span
                    key={tick.value}
                    className="absolute -translate-x-1/2 whitespace-nowrap font-mono"
                    style={{ left: `${left}%`, top: 2 }}
                    data-testid={`heat-tick-label-${tick.value}`}
                    data-threshold={tick.value}
                  >
                    <span className="font-semibold">{tick.label}</span>
                    <span className="ml-0.5 opacity-70">{tick.modifier}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        <div className="font-mono text-sm">
          <span className="font-bold" data-testid="heat-value">
            {heat}
          </span>
          <span className="text-text-theme-secondary">/{MAX_HEAT}</span>
        </div>
      </div>
      {effects.length > 0 && (
        <div className="text-xs text-red-600" data-testid="heat-effects">
          {effects.join(" • ")}
        </div>
      )}
      <div
        className="text-text-theme-secondary mt-1 text-xs"
        data-testid="heat-dissipation"
      >
        Dissipation: {heatSinks} heat/turn
      </div>
    </div>
  );
}

// =============================================================================
// Pilot Status
// =============================================================================

export function PilotStatus({
  name,
  gunnery,
  piloting,
  wounds,
  conscious,
}: {
  name: string;
  gunnery: number;
  piloting: number;
  wounds: number;
  conscious: boolean;
}): React.ReactElement {
  const woundIndicators = [];
  for (let i = 0; i < 6; i++) {
    woundIndicators.push(
      <span
        key={i}
        className={`h-4 w-4 rounded-full border ${
          i < wounds
            ? "border-red-600 bg-red-500"
            : "bg-surface-raised border-border-theme"
        }`}
        data-testid={`pilot-wound-${i}`}
        data-filled={i < wounds}
      />,
    );
  }

  return (
    <div className="bg-surface-raised rounded p-2" data-testid="pilot-status">
      {/*
        Per `add-interactive-combat-core-ui` § 9.3: an unconscious
        pilot gets a full-width red banner at the top of the pilot
        panel so the player sees the state immediately even when
        the small inline "UNCONSCIOUS" label is clipped. The
        original inline label is preserved for tests and accessibility.
      */}
      {!conscious && (
        <div
          className="mb-2 flex items-center gap-2 rounded border border-red-700 bg-red-600 px-2 py-1 text-xs font-bold uppercase tracking-wide text-white"
          data-testid="pilot-unconscious-banner"
          role="alert"
        >
          <span aria-hidden="true">⚠</span>
          <span>Pilot unconscious — cannot act this turn</span>
        </div>
      )}
      <div className="mb-2 flex items-center justify-between">
        <span
          className="text-text-theme-primary font-medium"
          data-testid="pilot-name"
        >
          {name}
        </span>
        {!conscious && (
          <span
            className="text-xs font-bold text-red-600"
            data-testid="pilot-unconscious"
          >
            UNCONSCIOUS
          </span>
        )}
      </div>
      <div className="text-text-theme-primary flex items-center gap-4 text-sm">
        <span data-testid="pilot-gunnery">
          Gunnery: <strong>{gunnery}</strong>
        </span>
        <span data-testid="pilot-piloting">
          Piloting: <strong>{piloting}</strong>
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1" data-testid="pilot-wounds">
        <span className="text-text-theme-secondary mr-2 text-xs">Wounds:</span>
        {woundIndicators}
      </div>
    </div>
  );
}
