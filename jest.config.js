const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// =============================================================================
// Shared base config (transforms + module aliases)
//
// Both the `unit` and `a11y` projects share the same SWC transform, alias
// map, and CSS-modules stub. Project-specific overrides are layered on top.
// =============================================================================

const sharedModuleNameMapper = {
  // Handle module aliases (this will be automatically configured for you based on your tsconfig.json paths)
  '^@/(.*)$': '<rootDir>/src/$1',
  // Handle CSS imports (with CSS modules)
  '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
};

const sharedTransform = {
  '^.+\\.(ts|tsx|js|jsx)$': [
    '@swc/jest',
    {
      jsc: {
        parser: { syntax: 'typescript', tsx: true, decorators: false },
        transform: { react: { runtime: 'automatic' } },
        target: 'es2022',
      },
      module: { type: 'commonjs' },
    },
  ],
};

const sharedTransformIgnorePatterns = [
  // ESM-only deps that Jest can't parse without transform
  'node_modules/(?!(react-dnd|dnd-core|@react-dnd|react-dnd-html5-backend|react-window)/)',
];

const sharedTestPathIgnorePatterns = [
  '<rootDir>/.next/',
  '<rootDir>/node_modules/',
  '<rootDir>/e2e/',
  '/e2e/',
  'e2e/',
];

const perfSensitiveSimulationTestPattern =
  'src[/\\\\]simulation[/\\\\]__tests__[/\\\\](integration|simulation-combat-integration|swarm-pilot-skills-batch|swarm-throughput)\\.test\\.ts$';

const unitTestPathIgnorePatterns = [
  ...sharedTestPathIgnorePatterns,
  '\\.a11y\\.test\\.(ts|tsx)$',
];

if (process.env.JEST_EXCLUDE_PERF_SENSITIVE === 'true') {
  unitTestPathIgnorePatterns.push(perfSensitiveSimulationTestPattern);
}

// =============================================================================
// Unit project (existing test surface)
// =============================================================================

const unitJestConfig = {
  displayName: 'unit',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: sharedModuleNameMapper,
  testEnvironment: 'jsdom',
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|ts|tsx)',
    '**/*.(test|spec).(js|ts|tsx)',
  ],
  // Exclude a11y tests from the default test surface — they live in their
  // own project and run via `--selectProjects a11y`.
  testPathIgnorePatterns: unitTestPathIgnorePatterns,
  transformIgnorePatterns: sharedTransformIgnorePatterns,
  transform: sharedTransform,
};

// =============================================================================
// A11y project (axe-based accessibility tests)
//
// Lives behind a dedicated project so:
//   • The default unit run is unaffected (no extra setup file, no axe import)
//   • CI can gate a11y separately via `npx jest --selectProjects a11y`
//   • New a11y tests are discovered automatically by the `*.a11y.test.tsx`
//     glob, without further config
// =============================================================================

const a11yJestConfig = {
  displayName: 'a11y',
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/jest.setup.a11y.ts',
  ],
  moduleNameMapper: sharedModuleNameMapper,
  testEnvironment: 'jsdom',
  testMatch: ['**/*.a11y.test.(ts|tsx)'],
  testPathIgnorePatterns: sharedTestPathIgnorePatterns,
  transformIgnorePatterns: sharedTransformIgnorePatterns,
  transform: sharedTransform,
};

// =============================================================================
// createJestConfig is exported this way to ensure that next/jest can load
// the Next.js config which is async. Top-level `coverage*` keys live here
// (Jest treats them as global in multi-project mode); per-project settings
// live inside each entry of `projects`.
// =============================================================================

module.exports = createJestConfig({
  projects: [unitJestConfig, a11yJestConfig],
  // Coverage globally — applies to both projects.
  // Ratcheted on 2026-04-25 after Tier 1 BV-core invariant tests landed
  // (PR-C1: ~110 new tests for battleValue*, aerospace, engine/gyro/heat-sink/
  // armor/cost, equipmentBV, techBaseValidation). Pre-PR baseline reported
  // 67.43% statements / 58.23% branches / 60.37% functions / 69.48% lines
  // globally; new threshold sits well below the baseline to act as a true
  // ratchet without flapping on small refactors.
  collectCoverageFrom: [
    'src/pages/api/**/*.{js,ts}',
    'src/utils/**/*.{js,ts}',
    'src/services/**/*.{js,ts}',
    'src/components/**/*.{js,ts,jsx,tsx}',
    '!**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 55,
      branches: 45,
      functions: 50,
      lines: 55,
    },
  },
  // Report formats: text, lcov (for CI), html (for browsing)
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
});
