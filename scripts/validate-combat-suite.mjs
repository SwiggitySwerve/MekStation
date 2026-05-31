import { spawnSync } from 'node:child_process';

const CHANGE_ID = 'add-battlemech-combat-validation-suite';

const COMBAT_VALIDATION_TESTS = [
  'src/simulation/runner/__tests__/combatValidationCatalog.contract.test.ts',
  'src/simulation/runner/__tests__/combatValidationRequirementCatalog.contract.test.ts',
  'src/simulation/runner/__tests__/combatValidationScope.contract.test.ts',
  'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts',
  'src/simulation/runner/__tests__/combatActionCatalog.contract.test.ts',
  'src/simulation/runner/__tests__/combatAttackInvalidationCatalog.contract.test.ts',
  'src/simulation/runner/__tests__/combatCriticalSlotHydrationCatalog.contract.test.ts',
  'src/simulation/runner/__tests__/combatEventCatalog.contract.test.ts',
  'src/simulation/runner/__tests__/combatIntegrationCatalog.contract.test.ts',
  'src/simulation/runner/__tests__/combatPilotModifierApplicationCatalog.contract.test.ts',
  'src/simulation/runner/__tests__/combatPilotSkillCatalog.contract.test.ts',
  'src/simulation/runner/__tests__/combatTerrainEnvironmentCatalog.contract.test.ts',
  'src/simulation/runner/__tests__/atlasHydration.test.ts',
  'src/simulation/runner/__tests__/criticalHitEvents.test.ts',
  'src/simulation/runner/__tests__/criticalSlotHydrationBoundary.behavior.test.ts',
  'src/simulation/runner/__tests__/damageLifecycle.behavior.test.ts',
  'src/simulation/runner/__tests__/ejectionLifecycle.integration.test.ts',
  'src/simulation/runner/__tests__/heatEvents.test.ts',
  'src/simulation/runner/__tests__/heatEnvironmentParity.behavior.test.ts',
  'src/simulation/runner/__tests__/movementPhase.behavior.test.ts',
  'src/simulation/runner/__tests__/physicalAttackRunner.behavior.test.ts',
  'src/simulation/runner/__tests__/physicalWeaponCatalogBoundary.behavior.test.ts',
  'src/simulation/runner/__tests__/psrPhase.behavior.test.ts',
  'src/simulation/runner/__tests__/simulationRunnerTerminalParity.behavior.test.ts',
  'src/simulation/runner/__tests__/weaponAttackEvents.test.ts',
  'src/simulation/runner/__tests__/weaponAttackIndirectFire.test.ts',
  'src/simulation/runner/__tests__/weaponAttackInvalidation.behavior.test.ts',
  'src/simulation/runner/__tests__/weaponAttackToHitModifiers.behavior.test.ts',
  'src/simulation/runner/__tests__/withdrawalIntentBoundary.behavior.test.ts',
  'src/simulation/__tests__/simulation-combat-integration.test.ts',
  'src/simulation/__tests__/wireBotAiHelpersAndCapstone.smoke.test.ts',
  'src/utils/gameplay/movement/__tests__/battlemechMovementTerrain.behavior.test.ts',
  'src/utils/gameplay/toHit/__tests__/battlemechToHitModifierSupport.test.ts',
];

function run(label, command, args, options = {}) {
  console.log(`\n[combat-validation] ${label}`);

  const useShell = options.shellOnWindows && process.platform === 'win32';
  const result = spawnSync(command, args, {
    shell: useShell,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('Jest catalog and behavior coverage', process.execPath, [
  'node_modules/jest/bin/jest.js',
  '--runTestsByPath',
  ...COMBAT_VALIDATION_TESTS,
]);

run(
  'Unresolved gap inventory export',
  'npx',
  ['tsx', 'scripts/print-combat-validation-gaps.ts', '--format=summary'],
  { shellOnWindows: true },
);

run(
  'OpenSpec strict validation',
  'npx',
  ['openspec', 'validate', CHANGE_ID, '--strict'],
  { shellOnWindows: true },
);
