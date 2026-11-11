// Dedicated Jest config for the runtime-path BV capture (scripts/runtime-path-bv/capture.jest.js).
// It sits outside the `unit` and `a11y` projects on purpose: the capture is a whole-catalog run
// launched by scripts/runtime-path-bv/run.mjs, never by default test discovery, and its file name
// does not match `*.test.*`. Same SWC transform, `@/` alias and jsdom environment as `unit`.
module.exports = {
  rootDir: '../..',
  roots: ['<rootDir>/scripts/runtime-path-bv'],
  testMatch: ['<rootDir>/scripts/runtime-path-bv/capture.jest.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
  },
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
  transformIgnorePatterns: [
    'node_modules/(?!(react-dnd|dnd-core|@react-dnd|react-dnd-html5-backend|react-window)/)',
  ],
  testTimeout: 1800000,
};
