/**
 * ProtoMech Heat Model
 *
 * ProtoMechs have a simplified heat track:
 *   - 2 base heat sinks built into the engine (task 9.1).
 *   - Shutdown risk begins at heat ≥ 4 (lower than the mech threshold due to
 *     proto fragility — task 9.2).
 *   - Extra heat sinks are the only configurable additions.
 *
 * This module returns a policy descriptor the combat engine consults.
 *
 * @spec openspec/changes/add-protomech-combat-behavior/specs/protomech-unit-system/spec.md
 *   #requirement protomech-heat-rules
 * @spec openspec/changes/add-protomech-combat-behavior/tasks.md §9
 */

// =============================================================================
// Heat policy descriptor
// =============================================================================

/**
 * Heat policy for a proto combat pipeline.
 */
export interface IProtoHeatModel {
  /** Base heat-sink count built into the engine (always 2). */
  readonly baseHeatSinks: number;
  /** Caller-supplied extra heat sinks (mounted equipment). */
  readonly extraHeatSinks: number;
  /** Total dissipation per turn. */
  readonly totalHeatSinks: number;
  /** Heat level at which the proto begins making shutdown checks. */
  readonly shutdownThreshold: number;
  /** Human-readable rationale (same style as vehicleHeatModel). */
  readonly rationale: string;
}

export const PROTO_BASE_HEAT_SINKS = 2;
export const PROTO_SHUTDOWN_THRESHOLD = 4;

/**
 * Compute the heat model for a proto. `extraHeatSinks` defaults to 0 — the
 * caller passes any additional proto-mounted heat sinks.
 */
export function getProtoHeatModel(extraHeatSinks: number = 0): IProtoHeatModel {
  const safeExtra = Math.max(0, Math.floor(extraHeatSinks));
  return {
    baseHeatSinks: PROTO_BASE_HEAT_SINKS,
    extraHeatSinks: safeExtra,
    totalHeatSinks: PROTO_BASE_HEAT_SINKS + safeExtra,
    shutdownThreshold: PROTO_SHUTDOWN_THRESHOLD,
    rationale:
      'ProtoMech heat track — 2 engine-integrated sinks, shutdown at 4+.',
  };
}

// =============================================================================
// Shutdown check
// =============================================================================

/**
 * True if `heat` meets or exceeds the proto shutdown threshold. The caller
 * resolves the actual shutdown roll (same pattern as mech heat checks).
 */
export function protoHeatTriggersShutdownCheck(heat: number): boolean {
  return heat >= PROTO_SHUTDOWN_THRESHOLD;
}
