/**
 * Per-type stacking rules for the hex combat map.
 *
 * Total Warfare stacking limits per unit type:
 *   - BattleMechs: 1 per hex (no two mechs share a hex)
 *   - Vehicles: 1 per hex (same restriction as mechs)
 *   - Aerospace: 1 per hex when on the ground; altitude resolves separately
 *   - BattleArmor: may mount on a mech in the same hex (mountedOn path),
 *       or stand alone (1 per hex as independent token)
 *   - Infantry: up to 4 platoons per hex (stack indicator shows "×N")
 *   - ProtoMechs: 1 point (up to 5 protos) per hex; the cluster renders
 *       inside a single token
 *
 * @spec openspec/changes/add-per-type-hex-tokens/specs/tactical-map-interface/spec.md
 *        §Per-Type Stacking Rules
 */

import { TokenUnitType } from "@/types/gameplay";

// =============================================================================
// Stacking Rule Descriptor
// =============================================================================

/**
 * Describes how many units of a given type may occupy the same hex.
 */
export interface IStackingRules {
  /** Maximum number of independent tokens of this type per hex. */
  readonly maxPerHex: number;
  /**
   * Whether units of this type may be mounted on another unit (BA-on-mech).
   * When true, the token renders as a badge on the host, not as a standalone
   * token, and does NOT count against `maxPerHex`.
   */
  readonly canMount: boolean;
  /**
   * Type of unit this type may mount on. `null` when `canMount` is false.
   */
  readonly mountTargetType: TokenUnitType | null;
  /**
   * Human-readable description of the stacking limit.
   * Shown in placement-rejection error messages.
   */
  readonly description: string;
}

// =============================================================================
// Per-Type Stacking Table
// =============================================================================

const STACKING_RULES_BY_TYPE: Readonly<Record<TokenUnitType, IStackingRules>> =
  {
    [TokenUnitType.Mech]: {
      maxPerHex: 1,
      canMount: false,
      mountTargetType: null,
      description: "BattleMechs cannot share a hex with another BattleMech.",
    },
    [TokenUnitType.Vehicle]: {
      maxPerHex: 1,
      canMount: false,
      mountTargetType: null,
      description: "Vehicles cannot share a hex with another vehicle.",
    },
    [TokenUnitType.Aerospace]: {
      maxPerHex: 1,
      canMount: false,
      mountTargetType: null,
      description:
        "Aerospace units occupy one hex per altitude level; only one unit per hex on the ground.",
    },
    [TokenUnitType.BattleArmor]: {
      maxPerHex: 1,
      canMount: true,
      mountTargetType: TokenUnitType.Mech,
      description:
        "BattleArmor may share a hex by mounting on a BattleMech (renders as badge). " +
        "One independent BA point per hex when not mounted.",
    },
    [TokenUnitType.Infantry]: {
      maxPerHex: 4,
      canMount: false,
      mountTargetType: null,
      description: "Up to 4 infantry platoons may share a hex.",
    },
    [TokenUnitType.ProtoMech]: {
      maxPerHex: 1,
      canMount: false,
      mountTargetType: null,
      description:
        "One ProtoMech point (up to 5 protos) per hex. The cluster renders inside a single token.",
    },
  };

// =============================================================================
// Hex Content Summary
// =============================================================================

/**
 * Minimal description of the units already occupying a hex.
 * Passed to `getStackingResult` so it can evaluate the incoming unit without
 * needing access to the full game state.
 */
export interface IHexContents {
  /** IDs of units already in the hex, grouped by type. */
  readonly byType: Readonly<Partial<Record<TokenUnitType, readonly string[]>>>;
}

// =============================================================================
// Stacking Result
// =============================================================================

/** Outcome of a stacking check for an incoming unit. */
export type StackingResult =
  | { readonly allowed: true; readonly mountOn?: string }
  | { readonly allowed: false; readonly reason: string };

// =============================================================================
// Public API
// =============================================================================

/**
 * Return the canonical stacking rules for a given unit type.
 * Safe to call with `undefined` (falls back to Mech rules for legacy tokens).
 */
export function getStackingRules(
  unitType: TokenUnitType | undefined,
): IStackingRules {
  return STACKING_RULES_BY_TYPE[unitType ?? TokenUnitType.Mech];
}

/**
 * Determine whether `incomingType` may be placed on a hex whose current
 * contents are described by `hexContents`.
 *
 * Returns `{ allowed: true }` on success, or `{ allowed: false, reason }` on
 * failure so the UI can surface a clear rejection message.
 *
 * When BattleArmor is allowed AND a mech is present, `mountOn` is set to the
 * first mech ID found so the caller can set `IUnitToken.mountedOn`.
 *
 * @example
 *   const result = getStackingResult(TokenUnitType.Infantry, {
 *     byType: { infantry: ['inf-1', 'inf-2', 'inf-3'] },
 *   });
 *   // result.allowed === true (3 < 4)
 */
export function getStackingResult(
  incomingType: TokenUnitType | undefined,
  hexContents: IHexContents,
): StackingResult {
  const type = incomingType ?? TokenUnitType.Mech;
  const rules = STACKING_RULES_BY_TYPE[type];

  // BattleArmor gets the mount path checked first.
  if (rules.canMount && rules.mountTargetType !== null) {
    const hosts = hexContents.byType[rules.mountTargetType];
    if (hosts && hosts.length > 0) {
      // Mount on the first available host.
      return { allowed: true, mountOn: hosts[0] };
    }
  }

  // Count existing tokens of the same type.
  const existing = hexContents.byType[type];
  const count = existing ? existing.length : 0;

  if (count >= rules.maxPerHex) {
    return { allowed: false, reason: rules.description };
  }

  return { allowed: true };
}

/**
 * Return the stack-indicator label for a hex — e.g. "×3" when 3 infantry
 * platoons share the hex. Returns `null` when no aggregated badge is needed
 * (single-occupant hex or the hex is empty).
 *
 * Currently only infantry triggers a badge (maxPerHex > 1). Future unit types
 * that allow stacking will be handled automatically once added to
 * `STACKING_RULES_BY_TYPE`.
 */
export function getStackBadgeLabel(hexContents: IHexContents): string | null {
  for (const [rawType, ids] of Object.entries(hexContents.byType)) {
    const type = rawType as TokenUnitType;
    const rules = STACKING_RULES_BY_TYPE[type];
    if (rules && rules.maxPerHex > 1 && ids && ids.length > 1) {
      return `\u00d7${ids.length}`;
    }
  }
  return null;
}
