# Desktop

## OVERVIEW

- Separate Electron package with its own `package.json`, lockfile, TypeScript config, Jest config, and native dependency lifecycle.
- Root Jest excludes this tree. Root Next output is an input to packaging, not the desktop build system.

## STRUCTURE

- `electron/`: main process, preload bridge, IPC, windows, menu, tray, updater, and security policy.
- `services/local/`: filesystem-backed settings, recent files, storage, and backup services.
- `installer/`: setup behavior. `scripts/`: standalone hydration, ABI rebuild, icons, security checks, and release publication.
- `dist/`, `build/`, `release/`, `.tmp/`: generated output; never edit by hand.

## WHERE TO LOOK

- Entry point: `electron/main.ts`; renderer bridge: `electron/preload.ts`.
- Trust boundaries: `electron/pathSandbox.ts`, `electron/securityPolicy.ts`, `electron/main.ipc.ts`, `electron/main.window.ts`.
- Package contract: `package.json`, `package-lock.json`, `tsconfig.json`, `../electron-builder.yml`.
- Packaging proof: `scripts/test-build.js`, `scripts/validate-packaged-security.js`, `scripts/rebuild-next-standalone.js`.

## CONVENTIONS

- Run commands from `desktop/` or use `npm --prefix desktop ...`; desktop dependency changes update only the desktop lockfile.
- Preload exposes a narrow renderer API; main-process handlers validate IPC input and filesystem paths.
- Preserve context isolation, sandboxing, navigation restrictions, external-link policy, and native-module ABI rebuilds.
- `rebuild:next-standalone` consumes a fresh root standalone build. Validate hydration before `pack` or `dist:*`.
- Keep platform installer behavior in `installer/` or platform-specific scripts; test main-process behavior at its boundary.
- Report platform/native limitations when a build smoke or packaged-security check cannot run.

## ANTI-PATTERNS

- Do not import browser-only root code into Electron main, widen IPC/filesystem access for convenience, or hand-edit compiled output.
- Do not package stale/missing `.next/standalone` content or treat root tests as desktop verification.
- Do not run `scripts/release/` publishers during local validation.
- Do not commit credentials, signing keys, update tokens, or machine-specific paths.

## COMMANDS

- `npm run type-check`, `npm run build`, `npm test`, `npm run lint`.
- Security: `npm run test:packaged-security`; packaging smoke: `npm run test:build:win`,
  `npm run test:build:mac`, or `npm run test:build:linux`.
- Integration smoke: `npm run dev:full`; unpacked package: `npm run pack`.
