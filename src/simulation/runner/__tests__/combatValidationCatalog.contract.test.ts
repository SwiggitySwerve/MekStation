import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type {
  CombatValidationCatalogSection,
  CombatValidationSupportMap,
} from '../CombatValidationCatalog';
import type { ICombatCatalogTriadEvidence } from '../CombatValidationCatalogTriad';

import { BATTLEMECH_COMBAT_VALIDATION_CATALOG } from '../CombatValidationCatalog';
import { COMBAT_CATALOG_TRIAD_EVIDENCE } from '../CombatValidationCatalogTriad';

function sortedKeys(record: Record<string, unknown>): readonly string[] {
  return Object.keys(record).sort();
}

const VALID_SOURCE_KINDS = new Set([
  'rulebook',
  'megamek-source',
  'mekhq-behavior',
  'mekstation-deviation',
]);

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

function triadEvidenceMaps(): Readonly<
  Record<string, Record<string, ICombatCatalogTriadEvidence>>
> {
  return COMBAT_CATALOG_TRIAD_EVIDENCE;
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

  it('requires every catalog map to declare source-boundary and executable test evidence', () => {
    const triadMaps = triadEvidenceMaps();

    expect(sortedKeys(triadMaps)).toEqual(
      sortedKeys(BATTLEMECH_COMBAT_VALIDATION_CATALOG),
    );

    const catalogSections: Readonly<
      Record<string, CombatValidationCatalogSection>
    > = BATTLEMECH_COMBAT_VALIDATION_CATALOG;
    const sectionKeyFailures = Object.entries(catalogSections).flatMap(
      ([sectionId, section]) => {
        const triadSection = triadMaps[sectionId];

        return sortedKeys(triadSection ?? {}).join('|') ===
          sortedKeys(section).join('|')
          ? []
          : [
              `${sectionId}: expected ${sortedKeys(section).join(', ')}, got ${sortedKeys(triadSection ?? {}).join(', ')}`,
            ];
      },
    );

    const evidenceFailures = catalogMaps().flatMap(
      ({ sectionId, mapId, support }) => {
        const triad = triadMaps[sectionId]?.[mapId];
        if (triad === undefined)
          return [`${sectionId}.${mapId}: missing triad`];

        const supportEntries = Object.values(support);
        const hasIntegratedRows = supportEntries.some(
          (entry) => entry.level === 'integrated',
        );
        const refPrefix = `${sectionId}.${mapId}`;
        const failures: string[] = [];

        if (triad.authorityBoundary.rationale.trim().length === 0) {
          failures.push(`${refPrefix}: missing authority boundary rationale`);
        }

        if (hasIntegratedRows && triad.testRefs.length === 0) {
          failures.push(`${refPrefix}: missing executable test refs`);
        }

        triad.testRefs.forEach((testRef, testIndex) => {
          const testRefId = `${refPrefix}.testRefs[${testIndex}]`;
          if (testRef.file.trim().length === 0) {
            failures.push(`${testRefId}: missing file`);
          } else if (!existsSync(join(process.cwd(), testRef.file))) {
            failures.push(`${testRefId}: file does not exist ${testRef.file}`);
          }
          if (testRef.assertion.trim().length === 0) {
            failures.push(`${testRefId}: missing assertion`);
          }
        });

        if (triad.authorityBoundary.kind === 'entry-source-refs') {
          for (const entry of supportEntries) {
            const sourceRefs = entry.sourceRefs ?? [];

            if (sourceRefs.length === 0) {
              failures.push(
                `${refPrefix}.${entry.id}: entry-source-refs boundary requires row sourceRefs`,
              );
            }

            sourceRefs.forEach((sourceRef, sourceRefIndex) => {
              const sourceRefId = `${refPrefix}.${entry.id}.sourceRefs[${sourceRefIndex}]`;

              if (!VALID_SOURCE_KINDS.has(sourceRef.kind)) {
                failures.push(
                  `${sourceRefId}: invalid source kind ${sourceRef.kind}`,
                );
              }
              if (sourceRef.citation.trim().length === 0) {
                failures.push(`${sourceRefId}: missing citation`);
              }
              if (sourceRef.url.trim().length === 0) {
                failures.push(`${sourceRefId}: missing url`);
              }
              if (sourceRef.sourceVersion.trim().length === 0) {
                failures.push(`${sourceRefId}: missing sourceVersion`);
              }
              if (
                sourceRef.kind === 'megamek-source' &&
                (!sourceRef.url.includes('github.com/MegaMek/megamek/blob/') ||
                  !sourceRef.url.includes(sourceRef.sourceVersion) ||
                  !sourceRef.url.includes('#L'))
              ) {
                failures.push(
                  `${sourceRefId}: MegaMek ref must be commit-pinned and line-anchored`,
                );
              }
              if (
                sourceRef.kind === 'mekhq-behavior' &&
                (!sourceRef.url.includes('github.com/MegaMek/mekhq/blob/') ||
                  !sourceRef.url.includes(sourceRef.sourceVersion) ||
                  !sourceRef.url.includes('#L'))
              ) {
                failures.push(
                  `${sourceRefId}: MekHQ ref must be commit-pinned and line-anchored`,
                );
              }
              if (
                sourceRef.kind === 'mekstation-deviation' &&
                !sourceRef.url.includes('#L')
              ) {
                failures.push(
                  `${sourceRefId}: MekStation deviation ref must be line-anchored`,
                );
              }
              if (
                sourceRef.kind === 'rulebook' &&
                !sourceRef.url.includes('battletech.com/')
              ) {
                failures.push(`${sourceRefId}: rulebook ref is not official`);
              }
            });
          }
        }

        return failures;
      },
    );

    expect([...sectionKeyFailures, ...evidenceFailures]).toEqual([]);
  });

  it('keeps source-pinned quirk, PSR trigger, pilot, resolver, and damage catalogs on row-level authority', () => {
    const triadMaps = triadEvidenceMaps();

    expect(triadMaps.featureSupport.mechQuirks.authorityBoundary.kind).toBe(
      'entry-source-refs',
    );
    expect(triadMaps.lifecycleAndPsr.psrTriggers.authorityBoundary.kind).toBe(
      'entry-source-refs',
    );
    expect(
      triadMaps.pilotSkills.pilotModifierResolvers.authorityBoundary.kind,
    ).toBe('entry-source-refs');
    expect(triadMaps.pilotSkills.pilotSkillUse.authorityBoundary.kind).toBe(
      'entry-source-refs',
    );
    expect(
      triadMaps.damageAndDeath.damageResolution.authorityBoundary.kind,
    ).toBe('entry-source-refs');
    expect(triadMaps.damageAndDeath.pilotDamage.authorityBoundary.kind).toBe(
      'entry-source-refs',
    );
    expect(
      triadMaps.damageAndDeath.destructionCauses.authorityBoundary.kind,
    ).toBe('entry-source-refs');
  });

  it('keeps representative must-cover requirements discoverable from the aggregate catalog', () => {
    const allIds = new Set(
      catalogMaps().flatMap(({ support }) => supportIds(support)),
    );

    expect(Array.from(allIds).sort()).toEqual(
      expect.arrayContaining([
        'movement.walk',
        'movement.evade',
        'movement.sprint',
        'movement.activate-masc',
        'movement.activate-supercharger',
        'movement.go-prone',
        'weapon.fire-volley',
        'attack_declared',
        'attack_invalid',
        'physical_attack_resolved',
        'unit_ejected',
        'motive_damaged',
        'physical.charge',
        'physical.push',
        'shared.displacement-elevation-cap',
        'shared.displacement-prohibited-terrain',
        'shared.displacement-overgrown-terrain',
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
        'physical-displacement-grid-occupancy',
        'phase-psr-queue-lifecycle',
        'ranged-gunnery-to-hit',
        'ranged-to-hit-calculation',
        'ranged-to-hit-state-hydration',
        'c3-equipment-network-formation',
        'psr-spa-application',
        'edge_when_tac',
        'rugged_1',
        'campaign-quirk-behavior',
        'protected_actuators',
        'critical-prevention-application',
        'anti-mek-actuator-application',
        'campaign-maintenance-application',
        'known-limitation-bypass',
        'static-weapon-database-subset',
        'synthetic-medium-laser-fallback-ban',
        'variable-damage-string-guard',
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
