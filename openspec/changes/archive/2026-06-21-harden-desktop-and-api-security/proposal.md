# Change: Harden Desktop and API Security

## Why

The 2026-06-12 full codebase review (`docs/audits/2026-06-12-full-codebase-review.md`)
elevated a critic-found, critical-class cluster (cluster **S**, completeness-critic
Gaps 1, 2, 4) that the 12 scoped reviewers left unowned. These are real, live gaps
in a signed, auto-updating, end-user binary and the HTTP server that backs it:

- **Renderer-reachable arbitrary file read/write.** The Electron `read-file`,
  `write-file`, and `restore-backup` IPC handlers pass a raw renderer-supplied
  `filePath` straight to `fs` with no validation, no sandbox root, and no allowlist
  (`desktop/electron/main.ipc.ts:158` reads any path; `:170`/`:171` writes any path;
  `:241` restores from any path). `nodeIntegration:false`/`contextIsolation:true` are
  correctly set (`desktop/electron/main.window.ts:77-78`), so this is the *residual*
  gap — a compromised or malicious renderer can read or overwrite any file the user
  account can touch.
- **No Content-Security-Policy anywhere.** `next.config.ts` has no `headers()` async
  function (confirmed by full read; the file ends at the `env` block, line 254), so
  the renderer — a full Next.js app loaded over `http://127.0.0.1:3001`
  (`main.window.ts:203`) — runs with no CSP, no `frame-ancestors`, no script-src
  restriction.
- **No `will-navigate` guard.** `main.window.ts` registers no `will-navigate`
  handler (verified by grep — the only navigation hook is `setWindowOpenHandler`),
  so the renderer can be navigated to an arbitrary origin in-window.
- **Unguarded `shell.openExternal`.** `setWindowOpenHandler` blindly calls
  `shell.openExternal(url)` for *any* url before returning `{ action: 'deny' }`
  (`main.window.ts:145-148`) — no scheme allowlist, no host check, so a
  `file://` or other-scheme url from renderer content opens through the OS.

The same review also found the desktop target is **invisible to the verification
gate** (Gap 2): `tsconfig.json:31` excludes `desktop/**/*` from the typechecked
project, so the PR `typecheck` job (`pr-checks.yml:125`, `npx tsc --noEmit`) never
compiles desktop sources; and the desktop's own Jest suite is invoked by **no**
workflow — `pr-checks.yml` only `tsc`-compiles desktop via `desktop/ npm run build`
(`:480-483`) and packages it via `electron-builder --dir` (`:561`). A whole platform
target's correctness is gated only by "compiles + packages."

On the API side (Gap 4, plus medium findings in cluster MP): the 72 `src/pages/api`
route files have **zero Zod** schema validation at the boundary (the lone
`safeParse` is `TeamLayoutSchema.safeParse` *inside* the hand-rolled `isValidBody`
typeof-guard at `src/pages/api/multiplayer/matches/index.ts:96`), **no rate
limiting** (the unauthenticated `POST /api/multiplayer/auth/token` route at
`src/pages/api/multiplayer/auth/token.ts:126` runs `unlockIdentity` → PBKDF2 at
`PBKDF2_ITERATIONS = 100000` on `src/services/vault/IdentityService.ts:41` per
request with no throttle — a KDF-cost DoS vector), **no security response headers**,
and **no CORS posture**. The `api-layer` spec's own `## Non-Goals` block
(`openspec/specs/api-layer/spec.md:1386`) marks rate limiting and auth middleware as
"Future enhancement" — this change makes that future the present for the most
abusable endpoints.

This is the audit's Wave 3 security change. It hardens the boundary the existing
correct cores sit behind; it does not touch combat, campaign, or multiplayer
transport wiring (owned by other Wave 1/2 changes).

## What Changes

- **Confine desktop file IPC to an allowlisted app-data root.** `read-file`,
  `write-file`, and `restore-backup` validate and normalize the incoming `filePath`
  against an allowlist of resolved sandbox roots (the Electron `userData` data
  directory and the configured backup directory) before any `fs` call; paths that
  resolve outside the allowed roots are rejected with a structured error and never
  reach `fs`. Symlink and `..` traversal are defeated by resolving the real path and
  re-checking containment.
- **Add a strict Content-Security-Policy.** `next.config.ts` gains a `headers()`
  function that emits a CSP (default-src 'self', no inline/eval script unless a
  build-pinned nonce/hash is used, `frame-ancestors 'none'`, `object-src 'none'`)
  plus the supporting security headers; the desktop main process additionally pins
  the policy via `session.webRequest.onHeadersReceived` so the packaged
  `127.0.0.1:3001` load is covered even if a header is stripped.
- **Add a `will-navigate` allowlist.** `main.window.ts` registers a `will-navigate`
  handler that `preventDefault()`s any navigation whose target origin is not the
  expected local app origin (dev `localhost:3600` / packaged `127.0.0.1:3001`).
- **Validate `openExternal` scheme + host.** `setWindowOpenHandler` parses the url
  and only calls `shell.openExternal` for an allowlisted scheme set (`https:`, and
  `mailto:`); all other schemes (including `file:`, `javascript:`) are denied
  without opening.
- **Put the desktop target in a CI lane.** Remove `desktop/**/*` from the
  typechecked surface (or add a dedicated desktop `tsc --noEmit` step) and add a CI
  step that runs the desktop Jest suite, both wired into the `Lint and Test`
  aggregator's `needs` chain so a desktop regression fails a PR.
- **Add API boundary schema validation.** Introduce a shared Zod-parse helper at the
  request boundary and apply it to the abuse-surface mutation routes first
  (`/api/multiplayer/auth/token`, `/api/multiplayer/matches`), replacing the
  hand-rolled `typeof` guards; malformed bodies return a structured 400 before any
  KDF or store work.
- **Rate-limit the auth and token endpoints.** Add a per-identifier (IP +
  optional player id) sliding-window limiter in front of
  `/api/multiplayer/auth/token`, `/api/vault/identity/unlock`, and
  `/api/multiplayer/matches` (create), so PBKDF2 work and unbounded match creation
  cannot be driven without bound; over-limit requests return 429 with `Retry-After`.
- **Add security response headers to the API surface.** Emit
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`
  (consistent with the CSP `frame-ancestors`), and an explicit same-origin CORS
  posture on API responses.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `desktop-experience`: ADDS a Content-Security-Policy enforcement requirement and a
  renderer navigation / external-link hardening requirement (`will-navigate`
  allowlist + `openExternal` scheme/host validation).
- `desktop-local-services`: MODIFIES the existing "File System Access" requirement to
  mandate sandbox-root path confinement on `read-file`/`write-file`/`restore-backup`;
  ADDS a "Desktop Verification Coverage in CI" requirement (typecheck + Jest lane).
- `api-layer`: ADDS boundary schema-validation, authentication rate-limiting, and
  security-response-header requirements over the existing REST surface.

## Impact

- `desktop/electron/main.ipc.ts` (`read-file`/`write-file`/`restore-backup` path
  confinement), `desktop/electron/main.window.ts` (`will-navigate` guard,
  `openExternal` scheme/host validation, `onHeadersReceived` CSP pin).
- `next.config.ts` (new `headers()` CSP + security headers).
- `tsconfig.json` (desktop typecheck surface) + `.github/workflows/pr-checks.yml`
  (desktop typecheck + Jest lane wired into the `lint-and-test` aggregator).
- `src/pages/api/multiplayer/auth/token.ts`, `src/pages/api/multiplayer/matches/index.ts`,
  `src/pages/api/vault/identity/unlock.ts` (Zod boundary validation + rate limiting +
  headers); a new shared `src/lib/api/` boundary helper module (validation, limiter,
  headers).
- New / extended test suites: desktop IPC path-confinement unit tests, an API
  boundary-validation + rate-limit integration suite, and a CSP/navigation assertion
  for the desktop window factory.

## Non-goals

- No change to multiplayer transport wiring, co-op registration, or the WebSocket
  stub (owned by `reconcile-multiplayer-coop-reality`, Wave 2). The token/match
  routes are hardened where they sit; whether they are *reachable end-to-end* is that
  change's concern.
- No broad rewrite of all 72 API routes to Zod in this change — the helper lands and
  is applied to the abuse-surface routes (auth/token, identity/unlock, match-create);
  full-tree rollout is a named follow-up that uses the proven helper.
- No new IPC channels or new file operations — this confines the three existing
  unconfined handlers, it does not add capability.
- No production code is edited by this change folder itself; this is the remediation
  plan. Implementation lands under the tasks below.
