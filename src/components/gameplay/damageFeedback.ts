/**
 * Damage Feedback Formatters
 *
 * Pure helpers for the event-log + action-panel damage feedback
 * surface. Decouples human-readable summary generation from the
 * `EventLogDisplay` component so consumers (action panel, replay,
 * post-battle report) can reuse the same wording.
 *
 * Per `add-damage-feedback-ui` task 4 + task 9.5: includes leading
 * glyphs (✓ hit, ⚠ critical, ✕ kill) on every entry so colorblind
 * users can distinguish entry types without relying on color.
 *
 * @spec openspec/changes/add-damage-feedback-ui/tasks.md § 4, § 6, § 9.5
 */

import type {
  IDamageAppliedPayload,
  IPilotHitPayload,
  IUnitDestroyedPayload,
  ICriticalHitResolvedPayload,
} from '@/types/gameplay';

/**
 * Format a single `DamageApplied` payload as a human-readable log
 * entry. Includes a leading ✓ glyph (hit) or ✕ glyph (location
 * destroyed). Caller resolves unit ids → designations.
 */
export function formatDamageEntry(
  payload: IDamageAppliedPayload,
  resolveUnitName: (unitId: string) => string,
): string {
  const target = resolveUnitName(payload.unitId);
  const location = humanLocation(payload.location);
  const glyph = payload.locationDestroyed ? '✕' : '✓';
  const base = `${glyph} ${target} took ${payload.damage} damage to ${location}`;
  if (payload.locationDestroyed) {
    return `${base} — location destroyed`;
  }
  if (payload.armorRemaining === 0 && payload.structureRemaining > 0) {
    return `${base} — armor breached, structure ${payload.structureRemaining} remaining`;
  }
  return `${base} (${payload.armorRemaining} armor / ${payload.structureRemaining} structure remaining)`;
}

/**
 * Format a `CriticalHitResolved` payload — leading ⚠ glyph per task
 * 9.5; calls out the destroyed component when relevant.
 */
export function formatCriticalEntry(
  payload: ICriticalHitResolvedPayload,
  resolveUnitName: (unitId: string) => string,
): string {
  const target = resolveUnitName(payload.unitId);
  const location = humanLocation(payload.location);
  if (payload.destroyed) {
    return `⚠ Critical: ${payload.componentName} destroyed in ${target}'s ${location}`;
  }
  return `⚠ Critical: ${payload.componentName} hit in ${target}'s ${location}`;
}

/**
 * Format a `PilotHit` payload — leading ⚠ for wound or ✕ for kill.
 * Includes the wound count + consciousness state per task 5 + 6.
 */
export function formatPilotHitEntry(
  payload: IPilotHitPayload,
  resolveUnitName: (unitId: string) => string,
): string {
  const target = resolveUnitName(payload.unitId);
  if (payload.totalWounds >= 6) {
    return `✕ Pilot killed: ${target} (${payload.totalWounds} wounds, ${payload.source})`;
  }
  const conscious =
    payload.consciousnessCheckPassed === false ? ' — pilot unconscious' : '';
  return `⚠ Pilot takes ${payload.wounds} hit (${payload.totalWounds}/6 wounds, ${payload.source})${conscious}`;
}

/**
 * Format a `UnitDestroyed` payload — leading ✕ glyph + cause.
 */
export function formatUnitDestroyedEntry(
  payload: IUnitDestroyedPayload,
  resolveUnitName: (unitId: string) => string,
): string {
  const target = resolveUnitName(payload.unitId);
  return `✕ ${target} destroyed (${humanCause(payload.cause)})`;
}

/**
 * Convert `'left_torso_rear'` → `'Left Torso (Rear)'`, etc. Pure
 * presentational helper — kept here so the event-log + action-panel
 * + post-battle screens all show the same wording.
 */
export function humanLocation(location: string): string {
  const isRear = location.endsWith('_rear');
  const base = isRear ? location.slice(0, -5) : location;
  const titled = base
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return isRear ? `${titled} (Rear)` : titled;
}

function humanCause(cause: string): string {
  switch (cause) {
    case 'damage':
      return 'cumulative damage';
    case 'ammo_explosion':
      return 'ammo explosion';
    case 'pilot_death':
      return 'pilot death';
    case 'shutdown':
      return 'shutdown';
    default:
      return cause;
  }
}

// =============================================================================
// Head-hit + Pilot emphasis formatters
// =============================================================================
//
// Per `add-damage-feedback-ui` task 6 + task 9.5: head hits, pilot
// kills, and pilot unconscious states each get their own formatter so
// the EventLog (and post-battle screens, replay, etc.) can render
// them with bold + color + glyph treatment instead of the generic
// damage / pilot wording. Every formatter returns a discriminated
// `IFormattedHeadOrPilotEntry` that callers can render with custom
// CSS — distinct from the basic string formatters above.

/**
 * Discriminated entry shape for head-hit / pilot-status entries.
 * Carries enough metadata for the EventLog renderer to apply emphasis
 * (red, bold, persistent, tooltip) without re-deriving from the
 * payload type.
 *
 * @spec openspec/changes/add-damage-feedback-ui/tasks.md § 6, § 9.5
 */
export interface IFormattedHeadOrPilotEntry {
  /** Human-readable text (already includes the leading glyph). */
  readonly text: string;
  /**
   * Emphasis bucket. Drives EventLog styling:
   * - `'head-hit'`   — red ⚠ glyph + bold; tooltip explains the
   *                    consciousness check requirement
   * - `'pilot-killed'`     — bright red ✕, bold, persistent (won't
   *                          collapse with other entries)
   * - `'pilot-unconscious'` — yellow Z glyph, bold
   */
  readonly emphasis: 'head-hit' | 'pilot-killed' | 'pilot-unconscious';
  /**
   * Optional tooltip / hover text. Currently used by the head-hit
   * variant to explain the consciousness check.
   */
  readonly tooltip?: string;
  /**
   * Should this entry resist collapse / dedupe? `true` for pilot
   * kills so the player can't miss them in a long log.
   */
  readonly persistent: boolean;
}

/**
 * Format a head-hit `DamageApplied` entry — caller decides whether
 * to call this vs `formatDamageEntry` based on `payload.location`.
 * Adds the warning + consciousness-check tooltip per task 6.1.
 */
export function formatHeadHitEntry(
  payload: IDamageAppliedPayload,
  resolveUnitName: (unitId: string) => string,
): IFormattedHeadOrPilotEntry {
  const target = resolveUnitName(payload.unitId);
  const text = `⚠ ${target} took ${payload.damage} damage to Head — pilot takes 1 hit`;
  return {
    text,
    emphasis: 'head-hit',
    tooltip: 'Pilot must roll consciousness',
    persistent: false,
  };
}

/**
 * Format a pilot-killed `PilotHit` (or follow-up `UnitDestroyed` with
 * `cause: 'pilot_death'`). Always persistent so the player can scan
 * back and see when their pilot died (task 6.3).
 */
export function formatPilotKilledEntry(
  payload: IPilotHitPayload,
  resolveUnitName: (unitId: string) => string,
): IFormattedHeadOrPilotEntry {
  const target = resolveUnitName(payload.unitId);
  const text = `✕ ${target}: PILOT KILLED (${payload.totalWounds}/6 wounds, ${payload.source})`;
  return {
    text,
    emphasis: 'pilot-killed',
    persistent: true,
  };
}

/**
 * Format a pilot-unconscious entry (consciousness check failed but
 * pilot is still alive). Yellow Z glyph (task 9.3 colorblind safety).
 */
export function formatPilotUnconsciousEntry(
  payload: IPilotHitPayload,
  resolveUnitName: (unitId: string) => string,
): IFormattedHeadOrPilotEntry {
  const target = resolveUnitName(payload.unitId);
  const text = `Z ${target}: PILOT UNCONSCIOUS (${payload.totalWounds}/6 wounds, failed consciousness check)`;
  return {
    text,
    emphasis: 'pilot-unconscious',
    persistent: false,
  };
}

/**
 * Did this `DamageApplied` payload land on the head? Centralized so
 * the EventLog and the action panel use the same predicate.
 */
export function isHeadHit(payload: IDamageAppliedPayload): boolean {
  return payload.location === 'head' || payload.location === 'HEAD';
}

/**
 * Did this `PilotHit` payload kill the pilot? 6+ wounds → dead per
 * BattleTech canon.
 */
export function isPilotKilled(payload: IPilotHitPayload): boolean {
  return payload.totalWounds >= 6;
}

/**
 * Did this `PilotHit` payload knock the pilot unconscious (without
 * killing them)?
 */
export function isPilotUnconscious(payload: IPilotHitPayload): boolean {
  return !isPilotKilled(payload) && payload.consciousnessCheckPassed === false;
}
