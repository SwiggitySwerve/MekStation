import {
  megamekSourceRef as edgeMegamekRef,
  type ICombatFeatureSourceReference,
} from './CombatFeatureSourceReference';
import { remappedMekStationDeviationSourceRef as edgeMekStationRef } from './CombatRemappedSourceReference';

export const MEGAMEK_EDGE_TRIGGER_SOURCE_REFS = [
  edgeMegamekRef(
    'MegaMek PilotOptions registers Edge as a point pool plus trigger-specific Mek and aerospace Edge options.',
    'megamek/src/megamek/common/options/PilotOptions.java#L123-L154',
  ),
  edgeMegamekRef(
    'MegaMek OptionsConstants defines Edge and the Mek trigger option ids for head hits, TACs, KO checks, explosions, and MASC failures.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L236-L243',
  ),
  edgeMegamekRef(
    'MegaMek Crew.hasEdgeRemaining and decreaseEdge consume the Edge point pool through OptionsConstants.EDGE.',
    'megamek/src/megamek/common/units/Crew.java#L986-L993',
  ),
  edgeMegamekRef(
    'MegaMek Mek hit-location resolution consumes Edge for TAC and head-hit rerolls when the corresponding trigger option is enabled.',
    'megamek/src/megamek/common/units/Mek.java#L1945-L1963',
  ),
  edgeMegamekRef(
    'MegaMek TWGameManager consumes EDGE_WHEN_KO to reroll failed BattleMech crew knockout checks while Edge remains available.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L17263-L17280',
  ),
  edgeMegamekRef(
    'MegaMek TWGameManager consumes EDGE_WHEN_EXPLOSION to reroll explosive equipment critical slots when another hittable critical slot exists.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L21772-L21783',
  ),
  edgeMegamekRef(
    'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed MASC checks, spends Edge, and suppresses failure processing when the reroll passes.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L5944-L5974',
  ),
  edgeMegamekRef(
    'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed Supercharger checks, spends Edge, and suppresses failure processing when the reroll passes.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L5994-L6024',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_EDGE_HEAD_HIT_SOURCE_REFS = [
  edgeMekStationRef(
    'MekStation hit-location resolution selects edge_when_headhit for BattleMech head hits, spends represented Edge, and returns superseded/final location metadata.',
    'src/utils/gameplay/hitLocation.ts#L215-L219',
  ),
  edgeMekStationRef(
    'MekStation resolveWeaponHit passes target Edge state into hit-location resolution, persists remaining Edge points, and emits Edge reroll metadata on AttackResolved.',
    'src/simulation/runner/phases/weaponAttackHitResolution.ts#L119-L294',
  ),
  edgeMekStationRef(
    'MekStation runner weapon-hit tests prove edge_when_headhit replaces a head hit, spends target Edge, preserves the head armor, and damages the replacement location.',
    'src/simulation/runner/phases/__tests__/weaponAttackPartialCover.test.ts#L269-L295',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_EDGE_TAC_SOURCE_REFS = [
  edgeMekStationRef(
    'MekStation hit-location resolution selects edge_when_tac for BattleMech natural-2 hit-location rolls, spends represented Edge, and returns superseded/final location metadata.',
    'src/utils/gameplay/hitLocation.ts#L220-L266',
  ),
  edgeMekStationRef(
    'MekStation resolveWeaponHit emits Edge reroll metadata before critical-hit processing so edge_when_tac can replace the TAC location before damage resolution.',
    'src/simulation/runner/phases/weaponAttackHitResolution.ts#L253-L294',
  ),
  edgeMekStationRef(
    'MekStation runner weapon-hit tests prove edge_when_tac replaces a TAC hit-location result before damage, spends target Edge, and damages the replacement location.',
    'src/simulation/runner/phases/__tests__/weaponAttackPartialCover.test.ts#L297-L323',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_EDGE_EXPLOSION_SOURCE_REFS = [
  edgeMekStationRef(
    'MekStation critical-slot selection consumes edge_when_explosion to spend represented Edge and redirect explosive ammo critical-slot hits when another hittable slot exists.',
    'src/utils/gameplay/criticalHitResolution/selection.ts#L93-L141',
  ),
  edgeMekStationRef(
    'MekStation critical-hit resolution carries remaining Edge points through repeated critical-slot selection and returns the final Edge total to callers.',
    'src/utils/gameplay/criticalHitResolution/resolver.ts#L304-L360',
  ),
  edgeMekStationRef(
    'MekStation critical-hit tests prove edge_when_explosion avoids an ammo critical when another slot is hittable and does not spend Edge without the trigger or alternate slot.',
    'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L1354-L1465',
  ),
  edgeMekStationRef(
    'MekStation runner critical-hit event tests prove edge_when_explosion avoids a crit-induced ammo explosion through resolveWeaponHit.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L718-L760',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_EDGE_MASC_SUPERCHARGER_SOURCE_REFS = [
  edgeMekStationRef(
    'MekStation psrEdgeRerolls consumes edge_when_masc_fails to reroll failed MASCFailure and SuperchargerFailure PSRs before applying fall or booster-failure aftermath.',
    'src/simulation/runner/phases/psrEdgeRerolls.ts#L23-L193',
  ),
  edgeMekStationRef(
    'MekStation runner PSR tests prove edge_when_masc_fails rerolls failed MASC and Supercharger checks, spends Edge, and suppresses fall, critical-hit, and destruction aftermath when the reroll passes.',
    'src/simulation/runner/__tests__/psrPhase.behavior.05.test.ts#L53-L108',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_EDGE_KO_SOURCE_REFS = [
  edgeMekStationRef(
    'MekStation resolvePilotConsciousnessCheck consumes edge_when_ko to reroll failed BattleMech consciousness checks and returns superseded/final roll plus remaining Edge metadata.',
    'src/utils/gameplay/damage/pilot.ts#L19-L153',
  ),
  edgeMekStationRef(
    'MekStation pilot consciousness tests prove edge_when_ko rerolls failed consciousness checks, spends represented Edge, and does not spend generic Edge or passing checks.',
    'src/utils/gameplay/damage/__tests__/pilotConsciousness.test.ts#L118-L199',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS = [
  edgeMekStationRef(
    'MekStation EDGE_TRIGGERS mirrors the known Edge trigger ids, partitions represented BattleMech triggers from out-of-scope aerospace triggers, deriveEdgePointCountFromPilotAbilities models the generic Edge point producer, and createEdgeState/canUseEdge/useEdge model trigger point consumption.',
    'src/utils/gameplay/spaModifiers/edgeTriggers.ts#L8-L151',
  ),
  edgeMekStationRef(
    'MekStation UnitHydration copies source-backed fullUnit abilities into IUnitGameState and derives edgePointsRemaining from explicit Edge point state or the generic edge ability without treating trigger-only Edge ids as point producers.',
    'src/simulation/runner/UnitHydration.ts#L209-L238',
  ),
  edgeMekStationRef(
    'MekStation createHydratedUnitState seeds hydrated abilities and Edge point state into BattleMech combat state.',
    'src/simulation/runner/UnitHydration.ts#L2132-L2148',
  ),
  edgeMekStationRef(
    'MekStation GameCreated synthesis copies hydrated abilities and Edge point state into seed payloads so replay initialization preserves represented Edge state.',
    'src/simulation/runner/SimulationRunnerState.ts#L269-L284',
  ),
  edgeMekStationRef(
    'MekStation hydration tests prove explicit Edge points, generic edge point production, trigger-only non-production, combat-state hydration, and GameCreated seed payload preservation.',
    'src/simulation/runner/__tests__/atlasHydration.03.normalizes-double-heat-sink-catalog-strings-for-runner.fragment.ts#L22-L65',
  ),
  edgeMekStationRef(
    'MekStation GameCreated tests prove hydrated pilot abilities and generic Edge points seed both initial runner state and replay GameCreated units.',
    'src/simulation/runner/__tests__/SimulationRunner.gameCreated.test.ts#L322-L369',
  ),
  ...MEKSTATION_EDGE_HEAD_HIT_SOURCE_REFS,
  ...MEKSTATION_EDGE_TAC_SOURCE_REFS,
  ...MEKSTATION_EDGE_MASC_SUPERCHARGER_SOURCE_REFS,
  ...MEKSTATION_EDGE_KO_SOURCE_REFS,
  ...MEKSTATION_EDGE_EXPLOSION_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];
