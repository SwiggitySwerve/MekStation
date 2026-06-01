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

export const MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation EDGE_TRIGGERS mirrors the known Edge trigger ids and createEdgeState/canUseEdge/useEdge model generic trigger point consumption.',
    'src/utils/gameplay/spaModifiers/edgeTriggers.ts#L11-L93',
  ),
  mekstationDeviationRef(
    'MekStation psrEdgeRerolls consumes edge_when_masc_fails to reroll failed MASCFailure and SuperchargerFailure PSRs before applying fall or booster-failure aftermath.',
    'src/simulation/runner/phases/psrEdgeRerolls.ts#L23-L193',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
