import {
  megamekSourceRef as heavyLifterMegamekRef,
  mekstationDeviationSourceRef as heavyLifterMekStationRef,
  type ICombatFeatureSourceReference,
} from './CombatFeatureSourceReference';

export const MEGAMEK_HEAVY_LIFTER_SOURCE_REFS = [
  heavyLifterMegamekRef(
    'MegaMek MekWithArms.maxGroundObjectTonnage multiplies BattleMech ground-object lift capacity by 1.5 for Heavy Lifter.',
    'megamek/src/megamek/common/units/MekWithArms.java#L97-L115',
  ),
  heavyLifterMegamekRef(
    'MegaMek ProtoMek.maxGroundObjectTonnage multiplies ProtoMek ground-object lift capacity by 1.5 for Heavy Lifter.',
    'megamek/src/megamek/common/units/ProtoMek.java#L553-L567',
  ),
  heavyLifterMegamekRef(
    'MegaMek OptionsConstants defines PILOT_HVY_LIFTER as hvy_lifter.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L169-L178',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_HEAVY_LIFTER_HELPER_SOURCE_REFS = [
  heavyLifterMekStationRef(
    'MekStation calculateGroundObjectLiftCapacity implements the source-backed 5 percent per available hand lift capacity plus Heavy Lifter and TSM pickup multipliers.',
    'src/utils/gameplay/spaModifiers/abilityModifiers.ts#L356-L373',
  ),
  heavyLifterMekStationRef(
    'MekStation SPA helper tests prove canonical and legacy Heavy Lifter ids apply the 1.5 lift-capacity multiplier as capacity math independent from throw action resolution.',
    'src/utils/gameplay/__tests__/spaModifiers.test.ts#L799-L899',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_HEAVY_LIFTER_CARRY_OBJECT_CAPACITY_SOURCE_REFS = [
  ...MEGAMEK_HEAVY_LIFTER_SOURCE_REFS,
  ...MEKSTATION_HEAVY_LIFTER_HELPER_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_HEAVY_LIFTER_GROUND_OBJECT_WEIGHT_GATE_SOURCE_REFS = [
  ...MEGAMEK_HEAVY_LIFTER_SOURCE_REFS,
  ...MEKSTATION_HEAVY_LIFTER_HELPER_SOURCE_REFS,
  heavyLifterMekStationRef(
    'MekStation checkGroundObjectLiftCapacity gates represented ground-object payload tonnage against source-backed lift capacity before pickup/drop lifecycle support consumes that state.',
    'src/utils/gameplay/spaModifiers/abilityModifiers.ts#L360-L385',
  ),
  heavyLifterMekStationRef(
    'MekStation SPA helper tests prove the represented ground-object weight gate allows payloads at or below Heavy Lifter capacity and rejects overweight or invalid payloads.',
    'src/utils/gameplay/__tests__/spaModifiers.test.ts#L852-L899',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_GROUND_OBJECT_ACTION_SOURCE_REFS = [
  heavyLifterMegamekRef(
    'MegaMek MoveStepType registers pickup and drop cargo movement steps for carryable-object lifecycle actions.',
    'megamek/src/megamek/common/enums/MoveStepType.java#L108-L109',
  ),
  heavyLifterMegamekRef(
    'MegaMek MovePathHandler resolves PICKUP_CARGO by finding ground objects, checking maxGroundObjectTonnage against payload tonnage, and calling processPickupStep.',
    'megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L3123-L3165',
  ),
  heavyLifterMegamekRef(
    'MegaMek MovePathHandler resolves DROP_CARGO by dropping the carried object and placing the ground object at the step position.',
    'megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L3170-L3221',
  ),
  heavyLifterMegamekRef(
    'MegaMek GroundObject.processPickupStep removes the object from the ground and records it on the entity carrying it.',
    'megamek/src/megamek/common/equipment/GroundObject.java#L133-L148',
  ),
  heavyLifterMegamekRef(
    'MegaMek Entity exposes maxGroundObjectTonnage, pickupCarryableObject, and dropCarriedObject as the carried-object state lifecycle.',
    'megamek/src/megamek/common/units/Entity.java#L3053-L3179',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_HEAVY_LIFTER_CARRY_OBJECT_ACTION_SOURCE_REFS = [
  ...MEGAMEK_GROUND_OBJECT_ACTION_SOURCE_REFS,
  ...MEGAMEK_HEAVY_LIFTER_SOURCE_REFS,
  ...MEKSTATION_HEAVY_LIFTER_HELPER_SOURCE_REFS,
  heavyLifterMekStationRef(
    'MekStation groundObjectActions validates represented pickup/drop actions, consumes Heavy Lifter lift-capacity gates, and emits event-sourced carried-object lifecycle events.',
    'src/utils/gameplay/groundObjectActions.ts#L102-L274',
  ),
  heavyLifterMekStationRef(
    'MekStation ground-object reducers persist represented carried-object state, per-arm cargo occupancy, loading/unloading state, and drop positions.',
    'src/utils/gameplay/gameState/groundObjects.ts#L54-L123',
  ),
  heavyLifterMekStationRef(
    'MekStation gameplay coverage proves represented pickup/drop events update object state and reject overweight payloads without side effects.',
    'src/utils/gameplay/__tests__/groundObjectActions.test.ts#L77-L155',
  ),
  heavyLifterMekStationRef(
    'MekStation runner coverage proves represented pickup/drop helper parity emits events and preserves invalid-action no-side-effect behavior.',
    'src/simulation/runner/__tests__/groundObjectActions.behavior.test.ts#L79-L194',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_HEAVY_LIFTER_THROW_RELEASE_SOURCE_REFS = [
  ...MEGAMEK_GROUND_OBJECT_ACTION_SOURCE_REFS,
  ...MEGAMEK_HEAVY_LIFTER_SOURCE_REFS,
  ...MEKSTATION_HEAVY_LIFTER_HELPER_SOURCE_REFS,
  heavyLifterMekStationRef(
    'MekStation GroundObjectDropped payloads distinguish represented throw releases from ordinary drops with reason=throw while reusing the carried-object release lifecycle.',
    'src/types/gameplay/GameSessionGroundObjectEvents.ts#L30-L35',
  ),
  heavyLifterMekStationRef(
    'MekStation declareGroundObjectThrow emits an event-sourced throw release to a declared hex without claiming throw attack range, hit resolution, damage, or displacement.',
    'src/utils/gameplay/groundObjectActions.ts#L275-L283',
  ),
  heavyLifterMekStationRef(
    'MekStation runner ground-object helpers emit reason=throw release events and clear represented carried-object state without resolving throw damage.',
    'src/simulation/runner/phases/groundObjectActions.ts#L91-L141',
  ),
  heavyLifterMekStationRef(
    'MekStation gameplay and runner coverage prove represented throw-release events land the carried object at the declared hex and clear carried-object state.',
    'src/utils/gameplay/__tests__/groundObjectActions.test.ts#L178-L220',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
