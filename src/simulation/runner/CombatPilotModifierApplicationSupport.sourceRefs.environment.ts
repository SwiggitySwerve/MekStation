import { CANONICAL_SPA_COMBAT_SCOPE_SUPPORT } from './CombatCanonicalSpaSupport';
import { combatFeatureSourceRef as pilotModifierApplicationSourceRef } from './CombatFeatureSourceReference';
import { type ICombatFeatureSourceReference } from './CombatFeatureSupport';

export const MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

export const MEGAMEK_ENV_SPECIALIST_RANGED_TO_HIT_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek Crew registers Environmental Specialist constants for Fog, Hail, Light, Rain, Snow, and Wind; ranged runtime consumes Fog, Light, Rain, Snow, and Wind branches only.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/units/Crew.java#L161-L168`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek ComputeAbilityMods applies Snow Environmental Specialist as a -1 ranged to-hit modifier under represented snow weather branches.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L209-L224`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation calculateEnvironmentalSpecialistRangedToHitModifier consumes env_specialist plus explicit snow designation only for represented snow precipitation ranged to-hit relief.',
    'src/utils/gameplay/environmentalModifiers.ts#L344-L366',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation runAttackPhase threads attacker abilities and designatedEnvironment into existing environmental ranged to-hit modifier calculation.',
    'src/simulation/runner/phases/weaponAttack.ts#L1072-L1081',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ENV_SPECIALIST_FOG_RANGED_TO_HIT_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek Crew registers Environmental Specialist constants for Fog, Hail, Light, Rain, Snow, and Wind; ranged runtime consumes Fog, Light, Rain, Snow, and Wind branches only.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/units/Crew.java#L161-L168`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek ComputeAbilityMods applies Fog Environmental Specialist as a -1 ranged to-hit modifier for energy weapons against non-spaceborne targets in heavy fog.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L171-L179`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation calculateEnvironmentalSpecialistRangedToHitModifier consumes env_specialist plus explicit fog designation only for represented heavy_fog energy-weapon ranged to-hit relief.',
    'src/utils/gameplay/environmentalModifiers.ts#L344-L392',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation runAttackPhase threads weapon energy classification, attacker abilities, and designatedEnvironment into existing environmental ranged to-hit modifier calculation.',
    'src/simulation/runner/phases/weaponAttack.ts#L1072-L1081',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ENV_SPECIALIST_RAIN_RANGED_TO_HIT_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek Crew registers Environmental Specialist constants for Fog, Hail, Light, Rain, Snow, and Wind; ranged runtime consumes Fog, Light, Rain, Snow, and Wind branches only.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/units/Crew.java#L161-L168`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek ComputeAbilityMods applies Rain Environmental Specialist as a -1 ranged to-hit modifier for moderate-or-heavier rain, while light rain is conventional-infantry-only.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L195-L207`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation calculateEnvironmentalSpecialistRangedToHitModifier consumes env_specialist plus explicit rain designation only for represented heavy_rain ranged to-hit relief.',
    'src/utils/gameplay/environmentalModifiers.ts#L344-L381',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation runAttackPhase threads attacker abilities and designatedEnvironment into existing environmental ranged to-hit modifier calculation.',
    'src/simulation/runner/phases/weaponAttack.ts#L1072-L1081',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ENV_SPECIALIST_WIND_RANGED_TO_HIT_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek Crew registers Environmental Specialist constants for Fog, Hail, Light, Rain, Snow, and Wind; ranged runtime consumes Fog, Light, Rain, Snow, and Wind branches only.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/units/Crew.java#L161-L168`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek ComputeAbilityMods applies Wind Environmental Specialist as ranged to-hit relief for missile weapons in moderate gale, with stronger-wind branches requiring additional weapon-category or storm-state gates.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L227-L244`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation calculateEnvironmentalSpecialistRangedToHitModifier consumes env_specialist plus explicit wind designation only for represented moderate wind missile-weapon ranged to-hit relief.',
    'src/utils/gameplay/environmentalModifiers.ts#L344-L405',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation runAttackPhase threads weapon missile classification, attacker abilities, and designatedEnvironment into existing environmental ranged to-hit modifier calculation.',
    'src/simulation/runner/phases/weaponAttack.ts#L1072-L1081',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ENV_SPECIALIST_LIGHT_RANGED_TO_HIT_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek Crew registers Environmental Specialist constants for Fog, Hail, Light, Rain, Snow, and Wind; ranged runtime consumes Fog, Light, Rain, Snow, and Wind branches only.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/units/Crew.java#L161-L168`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek ComputeAbilityMods applies Light Environmental Specialist as ranged to-hit relief for unilluminated targets in dusk, full moon, glare, moonless, solar flare, or pitch black light, and for illuminated targets in pitch black light.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L182-L191`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation calculateEnvironmentalSpecialistRangedToHitModifier consumes env_specialist plus explicit Light designation only when represented target illumination state is present.',
    'src/utils/gameplay/environmentalModifiers.ts#L364-L391',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation runAttackPhase threads explicit target illumination state into the environmental ranged to-hit modifier calculation.',
    'src/simulation/runner/phases/weaponAttack.ts#L1072-L1082',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ENV_SPECIALIST_PHYSICAL_TO_HIT_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek physical attack modifiers consume Light Environmental Specialist for unilluminated targets in moonless, solar-flare, or pitch-black light.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/compute/Compute.java#L2731-L2742`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation calculateEnvironmentalSpecialistPhysicalToHitModifier consumes env_specialist plus explicit Light designation, dark environmental light, and target illumination state for represented physical to-hit relief.',
    'src/utils/gameplay/environmentalModifiers.ts#L375-L399',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation calculatePhysicalToHit threads the represented Environmental Specialist Light physical modifier through physical attack helper paths without claiming movement, PSR, or full designation hydration parity.',
    'src/utils/gameplay/physicalAttacks/toHit.ts#L178-L1037',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_ZWEIHANDER_PUNCH_SOURCE_REFS = [
  ...(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.zweihander.sourceRefs ?? []),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation calculatePunchDamage and supported physical-weapon damage helpers consume canonical zweihander plus explicit two-handed declaration state for represented bonus damage.',
    'src/utils/gameplay/physicalAttacks/damage.ts#L98-L230',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation canPunch and canMeleeWeapon reject explicit two-handed Zweihander declarations unless the represented SPA, non-prone, both-arm-present, represented per-arm hand-actuator, selected-arm physical-weapon, and represented arm-fire prerequisites pass.',
    'src/utils/gameplay/physicalAttacks/restrictions.ts#L666-L751',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation calculatePunchToHit and calculateMeleeWeaponToHit consume represented per-location off-arm upper and lower actuator damage as two-handed Zweihander to-hit penalties.',
    'src/utils/gameplay/physicalAttacks/toHit.ts#L178-L454',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation getPhysicalMissConsequences queues the represented Zweihander punch and supported physical-weapon miss PSR plus represented self-critical side-effect consequences only when the explicit two-handed declaration and canonical SPA are present.',
    'src/utils/gameplay/physicalAttacks/damage.ts#L789-L799',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation interactive physical declaration planning exposes the represented two-handed Zweihander prompt for punch and supported physical weapons and carries twoHandedZweihander into physical resolution.',
    'src/utils/gameplay/gameSessionPhysical.ts#L585-L990',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation PhysicalAttackForecastModal renders the represented two-handed Zweihander checkbox and threads the selected declaration state through the physical attack plan store.',
    'src/components/gameplay/PhysicalAttackForecastModal.tsx#L49-L195',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation physical attack plan state stores explicit two-handed Zweihander declarations for represented physical attack types and resets the flag for unsupported physical attack types.',
    'src/stores/useGameplayStore.physicalAttackPlan.ts#L56-L111',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation runner physical attack declarations carry selected physical-weapon limbs and twoHandedZweihander into represented punch and supported physical-weapon legality, damage, declared-event, and selected-arm self-critical resolution.',
    'src/simulation/runner/phases/physicalAttack.ts#L532-L871',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation physical combat tests prove represented Zweihander punch and supported physical-weapon bonus damage, selected-arm physical-weapon declaration legality, off-arm actuator to-hit penalties, per-arm hand-actuator gates, miss PSR behavior, represented self-critical side-effect behavior, and invalid declaration no-side-effect gating without claiming non-catalog improvised club or breakage fidelity.',
    'src/utils/gameplay/__tests__/physicalAttacks.test.ts#L846-L5639',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
