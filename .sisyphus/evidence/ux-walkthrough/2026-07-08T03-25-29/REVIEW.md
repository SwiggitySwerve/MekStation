# UX Walkthrough Review - 2026-07-08T03-25-29

## TL;DR

- Reviewer summary: \_\_\_
- Release/blocker call: \_\_\_
- Follow-up owner: \_\_\_

## Run Summary

- Build mode: development
- Started: 2026-07-08T09:25:35.857Z
- Finished: 2026-07-08T09:25:54.030Z
- Journeys: 1 (0 failed)
- Steps: 4 (0 failed, 0 with console/page errors)
- Findings: 3

## Journeys

### 09-coop-multiplayer-two-client (ok)

- Persona: host and guest proving co-op campaign and 1v1 lobby handoff surfaces
- Viewport: 1280x720
- Started: 2026-07-08T09:25:35.857Z
- Finished: 2026-07-08T09:25:53.736Z

#### Steps

- [ok] 1. seed host and guest vault identities (default)
  - Route: about:blank
  - Screenshot: 09-coop-multiplayer-two-client/01-seed-host-and-guest-vault-identities.png
  - Duration: 877 ms
- [ok] 2. host creates and guest joins co-op campaign (default)
  - Route: /gameplay/campaigns/campaign-1783502747789-nz1kkfj
  - Screenshot: 09-coop-multiplayer-two-client/02-host-creates-and-guest-joins-co-op-campaign.png
  - Duration: 12577 ms
- [ok] 3. skip guest ledger check because co-op join did not connect (guest)
  - Route: /gameplay/campaigns
  - Screenshot: 09-coop-multiplayer-two-client/03-skip-guest-ledger-check-because-co-op-join-did-not-connect.png
  - Duration: 1311 ms
- [ok] 4. host creates 1v1 match and guest joins lobby (default)
  - Route: /multiplayer/lobby/TTU2UA
  - Screenshot: 09-coop-multiplayer-two-client/04-host-creates-1v1-match-and-guest-joins-lobby.png
  - Duration: 2612 ms

#### Findings

- C3 (major): Harness uses MULTIPLAYER_STORE=durable for Playwright; it does not reproduce the plain-dev in-memory split-store C3 path. Host campaign=campaign-1783502747789-nz1kkfj, guest campaign=none, host badge=none, guest badge=none, join error=No room code rendered for host campaign..
  - Evidence: step 2 (host creates and guest joins co-op campaign): 09-coop-multiplayer-two-client/02-host-creates-and-guest-joins-co-op-campaign.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
- COOP-GUEST-LEDGER-SKIPPED (minor): Guest ledger projection check was skipped because the co-op join never reached a guest campaign route.
  - Evidence: step 3 (skip guest ledger check because co-op join did not connect): 09-coop-multiplayer-two-client/03-skip-guest-ledger-check-because-co-op-join-did-not-connect.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
- MULTIPLAYER-LOBBY-OCCUPIED (minor): 1v1 lobby occupied=true; host alpha="Alpha #1Deep Play HostNot readyLeaveReadySet AI", host bravo="Bravo #1pid_4G5a1xuDW55UuzmxrxKjsiDFMdScNot readySet AI", guest alpha="Alpha #1Deep Play HostNot ready", guest bravo="Bravo #1pid_4G5a1xuDW55UuzmxrxKjsiDFMdScNot readyLeaveReady".
  - Evidence: step 4 (host creates 1v1 match and guest joins lobby): 09-coop-multiplayer-two-client/04-host-creates-1v1-match-and-guest-joins-lobby.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
