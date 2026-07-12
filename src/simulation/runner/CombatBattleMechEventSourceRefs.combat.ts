import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

import { remappedMekStationDeviationSourceRef as mekstationDeviationSourceRef } from './CombatRemappedSourceReference';

export const BATTLEMECH_RANGED_ATTACK_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation combat event factories create AttackDeclared, AttackLocked, AttackResolved, and AttackInvalid payloads.',
    'src/utils/gameplay/gameEvents/combat.ts',
    'L22-L353',
  ),
  mekstationDeviationSourceRef(
    'MekStation session core appends AttackDeclared, indirect-fire marker events, and AttackLocked events.',
    'src/utils/gameplay/gameSessionCore.ts',
    'L564-L639',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner weapon attack phase emits AttackInvalid, AttackDeclared, AttackResolved, AmmoConsumed, AMSInterception, and special marker events.',
    'src/simulation/runner/phases/weaponAttack.ts',
    'L395-L1320',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner hit resolution emits AttackResolved and follows with damage, ammo, and marker event side effects.',
    'src/simulation/runner/phases/weaponAttackHitResolution.ts',
    'L58-L306',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner hit early-return helpers emit zero-projectile, partial-cover leg-miss, designator marker, and plasma-cannon AttackResolved side effects before normal damage resolution.',
    'src/simulation/runner/phases/weaponAttackHitResolutionEarlyReturns.ts',
    'L76-L353',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLEMECH_INDIRECT_FIRE_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation combat event factories create IndirectFireSpotterSelected, IndirectFireNarcOverride, IndirectFireForwardObserver, and IndirectFireSpotterLost payloads.',
    'src/utils/gameplay/gameEvents/combatIndirectFire.ts',
    'L27-L346',
  ),
  mekstationDeviationSourceRef(
    'MekStation session core appends indirect-fire NARC override, spotter selection, and Forward Observer events during declaration.',
    'src/utils/gameplay/gameSessionCore.ts',
    'L596-L630',
  ),
  mekstationDeviationSourceRef(
    'MekStation interactive attack resolution appends IndirectFireSpotterLost before the final AttackResolved event when a selected spotter is destroyed.',
    'src/utils/gameplay/gameSessionAttackResolution.ts',
    'L156-L217',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLEMECH_DAMAGE_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation combat event factories create DamageApplied, LocationDestroyed, TransferDamage, and ComponentDestroyed payloads.',
    'src/utils/gameplay/gameEvents/combatDamage.ts',
    'L19-L368',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner hit resolution emits AttackResolved, DamageApplied, LocationDestroyed, TransferDamage, CriticalHit, CriticalHitResolved, ComponentDestroyed, PSRTriggered, PilotHit, and UnitDestroyed chains.',
    'src/simulation/runner/phases/weaponAttackHitResolution.ts',
    'L188-L397',
  ),
  mekstationDeviationSourceRef(
    'MekStation interactive attack resolution emits damage, transfer, critical, PSR, pilot, and destruction events after valid hit resolution.',
    'src/utils/gameplay/gameSessionAttackResolution.ts',
    'L256-L474',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLEMECH_CRITICAL_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation status event factories create CriticalHitResolved payloads.',
    'src/utils/gameplay/gameEvents/statusCritical.ts',
    'L1-L331',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner critical-hit helper emits CriticalHit before CriticalHitResolved and ComponentDestroyed payloads.',
    'src/simulation/runner/phases/weaponAttackCriticalEvents.ts',
    'L46-L151',
  ),
  mekstationDeviationSourceRef(
    'MekStation heat critical damage path emits CriticalHit, CriticalHitResolved, ComponentDestroyed, PSRTriggered, PilotHit, and UnitDestroyed chains.',
    'src/simulation/runner/phases/heatCriticalDamage.ts',
    'L73-L278',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLEMECH_HEAT_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation heat event factories create HeatGenerated and HeatDissipated payloads.',
    'src/utils/gameplay/gameEvents/statusHeat.ts',
    'L1-L124',
  ),
  mekstationDeviationSourceRef(
    'MekStation lifecycle status event factories create PilotHit and UnitDestroyed payloads.',
    'src/utils/gameplay/gameEvents/statusLifecycle.ts',
    'L1-L166',
  ),
  mekstationDeviationSourceRef(
    'MekStation critical/ammo status event factories create AmmoExplosion payloads.',
    'src/utils/gameplay/gameEvents/statusCritical.ts',
    'L1-L331',
  ),
  mekstationDeviationSourceRef(
    'MekStation heat status-check factories create ShutdownCheck and StartupAttempt payloads.',
    'src/utils/gameplay/gameEvents/statusChecksHeat.ts',
    'L1-L132',
  ),
  mekstationDeviationSourceRef(
    'MekStation ammo status-check factory creates AmmoConsumed payloads.',
    'src/utils/gameplay/gameEvents/statusChecksAmmo.ts',
    'L1-L77',
  ),
  mekstationDeviationSourceRef(
    'MekStation PSR status-check factories create PSRTriggered payloads used by heat checks.',
    'src/utils/gameplay/gameEvents/statusChecksPsr.ts',
    'L1-L170',
  ),
  mekstationDeviationSourceRef(
    'MekStation interactive heat resolution appends heat generation, heat dissipation, startup, shutdown, ammo explosion, ammo consumption, PSR, pilot, and destruction events.',
    'src/utils/gameplay/gameSessionHeat.ts',
    'L345-L1013',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner heat threshold helper emits HeatEffectApplied events for Total Warfare heat thresholds.',
    'src/simulation/runner/phases/heatThresholdEvents.ts',
    'L1-L65',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLEMECH_PSR_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation PSR status-check factories create PSRTriggered and PSRResolved payloads.',
    'src/utils/gameplay/gameEvents/statusChecksPsr.ts',
    'L1-L170',
  ),
  mekstationDeviationSourceRef(
    'MekStation unit-state status-check factories create UnitFell, UnitStuck, and UnitStood payloads.',
    'src/utils/gameplay/gameEvents/statusChecksUnitState.ts',
    'L1-L210',
  ),
  mekstationDeviationSourceRef(
    'MekStation interactive PSR resolver emits PSRResolved, UnitFell, UnitStuck, PilotHit, UnitDestroyed, and UnitStood paths.',
    'src/utils/gameplay/gameSessionPSRResolution.ts',
    'L54-L410',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner PSR event helpers emit PSRResolved, UnitFell, and fall-sourced PilotHit events.',
    'src/simulation/runner/phases/postCombatPsrEvents.ts',
    'L51-L132',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner PSR phase resolves queued PSRs, failed falls, failed bog-down stuck outcomes, and pilot-death UnitDestroyed events.',
    'src/simulation/runner/phases/postCombatPsr.ts',
    'L70-L230',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner heat lifecycle emits shutdown checks and queues shutdown PSRs after heat shutdown.',
    'src/simulation/runner/phases/postCombatHeatLifecycle.ts',
    'L97-L155',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner stand-up helper emits PSRTriggered, PSRResolved, and UnitStood events.',
    'src/simulation/runner/phases/movementStandUp.ts',
    'L33-L80',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLEMECH_PHYSICAL_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation physical event factories create PhysicalAttackDeclared and PhysicalAttackResolved payloads.',
    'src/utils/gameplay/gameEvents/statusPhysical.ts',
    'L1-L224',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner physical event helpers emit PhysicalAttackDeclared and PhysicalAttackResolved payloads.',
    'src/simulation/runner/phases/physicalAttackEvents.ts',
    'L17-L72',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner physical attack phase emits declarations, resolved hits/misses/rejections, displacement, fall, and PSR fallout events.',
    'src/simulation/runner/phases/physicalAttack.ts',
    'L448-L605',
  ),
  mekstationDeviationSourceRef(
    'MekStation interactive physical resolver emits PhysicalAttackResolved, DamageApplied, PSRTriggered, and UnitFell outcomes from PhysicalAttackDeclared records.',
    'src/utils/gameplay/gameSessionPhysical.ts',
    'L360-L1082',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLEMECH_SPECIAL_PROJECTILE_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation runner AMS helpers resolve cluster and single-missile interception payloads before AMSInterception emission.',
    'src/simulation/runner/phases/weaponAttackAMS.ts',
    'L69-L160',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner weapon attack phase converts AMS interception results into AMSInterception events.',
    'src/simulation/runner/phases/weaponAttack.ts',
    'L395-L475',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner designator marker helper emits DesignatorMarkerApplied events for NARC, iNARC, and TAG state mutations.',
    'src/simulation/runner/phases/weaponAttackDesignatorMarkers.ts',
    'L238-L269',
  ),
  mekstationDeviationSourceRef(
    'MekStation status replay reducer replays DesignatorMarkerApplied state onto targets.',
    'src/utils/gameplay/gameState/statusReplay.ts',
    'L102-L154',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
