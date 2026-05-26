import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  CombatValidationCatalogSection,
  CombatValidationSupportMap,
} from '../CombatValidationCatalog';
import type { ICombatCatalogTriadEvidence } from '../CombatValidationCatalogTriad';

import { BATTLEMECH_COMBAT_VALIDATION_CATALOG } from '../CombatValidationCatalog';
import { COMBAT_CATALOG_TRIAD_EVIDENCE } from '../CombatValidationCatalogTriad';
import {
  getCombatValidationOutOfScopeRefs,
  getCombatValidationOutOfScopeRows,
  getCombatValidationUnresolvedRefs,
  getCombatValidationUnresolvedRows,
} from '../CombatValidationGapInventory';

function sortedKeys(record: Record<string, unknown>): readonly string[] {
  return Object.keys(record).sort();
}

const VALID_SOURCE_KINDS = new Set([
  'rulebook',
  'megamek-source',
  'mekhq-behavior',
  'mekstation-deviation',
]);

const CLOSED_EJECTION_COVERAGE_REFS = [
  'actions.tacticalCommands.utility.eject',
  'actions.gameIntents.eject',
  'actions.wireIntents.Eject',
  'actions.p2pIntents.eject',
  'invalidation.invalidTargetStates.ejected-target',
  'eventStream.battleMechCombatEvents.unit_ejected',
  'lifecycleAndPsr.actionEligibility.ejected',
  'lifecycleAndPsr.actionEligibility.ejected-targetability',
  'lifecycleAndPsr.actionEligibility.ejection-damage-preservation',
  'parityAndIntegration.representativeScenarios.ejection-damage-preservation',
  'parityAndIntegration.representativeScenarios.ejection-command-intent-outcome',
  'validationScope.objectiveRequirements.ejection-lifecycle',
] as const;

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

function parseLocalSourceAnchor(url: string): {
  readonly file: string;
  readonly startLine: number;
  readonly endLine: number;
} | null {
  const match = /^((?:src|scripts)\/[^#]+)#L(\d+)(?:-L(\d+))?$/.exec(url);
  if (!match) return null;

  const startLine = Number(match[2]);
  return {
    file: match[1],
    startLine,
    endLine: Number(match[3] ?? startLine),
  };
}

function fileLineCount(file: string): number {
  return readFileSync(join(process.cwd(), file), 'utf8').split(/\r?\n/).length;
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

  it('requires every indexed support entry to carry row-level source references', () => {
    const missingSourceRefs = catalogMaps().flatMap(
      ({ sectionId, mapId, support }) =>
        Object.values(support)
          .filter((entry) => (entry.sourceRefs ?? []).length === 0)
          .map((entry) => `${sectionId}.${mapId}.${entry.id}`),
    );

    expect(missingSourceRefs).toEqual([]);
  });

  it('keeps unresolved helper and unsupported rows visible as completion blockers', () => {
    const unresolvedRows = getCombatValidationUnresolvedRows();
    const unresolvedRefs = getCombatValidationUnresolvedRefs();

    expect(unresolvedRefs.length).toBeGreaterThan(0);
    expect(unresolvedRefs).toEqual(Array.from(new Set(unresolvedRefs)));
    expect(unresolvedRefs).toEqual(unresolvedRows.map((row) => row.ref));
    expect(
      unresolvedRows.filter(
        (row) =>
          row.gap.length === 0 ||
          row.evidence.length === 0 ||
          row.sourceRefs.length === 0,
      ),
    ).toEqual([]);
    expect({
      total: unresolvedRows.length,
      byLevel: unresolvedRows.reduce<Record<string, number>>((counts, row) => {
        counts[row.level] = (counts[row.level] ?? 0) + 1;
        return counts;
      }, {}),
      bySection: unresolvedRows.reduce<Record<string, number>>(
        (counts, row) => {
          counts[row.sectionId] = (counts[row.sectionId] ?? 0) + 1;
          return counts;
        },
        {},
      ),
    }).toEqual({
      total: 211,
      byLevel: {
        'helper-only': 155,
        unsupported: 56,
      },
      bySection: {
        actions: 31,
        damageAndDeath: 2,
        featureSupport: 115,
        lifecycleAndPsr: 5,
        pilotSkills: 20,
        ruleSupport: 16,
        validationScope: 22,
      },
    });
    expect(unresolvedRefs).toEqual(
      expect.arrayContaining([
        'actions.absentActionSurfaces.movement.evade',
        'actions.absentActionSurfaces.movement.sprint',
        'featureSupport.ammunitionCompatibility.non-battlemech-aerospace-capital-ammo',
        'featureSupport.ammunitionCompatibility.non-battlemech-battle-armor',
        'featureSupport.ammunitionCompatibility.non-battlemech-protomech',
        'featureSupport.ammunitionCompatibility.unsupported-artillery-ammo',
        'featureSupport.physicalWeapons.claws',
        'featureSupport.physicalWeapons.talons',
        'pilotSkills.pilotModifierResolvers.campaign-maintenance-application',
        'validationScope.objectiveRequirements.non-battlemech-scope',
      ]),
    );
    expect(
      unresolvedRefs.filter((ref) =>
        ref.startsWith('eventStream.nonBattleMechEventScope.'),
      ),
    ).toEqual([]);
  });

  it('keeps non-BattleMech event scope rows auditable without making them BattleMech blockers', () => {
    const outOfScopeRows = getCombatValidationOutOfScopeRows();
    const outOfScopeRefs = getCombatValidationOutOfScopeRefs();

    expect(outOfScopeRefs).toEqual(outOfScopeRows.map((row) => row.ref));
    expect(outOfScopeRefs).toEqual(
      expect.arrayContaining([
        'eventStream.nonBattleMechEventScope.leg_attack',
        'eventStream.nonBattleMechEventScope.motive_damaged',
        'eventStream.nonBattleMechEventScope.swarm_damage',
        'eventStream.nonBattleMechEventScope.vtol_crash_check',
      ]),
    );
    expect(outOfScopeRows).toHaveLength(15);
    expect(
      outOfScopeRows.filter(
        (row) =>
          row.level !== 'out-of-scope' ||
          row.gap.length === 0 ||
          row.evidence.length === 0 ||
          row.sourceRefs.length === 0,
      ),
    ).toEqual([]);
  });

  it('exposes the unresolved inventory through combat validation tooling', () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    ) as { readonly scripts?: Record<string, string> };
    const validateCombatSuite = readFileSync(
      join(process.cwd(), 'scripts', 'validate-combat-suite.mjs'),
      'utf8',
    );

    expect(packageJson.scripts?.['validate:combat:gaps']).toBe(
      'npx tsx scripts/print-combat-validation-gaps.ts',
    );
    expect(validateCombatSuite).toContain('print-combat-validation-gaps.ts');
    expect(validateCombatSuite).toContain('--format=summary');
    expect(
      readFileSync(
        join(process.cwd(), 'scripts', 'print-combat-validation-gaps.ts'),
        'utf8',
      ),
    ).toContain('getCombatValidationOutOfScopeRows');

    const triadTestFiles = Array.from(
      new Set(
        Object.values(triadEvidenceMaps()).flatMap((section) =>
          Object.values(section).flatMap((triad) =>
            triad.testRefs.map((testRef) => testRef.file),
          ),
        ),
      ),
    ).sort();
    expect(
      triadTestFiles.filter(
        (testFile) => !validateCombatSuite.includes(`'${testFile}'`),
      ),
    ).toEqual([]);
  });

  it('keeps ejection lifecycle coverage closed in the aggregate gap inventory', () => {
    const entryLevels = new Map(
      catalogMaps().flatMap(({ sectionId, mapId, support }) =>
        Object.values(support).map((entry) => [
          `${sectionId}.${mapId}.${entry.id}`,
          entry.level,
        ]),
      ),
    );

    expect(
      CLOSED_EJECTION_COVERAGE_REFS.filter(
        (ref) => entryLevels.get(ref) !== 'integrated',
      ),
    ).toEqual([]);
    expect(
      getCombatValidationUnresolvedRefs().filter((ref) => /eject/i.test(ref)),
    ).toEqual([]);
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
              if (sourceRef.kind === 'mekstation-deviation') {
                const localAnchor = parseLocalSourceAnchor(sourceRef.url);
                if (!localAnchor) {
                  failures.push(
                    `${sourceRefId}: MekStation deviation ref must use a local src/ path with line anchors`,
                  );
                } else if (!existsSync(join(process.cwd(), localAnchor.file))) {
                  failures.push(
                    `${sourceRefId}: MekStation deviation file does not exist ${localAnchor.file}`,
                  );
                } else {
                  const lineCount = fileLineCount(localAnchor.file);
                  if (
                    localAnchor.startLine < 1 ||
                    localAnchor.endLine < localAnchor.startLine ||
                    localAnchor.endLine > lineCount
                  ) {
                    failures.push(
                      `${sourceRefId}: MekStation deviation line range ${localAnchor.startLine}-${localAnchor.endLine} exceeds ${localAnchor.file} line count ${lineCount}`,
                    );
                  }
                }
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

  it('keeps source-pinned action, quirk, PSR trigger, pilot, resolver, and damage catalogs on row-level authority', () => {
    const triadMaps = triadEvidenceMaps();

    expect(triadMaps.actions.absentActionSurfaces.authorityBoundary.kind).toBe(
      'entry-source-refs',
    );
    expect(triadMaps.actions.gmCommandExclusions.authorityBoundary.kind).toBe(
      'entry-source-refs',
    );
    expect(
      triadMaps.validationScope.objectiveRequirements.authorityBoundary.kind,
    ).toBe('entry-source-refs');
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
        'charge.no-jump-movement',
        'charge.no-backward-movement',
        'charge.attacker-not-prone',
        'charge.target-mek-standing',
        'dfa.requires-jump',
        'dfa.no-mechanical-jump-booster',
        'dfa.target-not-dropship',
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
