#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

const packageJsonPath =
  process.env.MEKSTATION_PACKAGE_JSON_PATH ??
  path.join(repoRoot, 'package.json');
const registryPath =
  process.env.MEKSTATION_QC_REGISTRY_PATH ??
  path.join(repoRoot, 'docs', 'qc', 'mekstation-qc-registry.json');
const majorScenariosPath =
  process.env.MEKSTATION_MAJOR_SCENARIOS_PATH ??
  path.join(
    repoRoot,
    'docs',
    'qc',
    'mekstation-major-capability-scenarios.json',
  );

const requiredPackageScripts = [
  {
    id: 'qc:wave4:family-data:validate',
    tokens: ['validate-wave4-family-data-gate.mjs'],
  },
  {
    id: 'verify:qc:wave4:customizer-data',
    tokens: [
      'qc:wave4:family-data:validate',
      'validate:assets:strict',
      'schema:gen-check',
      'validate:bv',
      'validate:vehicle',
      'validate:aerospace',
      'validate:ba-bv',
      'validate:proto',
      'validate:infantry',
    ],
  },
  {
    id: 'verify:qc:wave4',
    tokens: [
      'verify:qc:wave4:customizer-data',
      'verify:qc:wave4:nonbattlemech-scope',
      'verify:qc:multiplayer-reliability',
      'verify:qc:replay-recovery',
    ],
  },
];

const requiredSurfaces = [
  {
    id: 'compendium-unit-data',
    coverageStatus: 'ready-with-scope',
    commandTokens: [
      'qc:wave4:family-data:validate',
      'validate:assets:strict',
      'schema:gen-check',
    ],
    evidenceTokens: ['representative family data gate'],
  },
  {
    id: 'customizer-construction-bv-export',
    coverageStatus: 'ready-with-scope',
    commandTokens: [
      'qc:wave4:family-data:validate',
      'validate:bv',
      'validate:vehicle',
      'validate:aerospace',
      'validate:ba-bv',
      'validate:proto',
      'validate:infantry',
    ],
    evidenceTokens: ['representative family data gate'],
  },
];

const requiredMajorScenarioChecks = [
  {
    id: 'MC-02-compendium-unit-data',
    checkIds: ['representative-family-data-gate'],
  },
  {
    id: 'MC-03-customizer-construction-bv-export',
    checkIds: ['representative-family-data-gate'],
  },
];

const familyContracts = [
  {
    id: 'battlemech',
    label: 'BattleMech',
    unitTypeTokens: [
      'UnitType.BATTLEMECH',
      'UnitType.OMNIMECH',
      'UnitType.INDUSTRIALMECH',
    ],
    customizerAnchors: [
      {
        path: 'src/components/customizer/shared/customizerTypeRegistry.tsx',
        tokens: ['MechShell', 'PreviewTab', 'RecordSheetPreview'],
      },
      {
        path: 'src/components/customizer/tabs/PreviewTab.tsx',
        tokens: ['handleExportPDF', 'RecordSheetPreviewWithRef'],
      },
      {
        path: 'src/components/customizer/tabs/useMultiUnitTabsController.helpers.ts',
        tokens: ['buildActiveUnitExportData', 'createUnitFromFullState'],
      },
    ],
    catalogAnchors: [
      {
        path: 'scripts/validate-bv.ts',
        tokens: ['ValidationResult', 'indexBV', 'calculatedBV'],
      },
      {
        path: 'src/services/conversion/__tests__/UnitFormatConverter.convert.test.ts',
        tokens: ['UnitFormatConverter', 'convert'],
      },
    ],
    browserAnchors: [
      {
        path: 'e2e/customizer.spec.ts',
        tokens: ['createMechUnit', 'getMechState'],
      },
      {
        path: 'e2e/exotic-mech.spec.ts',
        tokens: ['createQuadMech', 'createLAM', 'createTripodMech'],
      },
      {
        path: 'e2e/compendium.spec.ts',
        tokens: ['unit database', 'search filters units'],
      },
    ],
  },
  {
    id: 'vehicle-vtol',
    label: 'Vehicle/VTOL',
    unitTypeTokens: [
      'UnitType.VEHICLE',
      'UnitType.VTOL',
      'UnitType.SUPPORT_VEHICLE',
    ],
    customizerAnchors: [
      {
        path: 'src/components/customizer/vehicle/buildVehicleUnitObject.ts',
        tokens: ['buildVehicleUnitObject', 'IVehicleRecordSheetUnitInput'],
      },
      {
        path: 'src/components/customizer/vehicle/VehiclePreviewTab.tsx',
        tokens: ['buildVehicleUnitObject', 'VehicleRecordSheetPreview'],
      },
      {
        path: 'src/components/customizer/vehicle/__tests__/VehiclePreviewTab.test.tsx',
        tokens: ['buildVehicleUnitObject', 'dispatch'],
      },
    ],
    catalogAnchors: [
      {
        path: 'scripts/validate-vehicle-bv.ts',
        tokens: ['Vehicle BV Parity Harness', 'computedBV', 'mulBV'],
      },
      {
        path: 'src/services/units/handlers/VehicleUnitHandler.ts',
        tokens: ['VehicleUnitHandler'],
      },
      {
        path: 'src/services/units/handlers/VTOLUnitHandler.ts',
        tokens: ['VTOLUnitHandler'],
      },
    ],
    browserAnchors: [
      {
        path: 'e2e/customizer.spec.ts',
        tokens: ['createVehicleUnit', 'getVehicleState'],
      },
    ],
  },
  {
    id: 'aerospace',
    label: 'Aerospace',
    unitTypeTokens: ['UnitType.AEROSPACE', 'UnitType.CONVENTIONAL_FIGHTER'],
    customizerAnchors: [
      {
        path: 'src/components/customizer/aerospace/buildAerospaceUnitObject.ts',
        tokens: ['buildAerospaceUnitObject', 'IAerospaceRecordSheetUnitInput'],
      },
      {
        path: 'src/components/customizer/aerospace/AerospacePreviewTab.tsx',
        tokens: ['buildAerospaceUnitObject', 'AerospaceRecordSheetPreview'],
      },
      {
        path: 'src/components/customizer/aerospace/__tests__/AerospacePreviewTab.test.tsx',
        tokens: ['buildAerospaceUnitObject', 'dispatch'],
      },
    ],
    catalogAnchors: [
      {
        path: 'scripts/validate-aerospace-bv.ts',
        tokens: [
          'Aerospace BV Parity Validation CLI',
          'calculateAerospaceBVFromUnit',
        ],
      },
      {
        path: 'src/services/units/handlers/AerospaceUnitHandler.ts',
        tokens: ['AerospaceUnitHandler'],
      },
      {
        path: 'src/services/units/handlers/ConventionalFighterUnitHandler.ts',
        tokens: ['ConventionalFighterUnitHandler'],
      },
    ],
    browserAnchors: [
      {
        path: 'e2e/customizer.spec.ts',
        tokens: ['createAerospaceUnit', 'getAerospaceState'],
      },
    ],
  },
  {
    id: 'battle-armor',
    label: 'Battle Armor',
    unitTypeTokens: ['UnitType.BATTLE_ARMOR'],
    customizerAnchors: [
      {
        path: 'src/components/customizer/battlearmor/buildBattleArmorUnitObject.ts',
        tokens: [
          'buildBattleArmorUnitObject',
          'IBattleArmorRecordSheetUnitInput',
        ],
      },
      {
        path: 'src/components/customizer/battlearmor/BattleArmorPreviewTab.tsx',
        tokens: ['buildBattleArmorUnitObject', 'BattleArmorRecordSheetPreview'],
      },
      {
        path: 'src/components/customizer/battlearmor/__tests__/BattleArmorPreviewTab.test.tsx',
        tokens: ['buildBattleArmorUnitObject', 'dispatch'],
      },
    ],
    catalogAnchors: [
      {
        path: 'scripts/validate-battle-armor-bv.ts',
        tokens: ['Battle Armor BV Parity Harness', 'calculateBattleArmorBV'],
      },
      {
        path: 'src/services/units/handlers/BattleArmorUnitHandler.ts',
        tokens: ['BattleArmorUnitHandler'],
      },
    ],
    browserAnchors: [
      {
        path: 'src/components/customizer/__tests__/nonMechCustomizerTabMount.test.tsx',
        tokens: ['Battle Armor', 'BattleArmorCustomizer'],
      },
    ],
  },
  {
    id: 'infantry',
    label: 'Infantry',
    unitTypeTokens: ['UnitType.INFANTRY'],
    customizerAnchors: [
      {
        path: 'src/components/customizer/infantry/buildInfantryUnitObject.ts',
        tokens: ['buildInfantryUnitObject', 'IInfantryRecordSheetUnitInput'],
      },
      {
        path: 'src/components/customizer/infantry/InfantryPreviewTab.tsx',
        tokens: ['buildInfantryUnitObject', 'InfantryRecordSheetPreview'],
      },
      {
        path: 'src/components/customizer/infantry/__tests__/InfantryPreviewTab.test.tsx',
        tokens: ['buildInfantryUnitObject', 'dispatch'],
      },
    ],
    catalogAnchors: [
      {
        path: 'scripts/validate-infantry-bv.ts',
        tokens: ['Infantry BV Parity Harness', 'computedBV', 'mulBV'],
      },
      {
        path: 'src/services/units/handlers/InfantryUnitHandler.ts',
        tokens: ['InfantryUnitHandler'],
      },
    ],
    browserAnchors: [
      {
        path: 'src/components/customizer/__tests__/nonMechCustomizerTabMount.test.tsx',
        tokens: ['InfantryCustomizer', 'Infantry'],
      },
    ],
  },
  {
    id: 'protomech',
    label: 'ProtoMech',
    unitTypeTokens: ['UnitType.PROTOMECH'],
    customizerAnchors: [
      {
        path: 'src/components/customizer/protomech/buildProtoMechUnitObject.ts',
        tokens: ['buildProtoMechUnitObject', 'IProtoMechRecordSheetUnitInput'],
      },
      {
        path: 'src/components/customizer/protomech/ProtoMechPreviewTab.tsx',
        tokens: ['buildProtoMechUnitObject', 'ProtoMechRecordSheetPreview'],
      },
      {
        path: 'src/components/customizer/protomech/__tests__/ProtoMechPreviewTab.test.tsx',
        tokens: ['buildProtoMechUnitObject', 'dispatch'],
      },
    ],
    catalogAnchors: [
      {
        path: 'scripts/validate-proto-bv.ts',
        tokens: [
          'ProtoMech BV Parity Validation CLI',
          'protomech-bv-validation-report.json',
        ],
      },
      {
        path: 'src/services/units/handlers/ProtoMechUnitHandler.ts',
        tokens: ['ProtoMechUnitHandler'],
      },
    ],
    browserAnchors: [
      {
        path: 'src/components/customizer/__tests__/nonMechCustomizerTabMount.test.tsx',
        tokens: ['ProtoMechCustomizer', 'ProtoMech'],
      },
    ],
  },
];

function parseArgs(argv) {
  return { json: argv.includes('--json') };
}

function issue(severity, code, message, details = {}) {
  return { severity, code, message, ...details };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function normalizeSlash(value) {
  return value.replaceAll('\\', '/');
}

function validatePackageScript(contract, scripts, issues) {
  const script = scripts[contract.id];
  if (!script) {
    issues.push(
      issue(
        'error',
        'package-script-missing',
        `Required package script ${contract.id} is missing.`,
        { scriptId: contract.id },
      ),
    );
    return { scriptId: contract.id, tokenCount: contract.tokens.length };
  }

  for (const token of contract.tokens) {
    if (!script.includes(token)) {
      issues.push(
        issue(
          'error',
          'package-script-token-missing',
          `${contract.id} must include ${token}.`,
          { scriptId: contract.id, token },
        ),
      );
    }
  }

  return { scriptId: contract.id, tokenCount: contract.tokens.length };
}

function validateSurface(contract, surfaceById, issues) {
  const surface = surfaceById.get(contract.id);
  if (!surface) {
    issues.push(
      issue(
        'error',
        'surface-missing',
        `Required surface ${contract.id} is missing.`,
        { surfaceId: contract.id },
      ),
    );
    return null;
  }

  if (surface.coverageStatus !== contract.coverageStatus) {
    issues.push(
      issue(
        'error',
        'surface-coverage-not-release-ready',
        `${contract.id} must be ${contract.coverageStatus}.`,
        {
          surfaceId: contract.id,
          expected: contract.coverageStatus,
          actual: surface.coverageStatus,
        },
      ),
    );
  }

  const allCommands = normalizeSlash((surface.commands ?? []).join('\n'));
  for (const token of contract.commandTokens) {
    if (!allCommands.includes(token)) {
      issues.push(
        issue(
          'error',
          'surface-command-missing',
          `${contract.id} must list command token ${token}.`,
          { surfaceId: contract.id, token },
        ),
      );
    }
  }

  const allEvidence = normalizeSlash((surface.evidence ?? []).join('\n'));
  for (const token of contract.evidenceTokens) {
    if (!allEvidence.includes(token)) {
      issues.push(
        issue(
          'error',
          'surface-evidence-missing',
          `${contract.id} must cite ${token}.`,
          { surfaceId: contract.id, token },
        ),
      );
    }
  }

  return {
    surfaceId: contract.id,
    coverageStatus: surface.coverageStatus,
    commandCount: surface.commands?.length ?? 0,
    evidenceCount: surface.evidence?.length ?? 0,
  };
}

function validateMajorScenario(contract, scenariosById, issues) {
  const scenario = scenariosById.get(contract.id);
  if (!scenario) {
    issues.push(
      issue(
        'error',
        'major-scenario-missing',
        `Required major capability scenario ${contract.id} is missing.`,
        { scenarioId: contract.id },
      ),
    );
    return null;
  }

  const checkIds = new Set((scenario.checks ?? []).map((check) => check.id));
  for (const checkId of contract.checkIds) {
    if (!checkIds.has(checkId)) {
      issues.push(
        issue(
          'error',
          'major-scenario-check-missing',
          `${contract.id} must include check ${checkId}.`,
          { scenarioId: contract.id, checkId },
        ),
      );
    }
  }

  return {
    scenarioId: contract.id,
    checkCount: scenario.checks?.length ?? 0,
  };
}

function validateAnchorGroup(family, groupName, anchors, issues) {
  const passed = [];
  for (const anchor of anchors) {
    let content;
    try {
      content = readRepoFile(anchor.path);
    } catch (error) {
      issues.push(
        issue(
          'error',
          'family-anchor-missing',
          `${family.id} ${groupName} anchor ${anchor.path} is missing.`,
          { familyId: family.id, groupName, path: anchor.path },
        ),
      );
      continue;
    }

    for (const token of anchor.tokens) {
      if (!content.includes(token)) {
        issues.push(
          issue(
            'error',
            'family-anchor-token-missing',
            `${family.id} ${groupName} anchor ${anchor.path} must include ${token}.`,
            { familyId: family.id, groupName, path: anchor.path, token },
          ),
        );
      }
    }

    passed.push({
      path: anchor.path,
      tokenCount: anchor.tokens.length,
    });
  }
  return passed;
}

function validateFamily(family, issues) {
  const registryText = readRepoFile(
    'src/components/customizer/shared/customizerTypeRegistry.tsx',
  );

  for (const token of family.unitTypeTokens) {
    if (!registryText.includes(token)) {
      issues.push(
        issue(
          'error',
          'family-unit-type-missing',
          `${family.label} descriptor must include ${token}.`,
          { familyId: family.id, token },
        ),
      );
    }
  }

  return {
    familyId: family.id,
    label: family.label,
    unitTypeTokens: family.unitTypeTokens.length,
    customizerAnchors: validateAnchorGroup(
      family,
      'customizer',
      family.customizerAnchors,
      issues,
    ),
    catalogAnchors: validateAnchorGroup(
      family,
      'catalog',
      family.catalogAnchors,
      issues,
    ),
    browserAnchors: validateAnchorGroup(
      family,
      'browser',
      family.browserAnchors,
      issues,
    ),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const packageJson = readJson(packageJsonPath);
  const registry = readJson(registryPath);
  const majorScenarios = readJson(majorScenariosPath);
  const issues = [];

  const packageScripts = requiredPackageScripts.map((contract) =>
    validatePackageScript(contract, packageJson.scripts ?? {}, issues),
  );

  const surfaceById = new Map(
    (registry.surfaces ?? []).map((surface) => [surface.surfaceId, surface]),
  );
  const surfaces = requiredSurfaces
    .map((contract) => validateSurface(contract, surfaceById, issues))
    .filter(Boolean);

  const scenariosById = new Map(
    (majorScenarios.scenarios ?? []).map((scenario) => [scenario.id, scenario]),
  );
  const scenarios = requiredMajorScenarioChecks
    .map((contract) => validateMajorScenario(contract, scenariosById, issues))
    .filter(Boolean);

  const families = familyContracts.map((family) =>
    validateFamily(family, issues),
  );

  const errorCount = issues.filter(
    (entry) => entry.severity === 'error',
  ).length;
  const warningCount = issues.filter(
    (entry) => entry.severity === 'warning',
  ).length;
  const manifest = {
    status: errorCount === 0 ? 'pass' : 'fail',
    packageScripts,
    surfaces,
    scenarios,
    families,
    familyCount: familyContracts.length,
    errors: issues.filter((entry) => entry.severity === 'error'),
    warnings: issues.filter((entry) => entry.severity === 'warning'),
  };

  if (args.json) {
    console.log(JSON.stringify(manifest, null, 2));
  } else {
    console.log(
      `[qc:wave4:family-data] families=${families.length}/${familyContracts.length} surfaces=${surfaces.length}/${requiredSurfaces.length} scenarios=${scenarios.length}/${requiredMajorScenarioChecks.length} packageScripts=${packageScripts.length}/${requiredPackageScripts.length} errors=${errorCount} warnings=${warningCount}`,
    );
    for (const entry of issues) {
      console.log(
        `${entry.severity.toUpperCase()} ${entry.code}: ${entry.message}`,
      );
    }
  }

  process.exit(errorCount === 0 ? 0 : 1);
}

main();
