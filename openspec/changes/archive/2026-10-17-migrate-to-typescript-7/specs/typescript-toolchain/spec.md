## ADDED Requirements

### Requirement: Type-check gates run the TypeScript 7 compiler

Every type-check gate SHALL run a TypeScript compiler whose major version is 7:

- the root `typecheck` package script;
- the lint-staged pre-commit type check;
- the pull-request workflow `Type Check` job;
- the roadmap main-proof `tsc` step;
- the desktop `type-check` and `build` scripts.

A root gate SHALL invoke the TypeScript 7 entry point by explicit path, or through the root `typecheck` script. It SHALL NOT invoke a bare `tsc`, `npx tsc`, or `node_modules/typescript/bin/tsc`, because in the root package those resolve to the TypeScript 6 compatibility package.

A repository test SHALL fail when any of these gates resolves a compiler whose major version is not 7.

#### Scenario: Root type check resolves TypeScript 7

- **GIVEN** the root package installs the TypeScript 6 compatibility package under the `typescript` name and TypeScript 7 under a separate alias
- **WHEN** `npm run typecheck` runs
- **THEN** the compiler that executes SHALL report a 7.x version
- **AND** the pull-request `Type Check` job and the pre-commit type check SHALL run that same script.

#### Scenario: A gate pointed at the compatibility compiler is rejected

- **GIVEN** a change points a root type-check gate at bare `tsc`, `npx tsc`, or `node_modules/typescript/bin/tsc`
- **WHEN** the repository test suite runs
- **THEN** the toolchain guard test SHALL fail and name the offending gate.

### Requirement: Compiler API consumers are isolated on the TypeScript 6 compatibility package

Until TypeScript 7 ships a supported JavaScript compiler API, the root `typescript` dependency SHALL resolve to the TypeScript 6 compatibility package. Only tools that load the compiler API SHALL use it, and no type-check gate SHALL depend on its diagnostics.

The desktop package SHALL NOT depend on the compiler API, so that its `typescript` dependency can be TypeScript 7 directly.

#### Scenario: Parser-only tooling keeps working

- **GIVEN** the migration is complete
- **WHEN** a repository script that calls `createSourceFile` or the `ts.is*` node guards runs
- **THEN** `require('typescript').version` SHALL report a 6.x version
- **AND** the script SHALL produce the same result it produced before the migration.

#### Scenario: Desktop tests do not load the compiler API

- **GIVEN** the desktop package depends on TypeScript 7
- **WHEN** the desktop Jest suite runs
- **THEN** its transform SHALL NOT require the TypeScript compiler API
- **AND** the desktop `type-check` script SHALL type-check the test sources with the TypeScript 7 compiler.

### Requirement: TypeScript configurations carry no removed or deprecated options

No `tsconfig*.json` file maintained in this repository SHALL use the following options, which TypeScript 6 deprecates and TypeScript 7 removes:

- `target: "es5"`;
- `baseUrl`;
- `moduleResolution: "node"` / `"node10"`.

No such file SHALL set `ignoreDeprecations`.

Path aliases SHALL be expressed as `paths` entries relative to the declaring configuration file.

#### Scenario: Configurations compile on TypeScript 6 without deprecation suppression

- **GIVEN** the root and desktop TypeScript configurations
- **WHEN** they are type-checked with TypeScript 6.0 and no `ignoreDeprecations`
- **THEN** no deprecation diagnostic SHALL be reported.

#### Scenario: The source alias resolves without baseUrl

- **GIVEN** the root configuration maps `@/*` to `./src/*` without `baseUrl`
- **WHEN** application code, Jest suites, Storybook and `tsx` scripts import through `@/`
- **THEN** each import SHALL resolve to the same module it resolved to before the change.

### Requirement: Desktop emit is unchanged by the compiler migration

At migration time, the desktop `build` output compiled by TypeScript 7 SHALL be byte-identical to the previous compiler's output for every emitted `.js` file. Source map and declaration differences are permitted and SHALL be listed in the migration pull request.

#### Scenario: Desktop JavaScript is byte-identical

- **GIVEN** desktop builds produced before and after the compiler change from the same source
- **WHEN** every emitted `.js` file is compared byte for byte
- **THEN** no `.js` file SHALL differ.
