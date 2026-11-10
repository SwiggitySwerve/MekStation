import { z } from 'zod';

import { attackResolvedPublicSchema } from '@/lib/events/replay/CombatRangedBaselineSchemaPack';
import { hexCoordinateSchema, objectiveMarkerSchema } from '@/lib/events/replay/CombatLifecycleSharedSchemas';
import { ActuatorType } from '@/types/construction/MechConfigTypes';
import { GamePhase, GameSide } from '@/types/gameplay/GameSessionCoreTypes';
import { Facing } from '@/types/gameplay/HexGridInterfaces';
import { UNIT_DESTROYED_CAUSES } from '@/types/gameplay/UnitDestroyedCause';
import type { GmReplayCorrectionEffect, IGmCorrectionAppliedPayload } from '@/types/interventions/GmReplayCorrection';
import { unsupportedGmCorrectionLeaf } from './GmCorrectionLeafPolicy';

const id = z.string().trim().min(1);
const nonnegative = z.number().finite().nonnegative();
const quantities = z.record(id, nonnegative);
const names = z.array(id);
const actuatorState = z.partialRecord(z.nativeEnum(ActuatorType), z.boolean());

export const gmCorrectionComponentDamageSchema = z.object({
  engineHits: nonnegative.int().max(3),
  gyroHits: nonnegative.int(),
  sensorHits: nonnegative.int().max(2),
  lifeSupport: nonnegative.int().max(2),
  cockpitHit: z.boolean(),
  actuators: actuatorState,
  actuatorsByLocation: z.record(id, actuatorState).optional(),
  weaponsDestroyed: names,
  vehicleCriticalsByLocation: z.record(id, z.object({
    weaponsDestroyed: nonnegative.int().optional(),
    weaponsJammed: nonnegative.int().optional(),
    stabilizerHit: z.boolean().optional(),
    flightStabilizerHit: z.boolean().optional(),
  }).strict()).optional(),
  heatSinksDestroyed: nonnegative.int(),
  jumpJetsDestroyed: nonnegative.int(),
  superCooledMyomerHits: nonnegative.int().optional(),
  emergencyCoolantSystemDamaged: z.boolean().optional(),
  playtestAutocannonFirstCrits: names.optional(),
  breachedLocations: names.optional(),
}).strict();

export const gmCorrectionAmmoSlotSchema = z.object({
  binId: id,
  weaponType: id,
  location: id,
  remainingRounds: nonnegative.int(),
  maxRounds: nonnegative.int(),
  damagePerRound: nonnegative.optional(),
  caseProtection: z.enum(['none', 'case', 'case_ii']).optional(),
  isExplosive: z.boolean(),
}).strict();

const attackAfter = attackResolvedPublicSchema.pick({
  attackerId: true, targetId: true, weaponId: true, roll: true,
  toHitNumber: true, hit: true, location: true, damage: true,
  heat: true, attackerArc: true, ammoBinId: true, rolls: true,
}).extend({
  attackId: id,
  relatedEventIds: names.optional(),
  supersededEventIds: names.optional(),
}).strict();

/** Closed schemas are shared by admission and the replay pack. */
export const gmReplayCorrectionEffectSchema = z.discriminatedUnion('family', [
  z.object({ family: z.literal('reposition-facing'), unitId: id,
    after: z.object({ position: hexCoordinateSchema.optional(), facing: z.nativeEnum(Facing).optional(), secondaryFacing: z.nativeEnum(Facing).optional() }).strict(),
    clear: z.array(z.literal('secondaryFacing')).optional(),
  }).strict(),
  z.object({ family: z.literal('damage-critical'), unitId: id,
    after: z.object({ armor: quantities.optional(), structure: quantities.optional(), componentDamage: gmCorrectionComponentDamageSchema.optional(), destroyedLocations: names.optional(), destroyedEquipment: names.optional() }).strict(),
    clear: z.array(z.literal('componentDamage')).optional(),
  }).strict(),
  z.object({ family: z.literal('heat-ammo'), unitId: id,
    after: z.object({ heat: nonnegative.optional(), ammo: quantities.optional(), ammoState: z.record(id, gmCorrectionAmmoSlotSchema).optional() }).strict(),
    clear: z.array(z.literal('ammoState')).optional(),
  }).strict(),
  z.object({ family: z.literal('turn-order'),
    after: z.object({ phase: z.nativeEnum(GamePhase).optional(), initiativeWinner: z.nativeEnum(GameSide).optional(), firstMover: z.nativeEnum(GameSide).optional() }).strict(),
    clear: z.array(z.enum(['initiativeWinner', 'firstMover'])).optional(),
  }).strict(),
  z.object({ family: z.literal('lifecycle'), unitId: id,
    after: z.object({ destroyed: z.boolean().optional(), destructionCause: z.enum(UNIT_DESTROYED_CAUSES).optional(), hasEjected: z.boolean().optional(), hasRetreated: z.boolean().optional(), isWithdrawing: z.boolean().optional(), shutdown: z.boolean().optional(), retreatTargetEdge: z.enum(['north', 'south', 'east', 'west']).optional() }).strict(),
    clear: z.array(z.enum(['destructionCause', 'hasEjected', 'hasRetreated', 'isWithdrawing', 'shutdown', 'retreatTargetEdge'])).optional(),
  }).strict(),
  z.object({ family: z.literal('attack-resolution'), attackId: id, after: attackAfter }).strict(),
  z.object({ family: z.literal('objective-state'), objectiveId: id, previousHexKey: id.optional(), after: objectiveMarkerSchema }).strict(),
]).superRefine((effect, context) => {
  const clear = 'clear' in effect ? effect.clear ?? [] : [];
  if (Object.keys(effect.after).length + clear.length === 0)
    context.addIssue({ code: 'custom', message: 'gm-correction-empty-effect' });
  if (new Set(clear).size !== clear.length || clear.some(key => Object.hasOwn(effect.after, key)))
    context.addIssue({ code: 'custom', message: 'gm-correction-conflicting-clear' });
  if (effect.family === 'attack-resolution' && effect.attackId !== effect.after.attackId)
    context.addIssue({ code: 'custom', message: 'gm-correction-attack-id-mismatch' });
  if (effect.family === 'objective-state' && effect.objectiveId !== effect.after.id)
    context.addIssue({ code: 'custom', message: 'gm-correction-objective-id-mismatch' });
}) satisfies z.ZodType<GmReplayCorrectionEffect>;

export const gmCorrectionAppliedPayloadSchema = z.object({
  correctionId: z.uuidv4(),
  effects: z.array(gmReplayCorrectionEffectSchema).min(1),
  intentId: id.optional(),
}).strict() satisfies z.ZodType<IGmCorrectionAppliedPayload>;

/** Public errors never interpolate untrusted private values or parser issues. */
export function parseGmCorrectionAppliedPayload(input: unknown): IGmCorrectionAppliedPayload {
  const parsed = gmCorrectionAppliedPayloadSchema.safeParse(input);
  if (!parsed.success) throw new Error('gm-correction-invalid-payload');
  if (parsed.data.effects.some(effect => unsupportedGmCorrectionLeaf(effect) !== undefined))
    throw new Error('gm-correction-no-ordinary-carrier');
  return parsed.data;
}
