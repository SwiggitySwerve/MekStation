import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

const MEGAMEK_DAMAGE_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
const MEKSTATION_SOURCE_VERSION = 'MekStation working-tree';

function megaMekRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_DAMAGE_SOURCE_VERSION}/${pathWithLines}`,
    sourceVersion: MEGAMEK_DAMAGE_SOURCE_VERSION,
  };
}

function mekstationRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'mekstation-deviation',
    citation,
    url: pathWithLines,
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  };
}

export const BATTLEMECH_MANUAL_DAMAGE_SOURCE_REFS = [
  {
    kind: 'rulebook',
    citation:
      'BattleMech Manual core damage rules anchor BattleMech armor, internal structure, head-hit, transfer, and destruction resolution.',
    url: 'https://battletech.com/wp-content/uploads/2025/06/78_BattleMech-Manual-2023-09-17-v7.01-3.pdf',
    sourceVersion: 'BattleMech Manual Errata v7.01',
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_BATTLEMECH_DAMAGE_SOURCE_REFS = [
  megaMekRef(
    'MegaMek TWDamageManagerModular routes BattleMech damage through armor, internal structure, transfer, head destruction, and location destruction handling.',
    'megamek/src/megamek/server/totalWarfare/TWDamageManagerModular.java#L775-L1050',
  ),
  megaMekRef(
    'MegaMek Mek armor accessors distinguish front and rear armor locations during BattleMech damage application.',
    'megamek/src/megamek/common/units/Mek.java#L1759-L1801',
  ),
  megaMekRef(
    'MegaMek Entity.destroyLocation destroys dependent locations and mounted equipment when a location is destroyed.',
    'megamek/src/megamek/common/units/Entity.java#L11849-L11943',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_DAMAGE_RESOLUTION_SOURCE_REFS = [
  mekstationRef(
    'MekStation resolveDamage caps head hits, applies head-hit pilot damage, resolves critical hits, and finalizes destruction state.',
    'src/utils/gameplay/damage/resolve.ts#L34-L213',
  ),
  mekstationRef(
    'MekStation applyDamageToLocation and applyDamageWithTransfer apply armor, rear armor, structure, transfer, and side-torso arm cascades.',
    'src/utils/gameplay/damage/location.ts#L20-L174',
  ),
  mekstationRef(
    'MekStation applyDamageResultToState persists armor, rear armor, structure, destroyed locations, pilot state, component damage, and destruction cause onto runner unit state.',
    'src/simulation/runner/SimulationRunnerState.ts#L521-L621',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_DAMAGE_EVENT_SOURCE_REFS = [
  mekstationRef(
    'MekStation emitDamageChainEvents emits DamageApplied, LocationDestroyed, cascaded arm LocationDestroyed, and TransferDamage events from damage resolver output.',
    'src/simulation/runner/phases/weaponAttackHitResolution.helpers.ts#L182-L303',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_HEAT_AMMO_EXPLOSION_DAMAGE_SOURCE_REFS = [
  mekstationRef(
    'MekStation runner heat cookoffs empty the selected ammo bin, apply CASE-adjusted internal damage, emit damage/transfer/destruction events, and mark fatal cascades as ammo_explosion.',
    'src/simulation/runner/phases/heatAmmoExplosions.ts#L150-L288',
  ),
  mekstationRef(
    'MekStation crit-induced ammo explosions share the same internal-only cascade, CASE adjustment, pilot damage, and ammo_explosion cause propagation.',
    'src/simulation/runner/phases/weaponAttackAmmoExplosions.ts#L47-L265',
  ),
  mekstationRef(
    'MekStation event-sourced heat resolution routes heat ammo cookoff through the same damage, pilot-hit, and destruction event contracts.',
    'src/utils/gameplay/gameSessionHeat.ts#L657-L1156',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_DESTRUCTION_CAUSE_SOURCE_REFS = [
  mekstationRef(
    'MekStation checkUnitDestruction prioritizes existing destruction cause, pilot death, head destruction, and center-torso destruction.',
    'src/utils/gameplay/damage/destruction.ts#L17-L43',
  ),
  mekstationRef(
    'MekStation finalizeDamageResolution maps critical engine destruction and pilot death into canonical damage result causes.',
    'src/utils/gameplay/damage/resolve.ts#L137-L174',
  ),
  mekstationRef(
    'MekStation emitUnitDestroyedEvent emits canonical UnitDestroyed causes from critical or damage resolution output.',
    'src/simulation/runner/phases/weaponAttackHitResolution.helpers.ts#L360-L407',
  ),
  mekstationRef(
    'MekStation applyDamageResultToState preserves canonical destructionCause on IUnitGameState snapshots.',
    'src/simulation/runner/SimulationRunnerState.ts#L596-L621',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_PILOT_DAMAGE_SOURCE_REFS = [
  mekstationRef(
    'MekStation applyPilotDamage applies pilot wounds, consciousness checks, unconsciousness, pilot death, and destructionCause=pilot_death.',
    'src/utils/gameplay/damage/pilot.ts#L17-L104',
  ),
  mekstationRef(
    'MekStation resolveDamage applies one pilot wound for damaging head hits before final destruction checks.',
    'src/utils/gameplay/damage/resolve.ts#L53-L62',
  ),
  mekstationRef(
    'MekStation emitHeadHitPilotEvent emits PilotHit source=head_hit unless a cockpit critical already emitted the pilot hit.',
    'src/simulation/runner/phases/weaponAttackHitResolution.helpers.ts#L312-L349',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_COCKPIT_CRIT_PILOT_DEATH_SOURCE_REFS = [
  mekstationRef(
    'MekStation applyCockpitHit emits lethal pilot_hit plus unit_destroyed cause=pilot_death critical events.',
    'src/utils/gameplay/criticalHitResolution/engineEffects.ts#L92-L124',
  ),
  mekstationRef(
    'MekStation weaponAttackHelpers converts cockpit critical pilot_hit and unit_destroyed events into runner PilotHit and UnitDestroyed payloads.',
    'src/simulation/runner/phases/weaponAttackHelpers.ts#L360-L407',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_HEAT_PILOT_DAMAGE_SOURCE_REFS = [
  mekstationRef(
    'MekStation heat constants define default life-support heat damage and optional MaxTech high-heat pilot-damage avoid target numbers.',
    'src/constants/heat.ts#L221-L260',
  ),
  mekstationRef(
    'MekStation runner heat pilot-damage handling emits PilotHit source=heat and UnitDestroyed cause=pilot_death when heat wounds become lethal.',
    'src/simulation/runner/phases/heatPilotDamage.ts#L31-L122',
  ),
  mekstationRef(
    'MekStation event-sourced heat resolution applies default and optional MaxTech heat pilot damage into PilotHit and unit destruction state.',
    'src/utils/gameplay/gameSessionHeat.ts#L1083-L1135',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_MAXTECH_HEAT_CRITICAL_SOURCE_REFS = [
  mekstationRef(
    'MekStation heat constants define optional MaxTech heat-scale critical-damage avoid target numbers at heat 36+ and 44+.',
    'src/constants/heat.ts#L263-L278',
  ),
  mekstationRef(
    'MekStation resolveMaxTechHeatCriticalDamage rolls optional heat critical damage and routes failed avoids into the critical-hit resolver.',
    'src/utils/gameplay/heatCriticalDamage.ts#L47-L117',
  ),
  mekstationRef(
    'MekStation runner heat critical-damage handling emits CriticalHit, CriticalHitResolved, ComponentDestroyed, PSRTriggered, PilotHit, and UnitDestroyed events.',
    'src/simulation/runner/phases/heatCriticalDamage.ts#L91-L210',
  ),
  mekstationRef(
    'MekStation event-sourced heat resolution applies optional MaxTech heat critical damage through the same critical and terminal event path.',
    'src/utils/gameplay/gameSessionHeat.ts#L1146-L1163',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
