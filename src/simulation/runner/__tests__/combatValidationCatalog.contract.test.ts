import type {
  CombatValidationCatalogSection,
  CombatValidationSupportMap,
} from '../CombatValidationCatalog';

import { BATTLEMECH_COMBAT_VALIDATION_CATALOG } from '../CombatValidationCatalog';

function sortedKeys(record: Record<string, unknown>): readonly string[] {
  return Object.keys(record).sort();
}

function catalogMaps(): readonly {
  readonly sectionId: string;
  readonly mapId: string;
  readonly support: CombatValidationSupportMap;
}[] {
  const rows: {
    sectionId: string;
    mapId: string;
    support: CombatValidationSupportMap;
  }[] = [];

  for (const [sectionId, section] of Object.entries(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG,
  ) as readonly [string, CombatValidationCatalogSection][]) {
    for (const [mapId, support] of Object.entries(section)) {
      rows.push({ sectionId, mapId, support });
    }
  }

  return rows;
}

function supportIds(support: CombatValidationSupportMap): readonly string[] {
  return Object.values(support)
    .map((entry) => entry.id)
    .sort();
}

describe('BattleMech combat validation catalog index', () => {
  it('indexes every catalog lane under one authoritative section map', () => {
    expect(sortedKeys(BATTLEMECH_COMBAT_VALIDATION_CATALOG)).toEqual([
      'actions',
      'damageAndDeath',
      'eventStream',
      'featureSupport',
      'invalidation',
      'lifecycleAndPsr',
      'parityAndIntegration',
      'pilotSkills',
      'ruleSupport',
      'validationScope',
    ]);

    expect(
      Object.values(BATTLEMECH_COMBAT_VALIDATION_CATALOG).every(
        (section) => sortedKeys(section).length > 0,
      ),
    ).toBe(true);
  });

  it('requires every indexed support entry to carry evidence and explicit gaps when not integrated', () => {
    const missingEvidenceOrGap = catalogMaps().flatMap(
      ({ sectionId, mapId, support }) =>
        Object.values(support)
          .filter(
            (entry) =>
              entry.evidence.length === 0 ||
              (entry.level !== 'integrated' &&
                (entry.gap === undefined || entry.gap.length === 0)),
          )
          .map((entry) => `${sectionId}.${mapId}.${entry.id}`),
    );

    expect(missingEvidenceOrGap).toEqual([]);
  });

  it('keeps representative must-cover requirements discoverable from the aggregate catalog', () => {
    const allIds = new Set(
      catalogMaps().flatMap(({ support }) => supportIds(support)),
    );

    expect(Array.from(allIds).sort()).toEqual(
      expect.arrayContaining([
        'movement.walk',
        'weapon.fire-volley',
        'attack_declared',
        'attack_invalid',
        'physical_attack_resolved',
        'unit_ejected',
        'motive_damaged',
        'physical.charge',
        'physical.push',
        'shared.displacement-elevation-cap',
        'push.destination-open',
        'push.attacker-is-mek',
        'push.target-is-mek',
        'push.both-arms-present',
        'push.target-directly-ahead',
        'push.no-arm-weapons-fired',
        'utility.withdraw-control',
        'physical.sword',
        'physical.mace',
        'physical.lance',
        'physical.retractable-blade',
        'charge.requires-run',
        'charge.target-mek-standing',
        'dfa.requires-jump',
        'dfa.target-not-inside-building',
        'confirmHeat',
        'OutOfRange',
        'no-heat-spent',
        'battlemech-compatible-ammo',
        'battlemech-ammo-missing-compatible-weapon-refs',
        'ultra-ac',
        'mml',
        'mml-variable-damage',
        'mml-srm-lrm-ammo-compatibility',
        'ams-interception-events',
        'ams-single-missile-parity',
        'tag-intent-wire-state-replay',
        'gunnery',
        'terrain-movement-costs',
        'MASC',
        'Supercharger',
        'Triple-Strength Myomer',
        'Partial Wing',
        'tsm',
        'underwater',
        'weapon-heat',
        'armor-damage',
        'heat_sink',
        'jump_jet',
        'weapon',
        'ammo',
        'equipment',
        'pilot-death',
        'ejection-damage-preservation',
        'phase-psr-queue-lifecycle',
        'ranged-gunnery-to-hit',
        'ranged-to-hit-calculation',
        'ranged-to-hit-state-hydration',
        'psr-spa-application',
        'edge_when_tac',
        'rugged_1',
        'campaign-quirk-behavior',
        'protected_actuators',
        'critical-prevention-application',
        'anti-mek-actuator-application',
        'campaign-maintenance-application',
        'known-limitation-bypass',
        'official-ranged-weapons',
        'spa-quirk-resolver-application',
        'forward_observer',
        'oblique_artillery',
        'non-battlemech-combat-system-split',
        'smoke',
        'rubble',
        'fire',
      ]),
    );
  });
});
