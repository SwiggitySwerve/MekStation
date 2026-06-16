# Tasks: Harden Desktop and API Security

## 1. Investigation and red-first evidence

- [ ] 1.1 Write a red-first desktop IPC probe: a Jest test that invokes the
      `read-file`/`write-file` handlers from `desktop/electron/main.ipc.ts` with a
      `filePath` outside the app-data root (e.g. an absolute path to a sibling file)
      and asserts today's handler reads/writes it — proving the
      `main.ipc.ts:158/170` arbitrary-path vector is live before the fix.
- [ ] 1.2 Enumerate every production caller of `electronAPI.readFile`/`writeFile`/
      `restoreBackup` (renderer side) and record which directories their paths can
      legitimately resolve to (native-dialog-chosen paths vs app-managed paths) — this
      fixes the D1 allowlist roots and de-risks the "confinement breaks a legit flow"
      risk. Document the root set in the PR description.
- [ ] 1.3 Run `npx tsc --noEmit` against the desktop sources (after a trial removal of
      `desktop/**/*` from `tsconfig.json:31`, or via `desktop/tsconfig.json`) and
      record any pre-existing type errors; scope them as in-change fixes (resolves D6
      surface risk).
- [ ] 1.4 Write a red-first API probe: a test that fires N rapid
      `POST /api/multiplayer/auth/token` requests and measures that each currently runs
      the full PBKDF2 (`IdentityService.ts:41`, 100k iterations) with no 429 —
      demonstrating the KDF-cost DoS surface is unthrottled today.

## 2. Desktop file IPC path confinement

- [ ] 2.1 Add a `resolveWithinSandbox(filePath, allowedRoots)` helper (in
      `desktop/electron/` or a `desktop/services/local/` module) that `realpath`-resolves
      the target (or `path.resolve` for not-yet-existing write targets), then asserts
      containment via a `path.relative` check rejecting `..`/absolute escapes.
- [ ] 2.2 Wire `resolveWithinSandbox` into the `read-file` (`main.ipc.ts:158`),
      `write-file` (`:170`), and `restore-backup` (`:241`) handlers; reject
      out-of-root paths with `{ success: false, error: 'Path outside sandbox root' }`
      (and `false` for `restore-backup`) before any `fs` call.
- [ ] 2.3 Build the allowed-root set from the Electron `userData` data dir
      (`main.window.ts:163` pattern) and the `SettingsService` backup directory; pass
      it into `setupIpcHandlers` via `IMainIpcContext`.
- [ ] 2.4 Add unit tests covering: in-root read/write succeeds; out-of-root read/write
      rejected; `..` traversal rejected; symlink-to-outside rejected; task 1.1's red
      probe now passes (out-of-root denied).

## 3. Desktop CSP, navigation, and openExternal hardening

- [ ] 3.1 Define a single exported CSP policy constant (e.g.
      `desktop/electron/securityPolicy.ts`) and add `headers()` to `next.config.ts`
      emitting that CSP plus `X-Content-Type-Options`, `Referrer-Policy`,
      `X-Frame-Options: DENY`. Land it `Content-Security-Policy-Report-Only` first.
- [ ] 3.2 Pin the same policy in the desktop main process via
      `session.defaultSession.webRequest.onHeadersReceived` in `main.window.ts` so the
      packaged `127.0.0.1:3001` load is covered regardless of upstream headers.
- [ ] 3.3 Add a `will-navigate` handler to `mainWindow.webContents` in `main.window.ts`
      that `preventDefault()`s any navigation whose origin is not the expected app
      origin (`localhost:3600` dev / `127.0.0.1:3001` packaged).
- [ ] 3.4 Replace the unconditional `shell.openExternal(url)` in
      `setWindowOpenHandler` (`main.window.ts:145-148`) with a WHATWG-`URL`-parsed
      scheme allowlist (`https:`, `mailto:`); deny (no open) on any other scheme or on
      parse failure.
- [ ] 3.5 Shake out CSP violations against the running renderer (report-only), tighten
      `script-src`/`style-src` to the minimum the real app needs, then flip the header
      to enforcing `Content-Security-Policy`.
- [ ] 3.6 Add tests/assertions: window factory registers a `will-navigate` handler and
      an `onHeadersReceived` CSP pin; `openExternal` is called for `https:` and NOT for
      `file:`/`javascript:`.

## 4. Desktop verification coverage in CI

- [ ] 4.1 Bring desktop sources into a typechecked surface (remove `desktop/**/*` from
      `tsconfig.json:31` if the root project compiles them, else add a dedicated
      `desktop` typecheck step) and fix any errors surfaced by task 1.3.
- [ ] 4.2 Add a `desktop-tests` job to `.github/workflows/pr-checks.yml` that installs
      and runs the desktop Jest suite (`desktop/` working dir).
- [ ] 4.3 Add the new desktop typecheck + `desktop-tests` jobs to the `lint-and-test`
      aggregator `needs` array (`pr-checks.yml:425-440`) so the required `Lint and Test`
      check transitively gates on them — confirm no branch-protection rename is needed.

## 5. API boundary validation, rate limiting, and headers

- [ ] 5.1 Create `src/lib/api/` boundary module: `parseBody(schema, req, res)` (Zod
      parse → typed value or structured 400), `rateLimit(key, opts)`
      (process-local sliding-window `Map`, returns allow/deny + `Retry-After`), and
      `applySecurityHeaders(res)` (`X-Content-Type-Options: nosniff`,
      `Referrer-Policy`, `X-Frame-Options: DENY`, same-origin CORS).
- [ ] 5.2 Author Zod schemas for the abuse-surface route bodies and replace the
      hand-rolled guards: `POST /api/multiplayer/matches` (replace `isValidBody`,
      `matches/index.ts:84`) and `POST /api/multiplayer/auth/token`
      (`token.ts` body `{password, displayName?, ttlMs?}`).
- [ ] 5.3 Apply `rateLimit` in front of the KDF/creation work in
      `token.ts:126` (before `unlockIdentity`), `vault/identity/unlock.ts` (before its
      unlock), and `matches/index.ts` (before `createMatch`); return 429 + `Retry-After`
      over limit.
- [ ] 5.4 Apply `applySecurityHeaders` on the responses of the three hardened routes.
- [ ] 5.5 Add an API boundary integration suite: malformed body → 400 before any
      KDF/store work; over-limit → 429 with `Retry-After`; well-formed under-limit →
      normal path; security headers present on responses; task 1.4's red probe now
      throttles.

## 6. Verification and documentation

- [ ] 6.1 Full verification: `npx tsc --noEmit` (now including desktop), lint, the new
      desktop Jest lane, the API boundary suite, and the existing affected suites all
      green; `npm run build` + `desktop/ npm run build` still pack.
- [ ] 6.2 Run `npx openspec validate harden-desktop-and-api-security --strict` and
      confirm it reports valid.
- [ ] 6.3 Update `docs/audits/2026-06-12-full-codebase-review.md` cluster S / Gaps
      1,2,4 status to reflect the closed items; file the named follow-up (full-tree
      Zod rollout across the remaining ~69 API routes, and a shared-store rate limiter
      for multi-instance deployment) as a deferred task.
