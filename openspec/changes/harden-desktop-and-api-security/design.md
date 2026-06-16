# Design: Harden Desktop and API Security

## Context

The audit's completeness critic (Gaps 1, 2, 4 in
`docs/audits/2026-06-12-full-codebase-review.md`) named a security cluster the 12
scoped reviewers never owned, because it lives precisely in the boundary excluded
from typecheck and untested in CI. The verified facts this design builds on:

- `desktop/electron/main.ipc.ts:158/170/241` — three handlers take a raw
  renderer-supplied `filePath` to `fs.readFile`/`fs.writeFile`/(`restoreBackup`)
  with zero validation.
- `desktop/electron/main.window.ts:76-78` — `nodeIntegration:false`,
  `contextIsolation:true` (good); `:145-148` — `setWindowOpenHandler` calls
  `shell.openExternal(url)` unconditionally; no `will-navigate` handler exists
  anywhere in `desktop/` (grep-verified).
- `next.config.ts` — no `headers()` function, no CSP (full read; file ends at the
  `env` block).
- `tsconfig.json:31` — `desktop/**/*` is in `exclude`, so `pr-checks.yml:125`
  (`npx tsc --noEmit`) skips it; no workflow runs the desktop Jest suite.
- `src/pages/api/multiplayer/auth/token.ts:126` calls `unlockIdentity` →
  `IdentityService.ts:41` `PBKDF2_ITERATIONS = 100000`, with no throttle on the
  unauthenticated POST route.
- `src/pages/api/multiplayer/matches/index.ts:84-125` — hand-rolled `isValidBody`
  typeof guard (the only `safeParse` in the api tree is `TeamLayoutSchema` at `:96`).
- `openspec/specs/api-layer/spec.md:1386` — `## Non-Goals` lists "Rate limiting -
  Future enhancement" and "Authentication middleware - Future enhancement".

The hardening must be *additive and defensive*: it cannot break the legitimate
desktop file flows (save/open via native dialog → write/read the chosen path) or the
legitimate API callers. The native dialogs (`save-file`/`open-file`/`select-directory`
at `main.ipc.ts:134-192`) already return user-chosen absolute paths; confinement
must allow those flows while rejecting renderer-fabricated paths outside the sandbox.

## Decisions

### D1. Sandbox-root allowlist for file IPC, by resolved-path containment

`read-file`/`write-file`/`restore-backup` resolve the incoming path with
`fs.realpath` (falling back to `path.resolve` when the target does not yet exist for
writes) and assert it is contained within one of an explicit set of allowed roots:
the Electron `userData` data directory (`userDataPath`/`data`, already used at
`main.window.ts:163-166`) and the configured backup directory from
`SettingsService`. Containment is checked with a normalized `path.relative(root,
resolved)` test that rejects results starting with `..` or that are absolute.
**Rationale:** the audit's vector is *renderer-supplied* arbitrary paths; the legit
flows write/read inside app-managed directories. Resolving the real path first
defeats symlink and `..` traversal — a string-prefix check alone is insufficient.
A path outside all roots is rejected with `{ success: false, error: 'Path outside
sandbox root' }` and never reaches `fs`.

### D2. CSP in two places — `next.config.ts` headers AND main-process pin

The renderer is served by Next over HTTP, so the primary CSP is a `headers()` rule
in `next.config.ts` (default-src 'self'; script-src 'self' plus a build-pinned
nonce/hash for any required inline; style-src 'self' 'unsafe-inline' only if the
current build truly needs it, tightened where possible; `frame-ancestors 'none'`;
`object-src 'none'`; `base-uri 'self'`). Because the packaged build loads
`http://127.0.0.1:3001` from a spawned standalone server (`main.window.ts:168-203`),
the main process *also* pins the policy via
`session.defaultSession.webRequest.onHeadersReceived`, so a stripped or missing
header cannot leave the renderer policy-free. **Rationale:** defense in depth across
the two delivery paths (dev `loadURL('http://localhost:3600')` and packaged
`loadURL('http://127.0.0.1:3001')`); the spec asserts the *effect* (a CSP is
enforced on the loaded renderer), not a single mechanism.

### D3. Navigation + external-link allowlists are origin/scheme exact-match, deny-by-default

`will-navigate` compares the target URL's origin against the single expected app
origin for the current mode (`http://localhost:3600` in dev, `http://127.0.0.1:3001`
packaged) and `preventDefault()`s anything else. `setWindowOpenHandler` parses the
url with the WHATWG `URL` parser and only calls `shell.openExternal` when the scheme
is in `{ 'https:', 'mailto:' }` (HTTP downgraded-to-deny; `file:`/`javascript:`/all
others denied). Both default to deny on parse failure. **Rationale:** an allowlist
that fails closed is the only safe shape for a shell-out in a signed binary; the
audit's specific finding is the *unconditional* `openExternal`.

### D4. Rate limiting flips from "future" to "present" — decision change, scoped to abuse surface

The `api-layer` `## Non-Goals` block currently disclaims rate limiting and auth
middleware. This change **explicitly reverses that for three endpoints**: the
unauthenticated `POST /api/multiplayer/auth/token` (PBKDF2-cost DoS), the
unauthenticated `POST /api/vault/identity/unlock` (same KDF cost), and
authenticated `POST /api/multiplayer/matches` (unbounded match creation, audit
cluster MP med). A per-identifier sliding-window limiter (keyed on client IP, and
on verified player id where available) returns 429 + `Retry-After` over limit. The
limiter is in-process (a `Map`-backed window) consistent with the current
single-process server model — **honest spec state:** the delta says the limiter is
process-local and that a shared store is a named follow-up for multi-instance
deployment, rather than over-claiming a distributed limiter the code will not have.
**Rationale:** the KDF-cost vector is live and cheap to exploit; a process-local
limiter closes it for the actual single-process deployment without inventing
infrastructure that does not exist.

### D5. Shared boundary helper, applied to abuse-surface routes first

A new `src/lib/api/` module exports: a `parseBody(schema, req, res)` Zod helper that
returns the typed value or writes a structured 400; the rate limiter; and a
`applySecurityHeaders(res)` helper. The three abuse-surface routes adopt all three.
Full-tree Zod rollout across the remaining 69 routes is a named follow-up that reuses
the proven helper — **not** folded into this change to keep the diff reviewable and
the security teeth landing fast. **Rationale:** simplest-solution-first — land the
helper + the highest-value applications, prove the pattern, roll out behind it.

### D6. Desktop CI lane is a real gate, wired into the existing aggregator

Two CI additions: (a) the desktop sources become typechecked — either by removing
`desktop/**/*` from `tsconfig.json` exclude (if the root project can compile them) or
by adding a dedicated `tsc --noEmit -p desktop/tsconfig.json` step; (b) a new
`desktop-tests` job runs the desktop Jest suite. Both are added to the
`lint-and-test` aggregator's `needs` array (`pr-checks.yml:425-440`) so the existing
required-check name `Lint and Test` now transitively gates on them — no branch-
protection rename needed (MEMORY: the aggregator exists precisely to preserve that
required-check name). **Rationale:** the audit's Gap 2 is that desktop correctness is
gated only by "compiles + packages"; the fix must move desktop into the *blocking*
lane, and the aggregator is the seam that does that without touching branch
protection.

## Open Questions

(none)

## Risks

- **CSP breaks the renderer.** A too-strict `script-src`/`style-src` can blank the
  Next app. Mitigation: land the CSP in `Report-Only` mode first in the
  implementation, observe violations against the real app, then enforce; the delta
  asserts the *enforced* end state and the tasks include a report-only shake-out
  step.
- **Path confinement breaks a legitimate flow.** If any production caller writes
  outside the `userData`/backup roots (e.g. exporting to a user-chosen Documents
  path via the save dialog), confinement would reject it. Mitigation: the allowlist
  must include the directory of any path returned by the native save/open dialogs
  for the current operation — investigation task 1.2 enumerates the real call sites
  before the roots are fixed.
- **Rate limiter false-positives behind a shared NAT/proxy.** IP-keyed limiting can
  throttle multiple legitimate users behind one egress IP. Mitigation: window/limit
  sized generously for the KDF-DoS goal (block automation, not humans); key on
  verified player id in addition to IP where a token is present.
- **Desktop typecheck surfaces pre-existing errors.** Removing the exclude may reveal
  latent desktop type errors that were never compiled in the root project.
  Mitigation: task 1.3 runs the desktop typecheck first as evidence and scopes any
  pre-existing breakage as in-change fixes (it blocks the lane either way).
- **Two-place CSP drift.** The `next.config.ts` header and the `onHeadersReceived`
  pin can diverge. Mitigation: derive both from a single exported policy constant.
