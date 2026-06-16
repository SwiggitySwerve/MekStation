import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

const MEGAMEK_CONSCIOUSNESS_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

function megamekRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CONSCIOUSNESS_SOURCE_VERSION}/${pathWithLines}`,
    sourceVersion: MEGAMEK_CONSCIOUSNESS_SOURCE_VERSION,
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

export const MEGAMEK_CONSCIOUSNESS_TOUGHNESS_SOURCE_REFS = [
  megamekRef(
    'MegaMek TWGameManager lowers consciousness target numbers by numeric crew toughness only when the RPG Toughness game option is enabled, then adds +1 to Pain Resistance consciousness rolls.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L17233-L17250',
  ),
  megamekRef(
    'MegaMek TWGameManager adds +1 to Pain Resistance wake-up rolls.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L17310-L17325',
  ),
  megamekRef(
    'MegaMek TWGameManager reduces ammunition-explosion pilot damage by 1 for Pain Resistance or Iron Man.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L22820-L22831',
  ),
  megamekRef(
    'MegaMek PilotOptions registers Iron Man and Pain Resistance as distinct misc abilities.',
    'megamek/src/megamek/common/options/PilotOptions.java#L94-L103',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines MISC_IRON_MAN and MISC_PAIN_RESISTANCE as separate ability ids.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L211-L212',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines RPG_TOUGHNESS as a separate game-option id.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L539-L539',
  ),
  megamekRef(
    'MegaMek GameOptions registers RPG Toughness as a game option rather than a pilot SPA.',
    'megamek/src/megamek/common/options/GameOptions.java#L328-L328',
  ),
  megamekRef(
    'MegaMek Crew stores numeric toughness per crew slot for KO checks.',
    'megamek/src/megamek/common/units/Crew.java#L120-L121',
  ),
  megamekRef(
    'MegaMek Crew exposes numeric toughness accessors per crew slot.',
    'megamek/src/megamek/common/units/Crew.java#L1134-L1139',
  ),
  megamekRef(
    'MegaMek MULParser imports crew toughness only when RPG Toughness is enabled.',
    'megamek/src/megamek/common/loaders/MULParser.java#L1360-L1403',
  ),
  megamekRef(
    'MegaMek option text defines Pain Resistance as +1 consciousness rolls plus ammunition-explosion damage reduction.',
    'megamek/resources/megamek/common/options/messages.properties#L629-L630',
  ),
  megamekRef(
    'MegaMek option text defines Iron Man as ammunition-explosion pilot-hit reduction only.',
    'megamek/resources/megamek/common/options/messages.properties#L665-L666',
  ),
  megamekRef(
    'MegaMek option text defines RPG Toughness as a numeric pilot toughness bonus for consciousness check targets.',
    'megamek/resources/megamek/common/options/messages.properties#L565-L566',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_AMMO_EXPLOSION_PILOT_DAMAGE_SOURCE_REFS =
  MEGAMEK_CONSCIOUSNESS_TOUGHNESS_SOURCE_REFS.filter(
    ({ citation }) =>
      citation.includes('ammunition-explosion pilot damage') ||
      citation.includes('ammunition-explosion damage reduction') ||
      citation.includes('ammunition-explosion pilot-hit reduction') ||
      citation.includes('Iron Man and Pain Resistance') ||
      citation.includes('MISC_IRON_MAN and MISC_PAIN_RESISTANCE'),
  ) satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_CONSCIOUSNESS_TOUGHNESS_DEVIATION_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation getEffectiveWounds leaves pilot wounds unchanged so Pain Resistance no longer reduces ranged to-hit wound penalties.',
    'src/utils/gameplay/spaModifiers/abilityModifiers.ts#L315-L323',
  ),
  mekstationDeviationRef(
    'MekStation getConsciousnessCheckModifier applies source-backed Pain Resistance ids only; Iron Man, Iron Will, and Toughness do not lower consciousness target numbers.',
    'src/utils/gameplay/spaModifiers/catalog.ts#L411-L418',
  ),
  mekstationDeviationRef(
    'MekStation resolveBattleMechAmmoExplosionPilotDamage reduces ammo-explosion pilot damage only for source-backed Pain Resistance or Iron Man ids.',
    'src/utils/gameplay/ammoTracking/pilotDamage.ts#L15-L52',
  ),
  mekstationDeviationRef(
    'MekStation legacy aliases still collapse toughness into pain_resistance and iron-will into iron_man for generic canonicalization, so source-backed resolvers must bypass those aliases.',
    'src/lib/spa/catalog/legacyAliases.ts#L19-L123',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_RPG_TOUGHNESS_PREBATTLE_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation IPilot.rpgToughness carries explicit assigned-pilot RPG Toughness numeric state without inferring it from legacy ability aliases.',
    'src/types/pilot/PilotInterfaces.ts#L364-L368',
  ),
  mekstationDeviationRef(
    'MekStation force-assignment preBattleSessionBuilder maps explicit assigned-pilot rpgToughness into GameCreated pilotToughness seeds for combat state initialization.',
    'src/components/gameplay/pages/preBattleSessionBuilder.ts#L64-L128',
  ),
  mekstationDeviationRef(
    'MekStation skirmish preBattleSessionBuilder maps explicit RPG Toughness snapshots into GameCreated pilotToughness seeds for combat state initialization.',
    'src/utils/gameplay/preBattleSessionBuilder.ts#L53-L171',
  ),
  mekstationDeviationRef(
    'MekStation pre-battle skirmish launch copies assigned IPilot.rpgToughness into the skirmish pilot snapshot and preserves pilotToughness when creating engine game units.',
    'src/components/gameplay/pages/preBattle/usePreBattleSkirmish.ts#L77-L216',
  ),
  mekstationDeviationRef(
    'MekStation force-assignment pre-battle session tests prove numeric rpgToughness reaches session unit state and legacy toughness ability aliases do not imply pilotToughness.',
    'src/components/gameplay/pages/__tests__/preBattleSessionBuilder.test.ts#L289-L368',
  ),
  mekstationDeviationRef(
    'MekStation skirmish pre-battle session tests prove numeric RPG Toughness snapshots reach session unit state and non-finite values remain absent.',
    'src/utils/gameplay/__tests__/preBattleSessionBuilder.test.ts#L145-L184',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
