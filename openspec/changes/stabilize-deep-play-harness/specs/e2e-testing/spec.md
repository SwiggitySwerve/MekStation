# e2e-testing — Delta for stabilize-deep-play-harness

## ADDED Requirements

### Requirement: Deep-Play Harness Rate-Limit Isolation

The API rate limiter SHALL be bypassed when — and only when — the process is running under the Playwright e2e harness, identified by the environment pair `NEXT_PUBLIC_E2E_MODE === 'true'` AND a set `PLAYWRIGHT_E2E_RUN_ID` (the pair the Playwright `webServer` config sets and nothing else sets). This isolation SHALL apply uniformly to every rate-limited route (token mint, match create, vault unlock) so back-to-back deep-play runs sharing one dev-server process and one client IP do not flap on HTTP 429. The bypass SHALL NOT engage in production, in a manually-started dev server, or in jest unit suites that assert real 429 behavior; if the jest environment can set the harness env pair, the bypass predicate SHALL additionally require the absence of a jest worker so those suites still exercise the limiter.

#### Scenario: Back-to-back harness runs do not flap on 429

- **GIVEN** the Playwright webServer running with `NEXT_PUBLIC_E2E_MODE='true'` and `PLAYWRIGHT_E2E_RUN_ID` set
- **WHEN** the deep-play journeys mint auth tokens, create matches, and unlock the vault more times than the standing 5-per-60s cap within one window across two consecutive runs
- **THEN** the rate limiter SHALL not reject any of those requests with HTTP 429
- **AND** the `"Lobby token mint failed with HTTP 429"` journey error SHALL NOT occur

#### Scenario: Production and manual dev servers keep the limiter

- **GIVEN** a process without both harness environment variables set (production, or a manually-started dev server)
- **WHEN** a rate-limited route receives more requests than the configured cap within the window
- **THEN** the limiter SHALL reject the excess with HTTP 429 and a `Retry-After` header exactly as before

#### Scenario: 429-asserting jest suites still exercise the limiter

- **GIVEN** a jest suite that asserts the limiter returns HTTP 429 when the cap is exceeded
- **WHEN** the suite runs
- **THEN** the bypass SHALL NOT disable the limiter for that suite
- **AND** the 429 assertions SHALL execute against the real limiter rather than passing vacuously

### Requirement: Deep-Play Playwright Project Scoping

The UX deep-play and UX-walkthrough audit specs SHALL be scheduled under exactly one desktop project (chromium) regardless of how Playwright is invoked, so a bare `npx playwright test` does not fan them out across the responsive projects and force multiple copies to contend for the single shared webServer, the single durable SQLite pair, and the single IP-keyed rate bucket. This scoping SHALL be declared at the Playwright configuration level (via `testIgnore` on the responsive projects), not by an in-spec `browserName` skip, because every configured project uses the same Chrome engine and cannot be distinguished by browser name.

#### Scenario: Deep-play spec runs only under the desktop project

- **WHEN** an operator runs `npx playwright test --list e2e/ux-deep-play-audit.spec.ts`
- **THEN** the listed tests SHALL be scheduled only under the chromium project
- **AND** the responsive projects (Mobile Chrome, Tablet Portrait, Tablet Landscape) SHALL NOT schedule the deep-play or UX-walkthrough specs

#### Scenario: Scripted entry points are unaffected

- **GIVEN** the scripted runners and CI already pass `--project=chromium`
- **WHEN** the walkthrough runner or a `verify:`/`qc:` script executes the deep-play or walkthrough specs
- **THEN** those runs SHALL continue to execute under chromium exactly as before, with no change to their scheduled test set
