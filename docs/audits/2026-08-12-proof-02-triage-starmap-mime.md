# proof-02-triage: starmap logistics MIME diagnostic

Dated audit for CAMP `proof-02-triage`. This document is the
source-controlled audit anchor for the single non-passing observation from
`proof-02-reproduction` exact-main at
`d34a197198a3b19d10ec332aefe7d055a5df8ef2`
(run `camp01-e8a70ce29fcf193ed1c709e5d8292f31`).

## Disposition

| Field | Value |
| --- | --- |
| observationId | `e2e/campaign-starmap-logistics.spec.ts::campaign starmap logistics::previews, approves, and reloads campaign travel consequences` |
| status | failed |
| failureFingerprint | `sha256:ce7ec763397b46091fb9e9a36c21ecda7ea255fc84b4433a8dd3601acb664144` |
| knownFailureCode | `development-mime-diagnostic` |
| severity | **low** |
| outcome | **lower-severity** |
| repairRowId | none |
| blocker | none |

`validateProof02Triage` only consumes non-passing observations. The other nine
Playwright results passed. Two of those passed with known codes
(`guest-badge-timing`, `save-conflict-timing`) and are therefore **not** in
the triage set.

The historical anchor for this test id allows `passed|failed|missing`. The
PROOF-02 cause graph requires `repair-required` or `external-blocker` only
when the root severity is `critical` or `major`. A known-failure MIME
diagnostic is `low`, so the terminal outcome is `lower-severity`. This wave
does **not** open `proof-02-required-repairs`. The next WAVE_CONTRACTS row
after triage cleanup is **CAMP-00**.

## Cause

Chromium logged:

> Refused to execute script from
> `http://localhost:3600/_next/static/development/_clientMiddlewareManifest.js`
> because its MIME type (`application/json`) is not executable.

`e2e/helpers/browserDiagnosticsModel.ts` treats every non-`requestfailed`
console/pageerror event as fatal. `withBrowserDiagnostics` then fails at
`assertNoErrors` (`e2e/helpers/browserDiagnostics.ts`) even when the
starmap travel preview/approve/reload journey itself did not assert a
product mismatch.

`server.js` already intercepts that exact pathname through
`serveDevClientMiddlewareManifest`
(`src/lib/server/devClientMiddlewareManifest.js`) and, when
`.next/dev/static/development/_clientMiddlewareManifest.js` exists, serves
it as `application/javascript`. When that file is missing (`ENOENT`), the
interceptor returns false and Next's development handler may emit JSON at
the `.js` URL. That is a Next dev-server diagnostic, not a campaign
logistics, persistence, or construction-rules defect.

CAMP-01H already carries `developmentMimeRegressionCovered===true`. Proof-02
records the observation; it does not re-litigate the H regression cover.

## Why this is not a product repair

1. The failure code is the contracted `development-mime-diagnostic` for this
   historical anchor, not an unknown fingerprint.
2. No campaign travel, funds, or reload assertion failed; the spec aborted
   on the browser diagnostic gate.
3. A controller/product repair would not change the MIME race: the interceptor
   is already present, and H owns the regression cover.
4. Opening a `proof-02-repair-*` row would violate the cause-graph rule that
   non-high severity roots must be `lower-severity`.

## Scope

One markdown file under `docs/audits/`. No binaries. No product runtime
edits. Cap subject is `audit-pr` (max 5 files / 300 changed lines).
