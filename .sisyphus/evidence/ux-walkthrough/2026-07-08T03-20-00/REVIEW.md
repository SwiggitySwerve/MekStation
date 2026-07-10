# UX Walkthrough Review - 2026-07-08T03-20-00

## TL;DR

- Reviewer summary: \_\_\_
- Release/blocker call: \_\_\_
- Follow-up owner: \_\_\_

## Run Summary

- Build mode: development
- Started: 2026-07-08T09:20:06.898Z
- Finished: 2026-07-08T09:21:10.459Z
- Journeys: 1 (1 failed)
- Steps: 4 (2 failed, 1 with console/page errors)
- Findings: 3

## Journeys

### 09-coop-multiplayer-two-client (failed)

- Persona: host and guest proving co-op campaign and 1v1 lobby handoff surfaces
- Viewport: 1280x720
- Started: 2026-07-08T09:20:06.898Z
- Finished: 2026-07-08T09:21:10.258Z

#### Steps

- [ok] 1. seed host and guest vault identities (default)
  - Route: about:blank
  - Screenshot: 09-coop-multiplayer-two-client/01-seed-host-and-guest-vault-identities.png
  - Duration: 866 ms
- [failed] 2. host creates and guest joins co-op campaign (default)
  - Route: /gameplay/campaigns
  - Screenshot: 09-coop-multiplayer-two-client/02-host-creates-and-guest-joins-co-op-campaign-FAILED.png
  - Duration: 50514 ms
  - Failure: Error: [2mexpect([22m[31mpage[39m[2m).[22mtoHaveURL[2m([22m[32mexpected[39m[2m)[22m failed Expected pattern: [32m/\/gameplay\/campaigns\/[^/]+$/[39m Received string: [31m"http://localhost:3600/gameplay/campaigns"[39m Timeout: 40000ms Call log: [2m - Expect "toHaveURL" with timeout 40000ms[22m [2m 43 × unexpected value "http://localhost:3600/gameplay/campaigns"[22m
  - Console/page errors: 1
- [ok] 3. skip guest ledger check because co-op join did not connect (guest)
  - Route: /gameplay/campaigns
  - Screenshot: 09-coop-multiplayer-two-client/03-skip-guest-ledger-check-because-co-op-join-did-not-connect.png
  - Duration: 1325 ms
- [failed] 4. host creates 1v1 match and guest joins lobby (default)
  - Route: /multiplayer
  - Screenshot: 09-coop-multiplayer-two-client/04-host-creates-1v1-match-and-guest-joins-lobby-FAILED.png
  - Duration: 10623 ms
  - Failure: TimeoutError: page.waitForResponse: Timeout 10000ms exceeded while waiting for event "response"

#### Findings

- C3 (major): Harness uses MULTIPLAYER_STORE=durable for Playwright; it does not reproduce the plain-dev in-memory split-store C3 path. Host campaign=none, guest campaign=none, host badge=none, guest badge=none, join error=none.
  - Evidence: step 2 (host creates and guest joins co-op campaign): 09-coop-multiplayer-two-client/02-host-creates-and-guest-joins-co-op-campaign-FAILED.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
- COOP-GUEST-LEDGER-SKIPPED (minor): Guest ledger projection check was skipped because the co-op join never reached a guest campaign route.
  - Evidence: step 3 (skip guest ledger check because co-op join did not connect): 09-coop-multiplayer-two-client/03-skip-guest-ledger-check-because-co-op-join-did-not-connect.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
- MULTIPLAYER-LOBBY-SEAT-STATE (major): 1v1 lobby occupied=false; host alpha="missing", host bravo="missing", guest alpha="missing", guest bravo="missing".
  - Evidence: step 4 (host creates 1v1 match and guest joins lobby): 09-coop-multiplayer-two-client/04-host-creates-1v1-match-and-guest-joins-lobby-FAILED.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
