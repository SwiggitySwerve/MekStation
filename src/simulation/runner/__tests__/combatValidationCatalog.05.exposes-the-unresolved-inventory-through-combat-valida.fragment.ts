import type {
  CatalogMapRow,
  CombatValidationCatalogSection,
  CombatValidationSourceRef,
  CombatValidationSupportEntry,
  CombatValidationSupportMap,
  ICombatCatalogTriadEvidence,
  ICombatCatalogTriadTestReference,
} from './combatValidationCatalog.test-helpers';

import {
  BATTLEMECH_COMBAT_VALIDATION_CATALOG,
  BATTLEMECH_VALIDATION_SCOPE_SUPPORT,
  CANONICAL_SPA_COMBAT_SCOPE_SUPPORT,
  CLOSED_EJECTION_COVERAGE_REFS,
  COMBAT_CATALOG_TRIAD_EVIDENCE,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS,
  EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_GAP,
  EQUIPMENT_CRITICAL_COMPONENT_EVIDENCE,
  EQUIPMENT_CRITICAL_EFFECT_EVIDENCE,
  MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS,
  OUT_OF_SCOPE_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS,
  OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
  TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_REFS,
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS,
  UNRESOLVED_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS,
  UNRESOLVED_EQUIPMENT_CRITICAL_COMPONENT_REFS,
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  UNRESOLVED_EQUIPMENT_CRITICAL_SLOT_EFFECT_REFS,
  UNRESOLVED_MINEFIELD_VARIANT_SIDE_PATH_REFS,
  UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS,
  VALID_SOURCE_KINDS,
  catalogEntryRef,
  catalogMaps,
  entryNeedsEvidenceOrGap,
  entrySourceRefFailures,
  existsSync,
  fileLineCount,
  filterCombatValidationGapRowsByScope,
  findMissingEvidenceOrGapRefs,
  findMissingSourceRefRefs,
  findTriadEvidenceFailures,
  findTriadSectionKeyFailures,
  getCombatValidationOutOfScopeRefs,
  getCombatValidationOutOfScopeRows,
  getCombatValidationUnresolvedRefs,
  getCombatValidationUnresolvedRows,
  hasIntegratedRows,
  isCombatValidationAggregateGapRow,
  join,
  parseLocalSourceAnchor,
  readFileSync,
  sortedKeys,
  sourceRefAnchorFailures,
  sourceRefAuthorityFailures,
  sourceRefMetadataFailures,
  spawnSync,
  supportIds,
  triadEvidenceFailuresForMap,
  triadEvidenceMaps,
  triadSectionMapMatches,
  triadTestRefFailures,
  validateSourceRef,
} from './combatValidationCatalog.test-helpers';

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
  expect(validateCombatSuite).toContain('--format=markdown');
  expect(validateCombatSuite).toContain(
    'Assert reviewer-readable unresolved leaf gap report',
  );
  expect(validateCombatSuite).toContain('--expect-total=0');
  expect(validateCombatSuite).toContain('--expect-total=148');
  expect(validateCombatSuite).toContain('--expect-level=helper-only:0');
  expect(validateCombatSuite).toContain('--expect-level=unsupported:0');
  expect(validateCombatSuite).toContain('--expect-scope=aggregate:0');
  expect(validateCombatSuite).toContain('--expect-scope=leaf:0');
  expect(validateCombatSuite).toContain('--expect-section=damageAndDeath:0');
  expect(validateCombatSuite).toContain('--expect-section=damageAndDeath:6');
  expect(validateCombatSuite).toContain('--expect-section=featureSupport:0');
  expect(validateCombatSuite).toContain('--expect-section=ruleSupport:0');
  expect(validateCombatSuite).toContain('--expect-section=ruleSupport:6');
  expect(validateCombatSuite).toContain('--expect-section=validationScope:0');
  expect(validateCombatSuite).toContain('--expect-section=validationScope:5');
  const gapInventoryScript = readFileSync(
    join(process.cwd(), 'scripts', 'print-combat-validation-gaps.ts'),
    'utf8',
  );
  expect(gapInventoryScript).toContain('getCombatValidationOutOfScopeRows');
  expect(gapInventoryScript).toContain("'markdown'");
  expect(gapInventoryScript).toContain(
    '# BattleMech Combat Validation Gap Inventory',
  );
  expect(gapInventoryScript).toContain('Evidence:');
  expect(gapInventoryScript).toContain('Gap:');

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

it('accepts space-separated gap inventory CLI flags for reviewer hand checks', () => {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(
    command,
    [
      'tsx',
      'scripts/print-combat-validation-gaps.ts',
      '--format',
      'refs',
      '--scope',
      'leaf',
      '--expect-total',
      '0',
      '--expect-no-ref',
      'featureSupport.specialWeaponMechanics.artemis-ambiguous-fcs-allocation-authoring',
      '--expect-no-ref',
      'ruleSupport.terrainEnvironment.terrain-los-tacops-diagram-industrial-zone-side-paths',
      '--expect-no-ref',
      'ruleSupport.terrainEnvironment.terrain-los-tacops-diagram-planted-field-side-paths',
      '--expect-no-ref',
      'ruleSupport.terrainEnvironment.terrain-los-tacops-diagram-elevation-side-paths',
      '--expect-no-ref',
      'ruleSupport.terrainEnvironment.terrain-los-tacops-diagram-combat-caller-option-propagation',
      '--expect-no-ref',
      'ruleSupport.terrainEnvironment.terrain-los-underwater-depth-height-side-paths',
      '--expect-no-ref',
      'ruleSupport.terrainEnvironment.terrain-los-dropship-special-building-handling',
      '--expect-no-ref',
      'ruleSupport.terrainEnvironment.terrain-los-grounded-dropship-cover-providers',
      '--expect-no-ref',
      'ruleSupport.terrainEnvironment.terrain-los-fuel-tank-damageable-cover-providers',
      '--expect-no-ref',
      'ruleSupport.terrainEnvironment.terrain-los-fuel-tank-elevation',
      '--expect-no-ref',
      'ruleSupport.terrainEnvironment.terrain-los-hard-soft-building-cover-providers',
      '--expect-no-ref',
      'ruleSupport.terrainEnvironment.terrain-los-damageable-cover-hit-resolution-routing',
      '--expect-no-ref',
      'ruleSupport.terrainEnvironment.terrain-los-building-level-residual-cases',
      '--expect-no-ref',
      'ruleSupport.terrainEnvironment.minefield-active-non-ground-triggers',
      '--expect-no-ref',
      'ruleSupport.terrainEnvironment.minefield-emp-effects',
      '--expect-no-ref',
      'ruleSupport.terrainEnvironment.minefield-inferno-residual-controls',
      '--expect-no-ref',
      'ruleSupport.terrainEnvironment.minefield-non-conventional-type-semantics',
      '--expect-no-ref',
      'ruleSupport.terrainEnvironment.minefield-hidden-reveal-detection',
      '--expect-no-ref',
      'ruleSupport.terrainEnvironment.minefield-clearing-sweeper-collateral-reset',
      '--expect-no-ref',
      'ruleSupport.terrainEnvironment.terrain-los-side-paths',
      '--expect-no-ref',
      'featureSupport.specialWeaponMechanics.artemis-link-network-lifecycle',
      '--expect-no-ref',
      'featureSupport.specialWeaponMechanics.artemis-stealth-mode-damage-lifecycle',
      '--expect-no-ref',
      'featureSupport.specialWeaponMechanics.inarc-pod-object-lifecycle',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      shell: process.platform === 'win32',
    },
  );

  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
  expect(result.stdout.split(/\r?\n/).filter(Boolean)).toHaveLength(0);
});

it('rejects unknown gap inventory CLI flags instead of silently weakening gates', () => {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(
    command,
    [
      'tsx',
      'scripts/print-combat-validation-gaps.ts',
      '--format',
      'summary',
      '--expect-totla',
      '17',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      shell: process.platform === 'win32',
    },
  );

  expect(result.error).toBeUndefined();
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Unknown flag "--expect-totla"');
});

it('documents the reviewer-readable unresolved inventory report mode', () => {
  expect(
    BATTLEMECH_VALIDATION_SCOPE_SUPPORT[
      'unresolved-completion-blocker-inventory'
    ].sourceRefs?.map(({ citation }) => citation),
  ).toEqual(
    expect.arrayContaining([
      expect.stringContaining('emits JSON, Markdown, refs, and summary views'),
    ]),
  );
});

it('splits non-BattleMech Supercharger side paths out of BattleMech blockers', () => {
  const unresolvedRefs = getCombatValidationUnresolvedRefs();
  const outOfScopeRows = getCombatValidationOutOfScopeRows();

  expect(unresolvedRefs).not.toContain(
    'ruleSupport.movementEnhancements.supercharger-side-paths',
  );
  expect(unresolvedRefs).not.toContain(
    'ruleSupport.movementEnhancements.supercharger-non-battlemech-side-paths',
  );
  expect(
    outOfScopeRows.find(
      (row) =>
        row.ref ===
        'ruleSupport.movementEnhancements.supercharger-non-battlemech-side-paths',
    ),
  ).toMatchObject({
    level: 'out-of-scope',
    evidence:
      'MegaMek Supercharger has explicit Tank, SupportTank, SupportVTOL, and non-Mek failure-damage branches, but this catalog is scoped to BattleMech combat validation',
    gap: 'Non-BattleMech Supercharger support-unit roll adjustment and vehicle motive-damage branches stay outside this BattleMech suite instead of being counted as BattleMech movement-enhancement blockers',
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('SupportTank'),
        kind: 'megamek-source',
      }),
      expect.objectContaining({
        citation: expect.stringContaining('non-Mek Supercharger failure'),
        kind: 'megamek-source',
      }),
    ]),
  });
});

it('keeps MASC and Supercharger side-path coverage bounded to represented BattleMech behavior', () => {
  const unresolvedRefs = getCombatValidationUnresolvedRefs();
  const movementEnhancementRows =
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.ruleSupport.movementEnhancements;
  const representedRefs = [
    'ruleSupport.movementEnhancements.MASC',
    'ruleSupport.movementEnhancements.masc-battlemech-represented-side-paths',
    'ruleSupport.movementEnhancements.masc-side-paths',
    'ruleSupport.movementEnhancements.Supercharger',
    'ruleSupport.movementEnhancements.supercharger-battlemech-represented-side-paths',
    'ruleSupport.movementEnhancements.supercharger-side-paths',
  ];

  expect(unresolvedRefs).toEqual(expect.not.arrayContaining(representedRefs));
  expect(
    [
      movementEnhancementRows['masc-side-paths'],
      movementEnhancementRows['supercharger-side-paths'],
    ].map((row) => ({
      id: row.id,
      level: row.level,
      evidence: row.evidence,
      gap: row.gap,
    })),
  ).toEqual([
    {
      id: 'masc-side-paths',
      level: 'integrated',
      evidence: expect.stringContaining('named MASC failure trigger source'),
      gap: undefined,
    },
    {
      id: 'supercharger-side-paths',
      level: 'integrated',
      evidence: expect.stringContaining(
        'named Supercharger failure trigger source',
      ),
      gap: undefined,
    },
  ]);
  expect(
    movementEnhancementRows['supercharger-non-battlemech-side-paths'],
  ).toMatchObject({
    level: 'out-of-scope',
    gap: expect.stringContaining('outside this BattleMech suite'),
  });
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

  const sectionKeyFailures = findTriadSectionKeyFailures(triadMaps);
  const evidenceFailures = findTriadEvidenceFailures(triadMaps);

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
  expect(triadMaps.damageAndDeath.damageResolution.authorityBoundary.kind).toBe(
    'entry-source-refs',
  );
  expect(triadMaps.damageAndDeath.pilotDamage.authorityBoundary.kind).toBe(
    'entry-source-refs',
  );
  expect(
    triadMaps.damageAndDeath.destructionCauses.authorityBoundary.kind,
  ).toBe('entry-source-refs');
});
