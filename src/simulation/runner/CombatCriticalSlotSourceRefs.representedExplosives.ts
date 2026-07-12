import {
  MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_HOT_LOADED_WEAPON_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_CHARGED_CAPACITOR_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_PROTOTYPE_IMPROVED_JUMP_JET_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_EXTENDED_FUEL_TANK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_BLUE_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_RISC_LASER_PULSE_MODULE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
} from './CombatCriticalSlotSourceRefs.core';
import {
  mekstationDeviationSourceRef as explosiveEquipmentMekStationRef,
  type ICombatFeatureSourceReference,
} from './CombatFeatureSourceReference';
import { MEGAMEK_ARTEMIS_FCS_SOURCE_REFS } from './CombatSpecialWeaponSourceRefs';

export const MEKSTATION_CHARGED_CAPACITOR_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEGAMEK_CHARGED_CAPACITOR_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    explosiveEquipmentMekStationRef(
      'MekStation critical slots with represented equipment explosion damage resolve as equipment AmmoExplosion critical effects.',
      'src/utils/gameplay/criticalHitResolution/slotEffectResolution.ts#L79-L241',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation critical-slot selection treats represented equipment explosion damage as an Edge-eligible explosion slot.',
      'src/utils/gameplay/criticalHitResolution/selection.ts#L154-L158',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation runner critical explosion handling cascades represented equipment explosion damage through AmmoExplosion and DamageApplied events.',
      'src/simulation/runner/phases/weaponAttackAmmoExplosions.ts#L53-L287',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation tests prove represented PPC Capacitor criticals emit explosion payloads and runner damage cascades without claiming broader linked-capacitor lifecycle parity.',
      'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L723-L797',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_EXTENDED_FUEL_TANK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEGAMEK_EXTENDED_FUEL_TANK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    explosiveEquipmentMekStationRef(
      'MekStation critical-slot hydration maps Extended Fuel Tank text, including official tonnage-suffixed BattleMech critical text, before generic equipment handling and attaches represented 20-point secondary-effect-gated explosion metadata.',
      'src/simulation/runner/UnitHydration.ts#L1776-L1790',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation hydration tests prove exact Extended Fuel Tank text and official Carbine/Vampyr tonnage-suffixed Extended Fuel Tank critical text hydrate as equipment with represented 20-point secondary-effect-gated explosion metadata.',
      'src/simulation/runner/__tests__/atlasHydration.04.hydrates-extended-fuel-tank-critical-text-as-secondary.fragment.ts#L4-L64',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation critical-hit resolution tests prove represented Extended Fuel Tank criticals explode only when secondary effects are enabled.',
      'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L2225-L2286',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation runner tests prove represented Extended Fuel Tank criticals emit 20-point equipment explosion payloads and cascade damage without claiming generic fuel lifecycle parity.',
      'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L1027-L1115',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_FUEL_INCENDIARY_SCOPE_SPLIT_SOURCE_REFS = [
  ...MEKSTATION_EXTENDED_FUEL_TANK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  explosiveEquipmentMekStationRef(
    'MekStation contract tests prove generic Fuel Tank maps to unofficial bafueltank, Extended Fuel Tank remains a distinct represented catalog id, and active BattleMech critical-slot data adds only LAM Fuel Tank outside represented Extended Fuel Tank names.',
    'src/simulation/runner/__tests__/combatCriticalSlotHydrationCatalog.equipment-components.fragment.ts#L18-L69',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_BLUE_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_BLUE_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  explosiveEquipmentMekStationRef(
    'MekStation critical-slot hydration maps official Blue Shield Particle Field Damper critical text before generic shield/equipment handling, attaches represented 5-point secondary-effect-gated explosion metadata for active/default mounts, and omits explosion metadata when source mode is Off.',
    'src/simulation/runner/UnitHydration.ts#L1832-L1879',
  ),
  explosiveEquipmentMekStationRef(
    'MekStation hydration tests prove official Spatha Blue Shield Particle Field Damper critical text hydrates as represented explosive equipment and synthetic source modes keep active/default mounts explosive while Off mounts hydrate as non-explosive shield equipment.',
    'src/simulation/runner/__tests__/atlasHydration.04.hydrates-extended-fuel-tank-critical-text-as-secondary.fragment.ts#L66-L153',
  ),
  explosiveEquipmentMekStationRef(
    'MekStation critical-hit resolution lets explicit Blue Shield explosionDamage payloads resolve as equipment AmmoExplosion critical effects instead of the generic shield-preservation effect.',
    'src/utils/gameplay/criticalHitResolution/slotEffectResolution.ts#L183-L187',
  ),
  explosiveEquipmentMekStationRef(
    'MekStation critical-hit resolution tests prove represented Blue Shield criticals with explicit 5-point explosion metadata explode without claiming broader Blue Shield special rules parity.',
    'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L1574-L1627',
  ),
  explosiveEquipmentMekStationRef(
    'MekStation runner tests prove represented Blue Shield criticals emit 5-point equipment explosion payloads and cascade damage without ammo-bin fallback fields.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L797-L875',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_RISC_LASER_PULSE_MODULE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEGAMEK_RISC_LASER_PULSE_MODULE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    explosiveEquipmentMekStationRef(
      'MekStation full-unit equipment hydration preserves explicit linkedEquipment metadata for represented linked equipment.',
      'src/simulation/runner/UnitHydration.ts#L147-L151',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation full-unit equipment hydration carries explicit linkedEquipment metadata into critical-slot classification.',
      'src/simulation/runner/UnitHydration.ts#L1160-L1184',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation critical-slot hydration maps RISC Laser Pulse Module linked-laser state from explicit same-location linkedEquipment metadata or exactly one same-location working laser weapon.',
      'src/simulation/runner/UnitHydration.ts#L1654-L1778',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation hydration tests prove RISC Laser Pulse Module linked-laser metadata hydrates from explicit linked equipment or an unambiguous same-location laser, and remains generic when the same-location laser fallback is ambiguous or absent.',
      'src/simulation/runner/__tests__/atlasHydration.05.hydrates-risc-emergency-coolant-system-critical-text-a.fragment.ts#L102-L320',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation critical-hit resolution tests prove represented RISC Laser Pulse Module criticals destroy the linked laser without synthesizing explosion damage.',
      'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L2121-L2191',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation session critical-event emission preserves represented linked critical weapon ids and names for RISC Laser Pulse Module replay.',
      'src/utils/gameplay/__tests__/damagePipeline.test.ts#L136-L176',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation runner tests prove represented RISC Laser Pulse Module criticals mark the linked laser destroyed without emitting AmmoExplosion damage, and ambiguous unlinked RISC module criticals stay generic without disabling a random laser.',
      'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L1418-L1547',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation replay tests prove represented RISC Laser Pulse Module linked-laser critical events do not record generic RISC module destruction.',
      'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L1913-L1952',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_RISC_LASER_PULSE_MODULE_INOPERABLE_LINKED_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEGAMEK_RISC_LASER_PULSE_MODULE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    explosiveEquipmentMekStationRef(
      'MekStation critical-hit resolution destroys only the RISC Laser Pulse Module when explicit linked-laser state points at an already destroyed weapon.',
      'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L2212-L2260',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation replay tests prove represented inoperable-linked RISC Laser Pulse Module critical events record generic module destruction without duplicating linked weapon destruction.',
      'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L2005-L2065',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_ARTEMIS_FCS_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ...MEGAMEK_ARTEMIS_FCS_SOURCE_REFS,
  explosiveEquipmentMekStationRef(
    'MekStation critical-hit resolution preserves linked launcher metadata on represented Artemis FCS equipment critical events.',
    'src/utils/gameplay/criticalHitResolution/slotEffectResolution.ts#L390-L405',
  ),
  explosiveEquipmentMekStationRef(
    'MekStation replay records destroyed Artemis FCS kind, location, and explicit linked launcher id when CriticalHitResolved carries it.',
    'src/utils/gameplay/gameState/criticalHitEquipmentState.ts#L94-L131',
  ),
  explosiveEquipmentMekStationRef(
    'MekStation runner snapshots remove Artemis IV, prototype Artemis IV, or Artemis V guidance from explicitly linked or same-location launchers after represented FCS critical destruction.',
    'src/simulation/runner/SimulationRunnerSupport.ts#L156-L263',
  ),
  explosiveEquipmentMekStationRef(
    'MekStation criticalHitEvents tests prove same-location destroyed Artemis FCS replay records destroyedArtemisFcs without treating Artemis-capable ammo as FCS.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L2897-L2948',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_HOT_LOADED_WEAPON_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_HOT_LOADED_WEAPON_CRITICAL_EFFECT_SOURCE_REFS,
  explosiveEquipmentMekStationRef(
    'MekStation critical slots with explicit hotLoaded state and positive explosionDamage resolve as weapon or equipment AmmoExplosion critical effects.',
    'src/utils/gameplay/criticalHitResolution/slotEffectResolution.ts#L79-L241',
  ),
  explosiveEquipmentMekStationRef(
    'MekStation unit hydration maps source equipment HotLoad mode plus explicit positive explosionDamage into hotLoaded weapon critical slots, and refuses mode-only or duplicate-mount inference.',
    'src/simulation/runner/__tests__/atlasHydration.04.hydrates-extended-fuel-tank-critical-text-as-secondary.fragment.ts#L155-L322',
  ),
  explosiveEquipmentMekStationRef(
    'MekStation critical-hit resolution tests prove explicit hotLoaded weapon criticals explode and hot-loaded names without explosionDamage do not synthesize damage.',
    'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L1948-L2050',
  ),
  explosiveEquipmentMekStationRef(
    'MekStation runner critical explosion handling cascades explicit hot-loaded weapon explosion damage through AmmoExplosion and DamageApplied events.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L782-L865',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_PROTOTYPE_IMPROVED_JUMP_JET_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEGAMEK_PROTOTYPE_IMPROVED_JUMP_JET_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    explosiveEquipmentMekStationRef(
      'MekStation critical-slot hydration maps Prototype Improved Jump Jet text before the generic jump-jet classifier and attaches the represented 10-point secondary-effect-gated explosion metadata.',
      'src/simulation/runner/UnitHydration.ts#L1609-L1613',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation hydration tests prove ISPrototypeImprovedJumpJet critical text hydrates as equipment with represented 10-point secondary-effect-gated explosion metadata.',
      'src/simulation/runner/__tests__/atlasHydration.03.normalizes-double-heat-sink-catalog-strings-for-runner.fragment.ts#L314-L339',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation critical slots with represented equipment explosion damage resolve as equipment AmmoExplosion critical effects.',
      'src/utils/gameplay/criticalHitResolution/slotEffectResolution.ts#L299-L315',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation runner critical explosion handling cascades represented equipment explosion damage through AmmoExplosion and DamageApplied events.',
      'src/simulation/runner/phases/weaponAttackAmmoExplosions.ts#L53-L287',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation critical-hit resolution tests prove represented Prototype Improved Jump Jet criticals explode only when secondary effects are enabled.',
      'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L2033-L2090',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation runner tests prove represented Prototype Improved Jump Jet criticals emit 10-point equipment explosion payloads and cascade damage without claiming generic explosive-equipment parity.',
      'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L803-L876',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_REPRESENTED_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEKSTATION_PROTOTYPE_IMPROVED_JUMP_JET_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ...MEKSTATION_EXTENDED_FUEL_TANK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ...MEKSTATION_BLUE_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    explosiveEquipmentMekStationRef(
      'MekStation critical-slot hydration carries exact single same-location source equipment entries with explicit positive explosionDamage into generic equipment critical slots, while name-only and duplicate metadata stay non-explosive.',
      'src/simulation/runner/UnitHydration.ts#L1843-L2049',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation hydration tests prove generic equipment explosion damage comes only from explicit source metadata and is not synthesized from names or duplicate source entries.',
      'src/simulation/runner/__tests__/atlasHydration.05.hydrates-risc-emergency-coolant-system-critical-text-a.fragment.ts#L31-L100',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation critical-hit resolution consumes only represented equipment explosionDamage payloads instead of deriving generic explosive equipment damage from names.',
      'src/utils/gameplay/criticalHitResolution/slotEffectResolution.ts#L299-L315',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation runner critical explosion handling cascades represented equipment explosion damage through AmmoExplosion and DamageApplied events.',
      'src/simulation/runner/phases/weaponAttackAmmoExplosions.ts#L53-L287',
    ),
    explosiveEquipmentMekStationRef(
      'MekStation runner tests prove represented equipment explosion payloads emit equipment AmmoExplosion events without ammo-bin fallback fields.',
      'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L723-L876',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];
