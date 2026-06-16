import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

const MEGAMEK_EDGE_SOURCE_VERSION = '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

function megamekRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_EDGE_SOURCE_VERSION}/${pathWithLines}`,
    sourceVersion: MEGAMEK_EDGE_SOURCE_VERSION,
  };
}

function mekstationDeviationRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'mekstation-deviation',
    citation,
    url: pathWithLines,
    sourceVersion: 'MekStation working-tree',
  };
}

export const MEGAMEK_EDGE_TRIGGER_SOURCE_REFS = [
  megamekRef(
    'MegaMek PilotOptions registers Edge as a point pool plus trigger-specific Mek and aerospace Edge options.',
    'megamek/src/megamek/common/options/PilotOptions.java#L123-L154',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines Edge and the Mek trigger option ids for head hits, TACs, KO checks, explosions, and MASC failures.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L236-L243',
  ),
  megamekRef(
    'MegaMek Crew.hasEdgeRemaining and decreaseEdge consume the Edge point pool through OptionsConstants.EDGE.',
    'megamek/src/megamek/common/units/Crew.java#L986-L993',
  ),
  megamekRef(
    'MegaMek Mek hit-location resolution consumes Edge for TAC and head-hit rerolls when the corresponding trigger option is enabled.',
    'megamek/src/megamek/common/units/Mek.java#L1945-L1963',
  ),
  megamekRef(
    'MegaMek TWGameManager consumes EDGE_WHEN_KO to reroll failed BattleMech crew knockout checks while Edge remains available.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L17263-L17280',
  ),
  megamekRef(
    'MegaMek TWGameManager consumes EDGE_WHEN_EXPLOSION to reroll explosive equipment critical slots when another hittable critical slot exists.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L21772-L21783',
  ),
  megamekRef(
    'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed MASC checks, spends Edge, and suppresses failure processing when the reroll passes.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L5944-L5974',
  ),
  megamekRef(
    'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed Supercharger checks, spends Edge, and suppresses failure processing when the reroll passes.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L5994-L6024',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_EDGE_HEAD_HIT_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation hit-location resolution selects edge_when_headhit for BattleMech head hits, spends represented Edge, and returns superseded/final location metadata.',
    'src/utils/gameplay/hitLocation.ts#L215-L219',
  ),
  mekstationDeviationRef(
    'MekStation resolveWeaponHit passes target Edge state into hit-location resolution, persists remaining Edge points, and emits Edge reroll metadata on AttackResolved.',
    'src/simulation/runner/phases/weaponAttackHitResolution.ts#L157-L180',
  ),
  mekstationDeviationRef(
    'MekStation runner weapon-hit tests prove edge_when_headhit replaces a head hit, spends target Edge, preserves the head armor, and damages the replacement location.',
    'src/simulation/runner/phases/__tests__/weaponAttackPartialCover.test.ts#L284-L309',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_EDGE_TAC_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation hit-location resolution selects edge_when_tac for BattleMech natural-2 hit-location rolls, spends represented Edge, and returns superseded/final location metadata.',
    'src/utils/gameplay/hitLocation.ts#L220-L266',
  ),
  mekstationDeviationRef(
    'MekStation resolveWeaponHit emits Edge reroll metadata before critical-hit processing so edge_when_tac can replace the TAC location before damage resolution.',
    'src/simulation/runner/phases/weaponAttackHitResolution.ts#L508-L524',
  ),
  mekstationDeviationRef(
    'MekStation runner weapon-hit tests prove edge_when_tac replaces a TAC hit-location result before damage, spends target Edge, and damages the replacement location.',
    'src/simulation/runner/phases/__tests__/weaponAttackPartialCover.test.ts#L312-L337',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_EDGE_EXPLOSION_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation critical-slot selection consumes edge_when_explosion to spend represented Edge and redirect explosive ammo critical-slot hits when another hittable slot exists.',
    'src/utils/gameplay/criticalHitResolution/selection.ts#L93-L141',
  ),
  mekstationDeviationRef(
    'MekStation critical-hit resolution carries remaining Edge points through repeated critical-slot selection and returns the final Edge total to callers.',
    'src/utils/gameplay/criticalHitResolution/resolver.ts#L160-L235',
  ),
  mekstationDeviationRef(
    'MekStation critical-hit tests prove edge_when_explosion avoids an ammo critical when another slot is hittable and does not spend Edge without the trigger or alternate slot.',
    'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L1354-L1465',
  ),
  mekstationDeviationRef(
    'MekStation runner critical-hit event tests prove edge_when_explosion avoids a crit-induced ammo explosion through resolveWeaponHit.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L718-L760',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_EDGE_MASC_SUPERCHARGER_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation psrEdgeRerolls consumes edge_when_masc_fails to reroll failed MASCFailure and SuperchargerFailure PSRs before applying fall or booster-failure aftermath.',
    'src/simulation/runner/phases/psrEdgeRerolls.ts#L23-L193',
  ),
  mekstationDeviationRef(
    'MekStation runner PSR tests prove edge_when_masc_fails rerolls failed MASC and Supercharger checks, spends Edge, and suppresses fall, critical-hit, and destruction aftermath when the reroll passes.',
    'src/simulation/runner/__tests__/psrPhase.behavior.test.ts#L864-L923',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_EDGE_KO_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation resolvePilotConsciousnessCheck consumes edge_when_ko to reroll failed BattleMech consciousness checks and returns superseded/final roll plus remaining Edge metadata.',
    'src/utils/gameplay/damage/pilot.ts#L19-L153',
  ),
  mekstationDeviationRef(
    'MekStation pilot consciousness tests prove edge_when_ko rerolls failed consciousness checks, spends represented Edge, and does not spend generic Edge or passing checks.',
    'src/utils/gameplay/damage/__tests__/pilotConsciousness.test.ts#L118-L199',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation EDGE_TRIGGERS mirrors the known Edge trigger ids, partitions represented BattleMech triggers from out-of-scope aerospace triggers, deriveEdgePointCountFromPilotAbilities models the generic Edge point producer, and createEdgeState/canUseEdge/useEdge model trigger point consumption.',
    'src/utils/gameplay/spaModifiers/edgeTriggers.ts#L8-L151',
  ),
  mekstationDeviationRef(
    'MekStation UnitHydration copies source-backed fullUnit abilities into IUnitGameState and derives edgePointsRemaining from explicit Edge point state or the generic edge ability without treating trigger-only Edge ids as point producers.',
    'src/simulation/runner/UnitHydration.ts#L209-L238',
  ),
  mekstationDeviationRef(
    'MekStation createHydratedUnitState seeds hydrated abilities and Edge point state into BattleMech combat state.',
    'src/simulation/runner/UnitHydration.ts#L2132-L2148',
  ),
  mekstationDeviationRef(
    'MekStation GameCreated synthesis copies hydrated abilities and Edge point state into seed payloads so replay initialization preserves represented Edge state.',
    'src/simulation/runner/SimulationRunnerState.ts#L269-L284',
  ),
  mekstationDeviationRef(
    'MekStation hydration tests prove explicit Edge points, generic edge point production, trigger-only non-production, combat-state hydration, and GameCreated seed payload preservation.',
    'src/simulation/runner/__tests__/atlasHydration.test.ts#L564-L612',
  ),
  mekstationDeviationRef(
    'MekStation GameCreated tests prove hydrated pilot abilities and generic Edge points seed both initial runner state and replay GameCreated units.',
    'src/simulation/runner/__tests__/SimulationRunner.gameCreated.test.ts#L322-L369',
  ),
  ...MEKSTATION_EDGE_HEAD_HIT_SOURCE_REFS,
  ...MEKSTATION_EDGE_TAC_SOURCE_REFS,
  ...MEKSTATION_EDGE_MASC_SUPERCHARGER_SOURCE_REFS,
  ...MEKSTATION_EDGE_KO_SOURCE_REFS,
  ...MEKSTATION_EDGE_EXPLOSION_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];
