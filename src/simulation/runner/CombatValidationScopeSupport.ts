import type { ICombatFeatureSupportEntry } from './CombatFeatureSupport';

function integrated(id: string, evidence: string): ICombatFeatureSupportEntry {
  return { id, level: 'integrated', evidence };
}

function helperOnly(
  id: string,
  evidence: string,
  gap: string,
): ICombatFeatureSupportEntry {
  return { id, level: 'helper-only', evidence, gap };
}

export const BATTLEMECH_COMBAT_VALIDATION_INVARIANT =
  'battlemech-combat-validation';

export const KNOWN_LIMITATION_VALIDATION_TRAPS = [
  {
    id: 'physical-attack-filter-trap',
    category: 'physicalAttacks',
    message: 'physical attack charge and death from above',
  },
  {
    id: 'ammo-consumption-filter-trap',
    category: 'ammoConsumption',
    message: 'ammo consumption not decremented when fired',
  },
  {
    id: 'heat-shutdown-filter-trap',
    category: 'heatShutdown',
    message: 'heat induced shutdown restart after shutdown',
  },
  {
    id: 'terrain-movement-filter-trap',
    category: 'terrainMovement',
    message: 'terrain movement cost water hex rubble cost',
  },
  {
    id: 'piloting-check-filter-trap',
    category: 'pilotingChecks',
    message: 'piloting check fall check skid check',
  },
  {
    id: 'critical-effect-filter-trap',
    category: 'criticalEffects',
    message: 'critical hit effect actuator damage gyro hit',
  },
  {
    id: 'line-of-sight-filter-trap',
    category: 'lineOfSight',
    message: 'line of sight blocked by intervening terrain',
  },
  {
    id: 'special-ability-filter-trap',
    category: 'specialAbilities',
    message: 'special pilot ability spa effect not applied',
  },
] as const;

export const BATTLEMECH_VALIDATION_SCOPE_SUPPORT = {
  'known-limitation-bypass': integrated(
    'known-limitation-bypass',
    'knownLimitations.ts bypasses the battlemech-combat-validation invariant before broad limitation filtering',
  ),
  'known-limitation-pattern-audit': integrated(
    'known-limitation-pattern-audit',
    'getLimitationPatternCategory still reports the broad matching category so validation-trap coverage remains auditable',
  ),
  'catalog-filter-gate-ban': integrated(
    'catalog-filter-gate-ban',
    'combatValidationScope.contract.test.ts scans every runner combat catalog contract and forbids filterKnownLimitations/partitionViolations as catalog gates',
  ),
  'battlemech-official-catalog-scope': integrated(
    'battlemech-official-catalog-scope',
    'battlemechCombatCatalog.contract.test.ts covers every official ranged weapon, physical weapon, and ammo entry visible to the construction catalog',
  ),
  'non-battlemech-ammo-scope': helperOnly(
    'non-battlemech-ammo-scope',
    'ammo compatibility audit classifies aerospace/capital, battle-armor, and protomech ammo separately from BattleMech weapon compatibility',
    'non-BattleMech ammo is explicitly outside the BattleMech combat validation lane',
  ),
  'non-battlemech-combat-system-split': helperOnly(
    'non-battlemech-combat-system-split',
    'aerospace, protomech, battle-armor, infantry, and vehicle helpers live under dedicated gameplay modules instead of runner BattleMech support matrices',
    'non-BattleMech systems need their own validation matrices rather than being folded into the BattleMech suite',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
