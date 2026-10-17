/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/services', '<rootDir>/electron'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  // @swc/jest strips types without checking them; `npm run type-check` runs
  // `tsc -p tsconfig.test.json --noEmit` so the tests stay type-checked.
  // The options mirror tsconfig.json: ES2020, experimentalDecorators,
  // emitDecoratorMetadata, and CommonJS output for Jest.
  transform: {
    '^.+\\.ts$': [
      '@swc/jest',
      {
        swcrc: false,
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
            useDefineForClassFields: false,
          },
          target: 'es2020',
        },
        // SWC hoists imports above other statements (ESM order); ts-jest kept
        // source order. The electron tests build `const mock*` objects that
        // their jest.mock('electron') factories read, so electron is
        // required lazily, on first use, after those objects exist.
        module: { type: 'commonjs', lazy: ['electron'] },
      },
    ],
  },
  collectCoverageFrom: [
    'services/**/*.ts',
    'electron/**/*.ts',
    '!services/**/__tests__/**',
    '!electron/**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};
