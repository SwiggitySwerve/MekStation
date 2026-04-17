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
