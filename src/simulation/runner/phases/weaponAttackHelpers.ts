import type { IAmmoSlotState } from '@/types/gameplay/GameSessionInterfaces';
import type { CriticalHitEvent } from '@/utils/gameplay/criticalHitResolution/types';

import {
  FiringArc,
  GameEventType,
  GamePhase,
  IGameEvent,
  IToHitModifier,
  RangeBracket,
} from '@/types/gameplay';

import type { IWeapon } from '../../ai/types';

import { createGameEvent } from './utils';

/**
 * Map a `RangeBracket` enum value to the literal subset accepted by the
 * `IAttackDeclaredPayload.range` field. `OutOfRange` is filtered upstream
 * (emits `AttackInvalid` instead) so it never reaches this helper.
 */
export function bracketToPayloadRange(
  bracket: RangeBracket,
): 'short' | 'medium' | 'long' | 'extreme' {
  switch (bracket) {
    case RangeBracket.Short:
      return 'short';
    case RangeBracket.Medium:
      return 'medium';
    case RangeBracket.Long:
      return 'long';
    case RangeBracket.Extreme:
      return 'extreme';
    default:
      // Defensive: callers MUST filter `OutOfRange` before reaching this
      // helper; any unknown bracket falls back to `'long'` which is the
      // most pessimistic to-hit so a stray invariant violation is
      // visible in test output without crashing the run.
      return 'long';
  }
}

/**
 * Per `add-combat-fidelity-suite` Phase 2 (`combat-resolution` delta):
 * project the to-hit modifier list emitted by `calculateToHit` into the
 * `IToHitModifier` event-payload shape. The detail type carries a
 * narrower `source` union and an optional `description`; the payload
 * type only needs `name`, `value`, `source: string`. TypeScript's
 * structural typing accepts the wider value at the narrower position
 * here, but creating a fresh array keeps payloads decoupled from
 * detail-type evolution and avoids leaking optional fields into events.
 */
export function modifiersToPayload(
  modifiers: ReadonlyArray<{
    readonly name: string;
    readonly value: number;
    readonly source: string;
  }>,
): readonly IToHitModifier[] {
  return modifiers.map((m) => ({
    name: m.name,
    value: m.value,
    source: m.source,
  }));
}

/**
 * Per `add-combat-fidelity-suite` Phase 4 (`combat-resolution` delta —
 * Ammo Consumption and Explosion Events): map a runner-side `IWeapon`
 * to a `weaponType` string consumable by `consumeAmmo`. The catalog
 * weapon ids carry an `-{index}` suffix (e.g. `lrm-20-2`) per
 * `UnitHydration.toAIWeapon`; ammo bins are typed by the base weapon
 * family (`lrm-20`, `srm-6`, `ac-20`). We strip the trailing
 * `-{number}` suffix to derive the base type. Energy weapons return
 * the unmodified id but the caller filters them out via
 * `isEnergyWeapon` first.
 *
 * Defensive: when the id has no trailing index suffix (test fixtures
 * that hand-build minimal weapons), the original id is returned
 * unchanged.
 */
export function weaponTypeFromMountId(weaponId: string): string {
  const match = weaponId.match(/^(.+)-(\d+)$/);
  return match ? match[1] : weaponId;
}

export function toFiringArc(
  arc: 'front' | 'left' | 'right' | 'rear',
): FiringArc {
  switch (arc) {
    case 'front':
      return FiringArc.Front;
    case 'left':
      return FiringArc.Left;
    case 'right':
      return FiringArc.Right;
    case 'rear':
      return FiringArc.Rear;
  }
}

/**
 * Per `add-combat-fidelity-suite` Phase 4 (`ammo-explosion-system`
 * delta — Ammo Explosion Triggered by Critical Hit on Loaded Bin):
 * prefer the destroyed component slot's exact `ammoBinId`, then fall
 * back to the legacy same-location lookup for older synthetic manifests.
 * When no loaded bin is found at the location or the exact targeted bin,
 * returns `null` and the runner skips the AmmoExplosion event (matching
 * the spec scenario "Empty ammo bin crit produces no explosion").
 *
 * `damagePerRound` is sourced from the bin's `weaponType` looked up
 * against the unit's catalog weapon list; we fallback to 1 when the
 * weapon isn't found in the lookup so the explosion event still
 * fires with a non-zero damage signal.
 */
export function findExplodingAmmoBin(
  ammoState: Record<string, IAmmoSlotState>,
  location: string,
  ammoBinId?: string,
): IAmmoSlotState | null {
  if (ammoBinId !== undefined) {
    const bin = ammoState[ammoBinId];
    if (
      bin &&
      bin.location === location &&
      bin.remainingRounds > 0 &&
      bin.isExplosive
    ) {
      return bin;
    }
    return null;
  }

  for (const bin of Object.values(ammoState)) {
    if (
      bin.location === location &&
      bin.remainingRounds > 0 &&
      bin.isExplosive
    ) {
      return bin;
    }
  }
  return null;
}

/**
 * Per `add-combat-fidelity-suite` Phase 4: resolve the per-round
 * damage of an ammo bin from the attacker's catalog weapon list. The
 * bin's `weaponType` (e.g. `ac-20`, `lrm-20`, `srm-6`) is matched
 * against weapon ids in the lookup; the matching weapon's `damage`
 * field (already resolved per `resolveCatalogDamage`) is the
 * per-round damage. AC/20 bin = 20 damage/round, LRM-20 bin = 20
 * damage/missile (resolved as a per-volley sum upstream), etc.
 *
 * When the bin's weapon isn't found in the lookup (test fixtures
 * with hand-rolled bins), we fall back to 1 so the explosion still
 * fires with a non-zero damage signal — tests can override by
 * supplying a matching weapon entry.
 */
export function damagePerRoundForBin(
  bin: IAmmoSlotState,
  unitWeapons: readonly IWeapon[] | undefined,
): number {
  if (!unitWeapons) return 1;
  for (const weapon of unitWeapons) {
    const baseType = weaponTypeFromMountId(weapon.id);
    if (baseType === bin.weaponType) {
      return weapon.damage > 0 ? weapon.damage : 1;
    }
  }
  return 1;
}

/**
 * Per `add-combat-fidelity-suite` Phase 3 (`combat-resolution` delta):
 * translate the resolver's `CriticalHitEvent[]` stream into runner-side
 * `IGameEvent`s and append them to the events log.
 *
 * Causal ordering (per design D4):
 *   `CriticalHit` (per resolved slot, count=1 per BattleTech rule)
 *   → `CriticalHitResolved` (per slot resolved)
 *   → `ComponentDestroyed` (per component fully destroyed)
 *   → `PSRTriggered` (gyro hit cascades into pilot skill roll)
 *   → `PilotHit` (cockpit hit + head hit)
 *   → `UnitDestroyed` (engine 3-hit / cockpit / head destroyed)
 *
 * The first emit is `CriticalHit` itself — it is NOT in the resolver's
 * event stream (the resolver only emits `critical_hit_resolved` /
 * `psr_triggered` / `pilot_hit` / `unit_destroyed`). The runner adds
 * the `CriticalHit` event from the slot info directly so consumers
 * (KeyMomentDetector, replay UI, EventLogDisplay) can switch on the
 * `component` field carried in the payload.
 *
 * Engine destruction (cause: 'damage' from the resolver) is translated
 * to `'engine_destroyed'` per the snake_case taxonomy fixed by P0.5.
 *
 * Returns the number of game events appended.
 */
export function emitCritEvents(options: {
  events: IGameEvent[];
  gameId: string;
  turn: number;
  attackerId: string;
  targetId: string;
  critEvents: readonly CriticalHitEvent[];
  targetAlreadyDestroyed: boolean;
  /**
   * Per `denormalize-event-envelope-and-close-emission-contract-gaps`
   * (piloting-skill-rolls delta — PSRTriggered Carries Base Skill): the
   * target's base piloting skill, threaded onto each emitted
   * `psr_triggered` event so consumers don't have to join back to the
   * unit record. Optional for back-compat with synthetic-unit fixtures
   * that don't seed `IUnitGameState.piloting`.
   */
  targetPilotingSkill?: number;
}): {
  unitDestroyed: boolean;
  destructionCause:
    | 'damage'
    | 'ammo_explosion'
    | 'pilot_death'
    | 'engine_destroyed'
    | 'impossible_displacement'
    | 'ct_destroyed'
    | 'head_destroyed'
    | undefined;
} {
  const {
    events,
    gameId,
    turn,
    attackerId,
    targetId,
    critEvents,
    targetAlreadyDestroyed,
    targetPilotingSkill,
  } = options;

  let unitDestroyed = false;
  let destructionCause:
    | 'damage'
    | 'ammo_explosion'
    | 'pilot_death'
    | 'engine_destroyed'
    | 'impossible_displacement'
    | 'ct_destroyed'
    | 'head_destroyed'
    | undefined = undefined;

  for (const evt of critEvents) {
    if (evt.type === 'critical_hit_resolved') {
      const p = evt.payload;
      // `CriticalHit` first (per slot, count=1) so KeyMomentDetector
      // and legacy `processCriticalHit` consumers fire on the right
      // event type. `location` is sourced from the resolver payload
      // (`p.location`) — that's the location the crit actually
      // landed on, which may differ from the attack's original hit
      // location when transfer-chain damage triggered the crit (e.g.
      // hit LA → LA destroyed → 3 damage to LT → crit on LT engine).
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.CriticalHit,
          turn,
          GamePhase.WeaponAttack,
          {
            unitId: targetId,
            location: p.location,
            sourceUnitId: attackerId,
            component: p.componentType,
            count: 1,
          },
          attackerId,
        ),
      );

      // Then `CriticalHitResolved` carrying the slot index + effect
      // text. Per spec scenario "Gyro destruction event chain": this
      // payload carries the `slot` index and `component` enum value.
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.CriticalHitResolved,
          turn,
          GamePhase.WeaponAttack,
          {
            unitId: p.unitId,
            location: p.location,
            slotIndex: p.slotIndex,
            componentType: p.componentType,
            componentName: p.componentName,
            ...(p.ammoBinId !== undefined ? { ammoBinId: p.ammoBinId } : {}),
            effect: p.effect,
            destroyed: p.destroyed,
          },
          attackerId,
        ),
      );

      // `ComponentDestroyed` when the slot is fully destroyed (always
      // true today — the resolver only emits `critical_hit_resolved`
      // when a slot was actually struck). Carries the `componentType`
      // enum + `slotIndex` for UI dedupe.
      if (p.destroyed) {
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.ComponentDestroyed,
            turn,
            GamePhase.WeaponAttack,
            {
              unitId: p.unitId,
              location: p.location,
              componentType: p.componentType,
              slotIndex: p.slotIndex,
              componentName: p.componentName,
              ...(p.ammoBinId !== undefined ? { ammoBinId: p.ammoBinId } : {}),
            },
            attackerId,
          ),
        );
      }
      continue;
    }

    if (evt.type === 'psr_triggered') {
      const p = evt.payload;
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.PSRTriggered,
          turn,
          GamePhase.WeaponAttack,
          {
            unitId: p.unitId,
            reason: p.reason,
            additionalModifier: p.additionalModifier,
            triggerSource: p.triggerSource,
            ...(targetPilotingSkill !== undefined
              ? { basePilotingSkill: targetPilotingSkill }
              : {}),
            // Per `structure-psr-reason-as-discriminated-code` (PR E):
            // forward the canonical `reasonCode` if the upstream
            // critical-hit pipeline produced one. The catalog of
            // crit-driven PSR reasons (gyro hit, engine hit, hip /
            // upper-leg / lower-leg / foot actuator destroyed) is
            // covered by the damage-family factory migration.
            ...(p.reasonCode !== undefined ? { reasonCode: p.reasonCode } : {}),
          },
          attackerId,
        ),
      );
      continue;
    }

    if (evt.type === 'pilot_hit') {
      const p = evt.payload;
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.PilotHit,
          turn,
          GamePhase.WeaponAttack,
          {
            unitId: p.unitId,
            wounds: p.wounds,
            totalWounds: p.totalWounds,
            source: p.source,
            consciousnessCheckRequired: p.consciousnessCheckRequired,
            consciousnessCheckPassed: p.consciousnessCheckPassed,
          },
          attackerId,
        ),
      );
      continue;
    }

    if (evt.type === 'unit_destroyed') {
      // The crit-resolution layer encodes engine 3-hit destruction as
      // `cause: 'damage'`. Per P0.5's reconciled taxonomy + the spec
      // scenario "Engine-3-hit destruction triggers UnitDestroyed", the
      // runner translates that to `'engine_destroyed'` so downstream
      // consumers see the spec-correct enum without re-deriving it
      // from componentDamage.engineHits.
      const rawCause = evt.payload.cause;
      const mappedCause:
        | 'damage'
        | 'ammo_explosion'
        | 'pilot_death'
        | 'engine_destroyed'
        | 'impossible_displacement'
        | 'ct_destroyed'
        | 'head_destroyed' =
        rawCause === 'damage'
          ? 'engine_destroyed'
          : rawCause === 'pilot_death'
            ? 'pilot_death'
            : (rawCause as
                | 'ammo_explosion'
                | 'impossible_displacement'
                | 'ct_destroyed'
                | 'head_destroyed');

      // Capture for the caller; the actual `UnitDestroyed` game event
      // is emitted exactly once per shot by the caller (after damage
      // chain) so we don't double-emit when raw armor destruction +
      // crit destruction both fire on the same shot.
      unitDestroyed = true;
      destructionCause = mappedCause;
      continue;
    }
  }

  // The caller suppresses double `UnitDestroyed` if the target was
  // already destroyed by armor depletion before crits resolved.
  if (targetAlreadyDestroyed) {
    unitDestroyed = false;
    destructionCause = undefined;
  }

  return { unitDestroyed, destructionCause };
}
