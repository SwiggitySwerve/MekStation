/**
 * Unified `unitStateToToken` projection adapter.
 *
 * Per `wire-combat-behavior-dispatch` (Council #1 PR7), this is the single
 * shared call-site that converts `IUnitGameState` into `IUnitToken` for
 * tactical-map and spectator-view rendering. It narrows on
 * `IUnitGameState.combatState.kind` and projects per-type fields
 * (`altitude`, `infantryCount`, `trooperCount`, `protoCount`, `isGlider`,
 * `hasMainGun`) into the token. The fog-of-war redaction branch lives here
 * as a single early-return so per-type fields never leak through `lastKnown`
 * projections to a hidden enemy.
 *
 * Replaces the two divergent inline copies that used to live in
 * `GameplayLayout.tsx` (line 181) and `SpectatorViewPanels.tsx` (line 19).
 *
 * @spec openspec/changes/wire-combat-behavior-dispatch/specs/tactical-map-interface/spec.md
 * @spec openspec/changes/wire-combat-behavior-dispatch/specs/fog-of-war/spec.md
 */

import type { GameSide, IUnitGameState, IUnitToken } from '@/types/gameplay';

import { TokenUnitType } from '@/types/gameplay';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import { getSurvivingTroopers as baSurvivingTroopers } from '@/utils/gameplay/battlearmor/state';

/**
 * Subset of `IUnitToken` fog-projection fields that callers may layer onto a
 * token. These survive redaction (they ARE the redaction signal) — only the
 * per-type combat fields are stripped when `isHidden` is true.
 */
export type IFogProjection = Partial<
  Pick<IUnitToken, 'fogStatus' | 'lastKnownPosition' | 'sensorRange'>
>;

/**
 * Per-call selection / targeting flags derived from the caller's interaction
 * state. All optional so simple consumers (spectator view) can pass `{}`.
 */
export interface IUnitStateToTokenFlags {
  readonly isSelected?: boolean;
  readonly isValidTarget?: boolean;
  readonly isActiveTarget?: boolean;
}

/**
 * Convert an `IUnitGameState` into the `IUnitToken` consumed by the tactical
 * map's per-type token components.
 *
 * @param unitId    Stable unit id (used as token identity).
 * @param state     The current per-unit state (carries `combatState` envelope).
 * @param unitInfo  Display name + side, sourced from the session's `IGameUnit`.
 * @param flags     Selection / target highlight flags. Defaults to all-false.
 * @param fog       Fog-projection layer (`fogStatus`, `lastKnownPosition`,
 *                  `sensorRange`). Defaults to `{}`.
 * @param isHidden  When `true`, the fog branch redacts `combatState`-derived
 *                  per-type fields. Per-type renderers receive `undefined`
 *                  for `altitude`, `infantryCount`, `trooperCount`,
 *                  `protoCount`, `isGlider`, `hasMainGun`. Required so a
 *                  hidden enemy never leaks structure / trooper counts
 *                  through `lastKnown` snapshots.
 */
export function unitStateToToken(
  unitId: string,
  state: IUnitGameState,
  unitInfo: { readonly name: string; readonly side: GameSide },
  flags: IUnitStateToTokenFlags = {},
  fog: IFogProjection = {},
  isHidden = false,
): IUnitToken {
  // Generate a short designation from the unit name (first letters of each
  // word, uppercased, max 4 chars) — matches the prior inline copies so token
  // captions stay visually identical.
  const designation = unitInfo.name
    .split(/[\s-]+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);

  const base: IUnitToken = {
    unitId,
    name: unitInfo.name,
    side: unitInfo.side,
    position: state.position,
    facing: state.facing,
    isSelected: flags.isSelected ?? false,
    isValidTarget: flags.isValidTarget ?? false,
    isActiveTarget: flags.isActiveTarget ?? false,
    isDestroyed: state.destroyed,
    designation,
    ...fog,
  };

  // Fog redaction: hidden enemies expose ONLY the fog-projection fields
  // (lastKnown position / sensor ring). Per-type combat-derived fields are
  // never populated, so trooper counts / altitude / chassis flags can't leak.
  if (isHidden) {
    return base;
  }

  const cs = state.combatState;
  if (cs === undefined) {
    // Mech / vehicle path — no per-type envelope, no per-type fields.
    return base;
  }

  switch (cs.kind) {
    case 'aero':
      return {
        ...base,
        unitType: TokenUnitType.Aerospace,
        altitude: cs.state.altitude,
        // velocity intentionally omitted: TODO movement slice 2.
      };
    case 'platoon':
      return {
        ...base,
        unitType: TokenUnitType.Infantry,
        infantryCount: cs.state.survivingTroopers,
        platoonCount: 1,
      };
    case 'squad':
      return {
        ...base,
        unitType: TokenUnitType.BattleArmor,
        trooperCount: baSurvivingTroopers(cs.state),
      };
    case 'proto':
      return {
        ...base,
        unitType: TokenUnitType.ProtoMech,
        // Single proto per IUnitGameState; the "point" abstraction (1-5
        // protos sharing a hex stack) is layered higher up. Surviving-proto
        // count is derived from the destroyed flag — destroyed === 0 alive.
        protoCount: cs.state.destroyed ? 0 : 1,
        isGlider: cs.state.chassisType === ProtoChassis.GLIDER,
        hasMainGun: cs.state.hasMainGun,
      };
  }
}
