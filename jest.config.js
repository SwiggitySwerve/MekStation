const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you based on your tsconfig.json paths)
    '^@/(.*)$': '<rootDir>/src/$1',
    // Handle CSS imports (with CSS modules)
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
  },
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'src/pages/api/**/*.{js,ts}',
    'src/utils/**/*.{js,ts}',
    'src/services/**/*.{js,ts}',
    'src/components/**/*.{js,ts,jsx,tsx}',
    '!**/*.d.ts',
  ],
  // Coverage thresholds - will fail if coverage drops below these levels
  // Ratcheted on 2026-04-25 after Tier 1 BV-core invariant tests landed
  // (PR-C1: ~110 new tests for battleValue*, aerospace, engine/gyro/heat-sink/
  // armor/cost, equipmentBV, techBaseValidation). Pre-PR baseline reported
  // 67.43% statements / 58.23% branches / 60.37% functions / 69.48% lines
  // globally; new threshold sits well below the baseline to act as a true
  // ratchet without flapping on small refactors.
  // Note: Directory-specific thresholds removed due to Jest path matching issues.
  // Global thresholds are sufficient for CI enforcement.
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
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|ts|tsx)',
    '**/*.(test|spec).(js|ts|tsx)',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
    '/e2e/',
    'e2e/',
  ], // Transform ES modules that Jest can't handle
  transformIgnorePatterns: [
    'node_modules/(?!(react-dnd|dnd-core|@react-dnd|react-dnd-html5-backend|react-window)/)',
  ],
  transform: {
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
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
