const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

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
  // Set based on coverage analysis from 2025-12-03
  coverageThreshold: {
    global: {
      statements: 45,
      branches: 35,
      functions: 40,
      lines: 45
    },
    // Critical areas with higher thresholds
    './src/utils/construction/': {
      statements: 85,
      branches: 65,
      functions: 95
    },
    './src/utils/validation/': {
      statements: 90,
      branches: 80,
      functions: 100
    },
    './src/services/conversion/': {
      statements: 85,
      branches: 65,
      functions: 100
    },
    './src/utils/serialization/': {
      statements: 90,
      branches: 85,
      functions: 100
    },
    './src/utils/temporal/': {
      statements: 95,
      branches: 100,
      functions: 100
    }
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
  ],  // Transform ES modules that Jest can't handle
  transformIgnorePatterns: [
    'node_modules/(?!(react-dnd|dnd-core|@react-dnd|react-dnd-html5-backend)/)',
  ],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
