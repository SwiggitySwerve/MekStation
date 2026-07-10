# UX Walkthrough Review - 2026-07-08T04-24-19

## TL;DR

- Reviewer summary: \_\_\_
- Release/blocker call: \_\_\_
- Follow-up owner: \_\_\_

## Run Summary

- Build mode: development
- Started: 2026-07-08T10:24:36.349Z
- Finished: 2026-07-08T10:25:47.360Z
- Journeys: 3 (0 failed)
- Steps: 49 (0 failed, 1 with console/page errors)
- Findings: 10

## Journeys

### 08-sp-campaign-deep-loop (ok)

- Persona: player pushing a campaign from creation through a battle attempt and full sweep
- Viewport: 1280x720
- Started: 2026-07-08T10:24:36.349Z
- Finished: 2026-07-08T10:25:21.183Z

#### Steps

- [ok] 1. open campaign list (default)
  - Route: /gameplay/campaigns
  - Screenshot: 08-sp-campaign-deep-loop/01-open-campaign-list.png
  - Duration: 11965 ms
- [ok] 2. start campaign wizard (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/02-start-campaign-wizard.png
  - Duration: 1318 ms
- [ok] 3. name campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/03-name-campaign.png
  - Duration: 467 ms
- [ok] 4. keep default mercenary campaign type (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/04-keep-default-mercenary-campaign-type.png
  - Duration: 434 ms
- [ok] 5. keep standard campaign preset (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/05-keep-standard-campaign-preset.png
  - Duration: 424 ms
- [ok] 6. add four units and four assigned pilots (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/06-add-four-units-and-four-assigned-pilots.png
  - Duration: 732 ms
- [ok] 7. submit campaign wizard and land on dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783506291725-e0dl3td
  - Screenshot: 08-sp-campaign-deep-loop/07-submit-campaign-wizard-and-land-on-dashboard.png
  - Duration: 827 ms
- [ok] 8. save campaign to server (default)
  - Route: /gameplay/campaigns/campaign-1783506291725-e0dl3td
  - Screenshot: 08-sp-campaign-deep-loop/08-save-campaign-to-server.png
  - Duration: 431 ms
- [ok] 9. open contract market (default)
  - Route: /gameplay/campaigns/campaign-1783506291725-e0dl3td/contract-market
  - Screenshot: 08-sp-campaign-deep-loop/09-open-contract-market.png
  - Duration: 1435 ms
- [ok] 10. accept first available contract (default)
  - Route: /gameplay/campaigns/campaign-1783506291725-e0dl3td/contract-market
  - Screenshot: 08-sp-campaign-deep-loop/10-accept-first-available-contract.png
  - Duration: 1453 ms
- [ok] 11. open campaign missions (default)
  - Route: /gameplay/campaigns/campaign-1783506291725-e0dl3td/missions
  - Screenshot: 08-sp-campaign-deep-loop/11-open-campaign-missions.png
  - Duration: 1381 ms
- [ok] 12. open mission launch briefing (default)
  - Route: /gameplay/campaigns/campaign-1783506291725-e0dl3td/missions/contract-1783506293355-s4iau1s/launch
  - Screenshot: 08-sp-campaign-deep-loop/12-open-mission-launch-briefing.png
  - Duration: 1333 ms
- [ok] 13. select roster and launch mission to pre-battle (default)
  - Route: /gameplay/encounters/encounter-1028529d-a136-421c-b65c-4a3b796939b5/pre-battle?campaignId=campaign-1783506291725-e0dl3td&missionId=contract-1783506293355-s4iau1s
  - Screenshot: 08-sp-campaign-deep-loop/13-select-roster-and-launch-mission-to-pre-battle.png
  - Duration: 2963 ms
- [ok] 14. attempt manual tactical play from pre-battle (default)
  - Route: /gameplay/games/92d28c1d-abff-43c3-a3b6-e588bdb94712?campaignId=campaign-1783506291725-e0dl3td&missionId=contract-1783506293355-s4iau1s
  - Screenshot: 08-sp-campaign-deep-loop/14-attempt-manual-tactical-play-from-pre-battle.png
  - Duration: 3741 ms
  - Console/page errors: 1
  - Notes: Known-fragile C1 surface; records current phase and movement affordances.
- [ok] 15. return to pre-battle and auto-resolve mission (default)
  - Route: /gameplay/games/5d780518-d0c8-4c45-bcf8-765eb8aea14a?campaignId=campaign-1783506291725-e0dl3td&missionId=contract-1783506293355-s4iau1s
  - Screenshot: 08-sp-campaign-deep-loop/15-return-to-pre-battle-and-auto-resolve-mission.png
  - Duration: 1582 ms
- [ok] 16. sweep missions surface (default)
  - Route: /gameplay/campaigns/campaign-1783506291725-e0dl3td/missions
  - Screenshot: 08-sp-campaign-deep-loop/16-sweep-missions-surface.png
  - Duration: 2361 ms
- [ok] 17. sweep campaign dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783506291725-e0dl3td
  - Screenshot: 08-sp-campaign-deep-loop/17-sweep-campaign-dashboard.png
  - Duration: 1260 ms
- [ok] 18. sweep finances surface (default)
  - Route: /gameplay/campaigns/campaign-1783506291725-e0dl3td/finances
  - Screenshot: 08-sp-campaign-deep-loop/18-sweep-finances-surface.png
  - Duration: 1392 ms
- [ok] 19. sweep personnel surface (default)
  - Route: /gameplay/campaigns/campaign-1783506291725-e0dl3td/personnel
  - Screenshot: 08-sp-campaign-deep-loop/19-sweep-personnel-surface.png
  - Duration: 1416 ms
- [ok] 20. sweep forces surface (default)
  - Route: /gameplay/campaigns/campaign-1783506291725-e0dl3td/forces
  - Screenshot: 08-sp-campaign-deep-loop/20-sweep-forces-surface.png
  - Duration: 1358 ms
- [ok] 21. sweep mech bay surface (default)
  - Route: /gameplay/campaigns/campaign-1783506291725-e0dl3td/mech-bay
  - Screenshot: 08-sp-campaign-deep-loop/21-sweep-mech-bay-surface.png
  - Duration: 1377 ms
- [ok] 22. sweep starmap surface (default)
  - Route: /gameplay/campaigns/campaign-1783506291725-e0dl3td/starmap
  - Screenshot: 08-sp-campaign-deep-loop/22-sweep-starmap-surface.png
  - Duration: 2028 ms
- [ok] 23. advance campaign one day (default)
  - Route: /gameplay/campaigns/campaign-1783506291725-e0dl3td
  - Screenshot: 08-sp-campaign-deep-loop/23-advance-campaign-one-day.png
  - Duration: 1765 ms
- [ok] 24. check campaign ledger (default)
  - Route: /gameplay/campaigns/campaign-1783506291725-e0dl3td/log
  - Screenshot: 08-sp-campaign-deep-loop/24-check-campaign-ledger.png
  - Duration: 1386 ms

#### Findings

- C4 (major): Pre-battle roster handoff still collapses after 4 selected units: Player Force1 unitDeep Loop 1783506276351 Retainer for Clan Ghost Bear Lance0 Battle ValueSlot 1lead 0 Battle Value
  - Evidence: step 13 (select roster and launch mission to pre-battle): 08-sp-campaign-deep-loop/13-select-roster-and-launch-mission-to-pre-battle.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
- C1-STATUS (minor): Manual battle attempt reached a playable tactical state or a changed failure mode: phase=Movement; spAdvance=true; composer=false; lockIn=false; no movement error captured
  - Evidence: step 14 (attempt manual tactical play from pre-battle): 08-sp-campaign-deep-loop/14-attempt-manual-tactical-play-from-pre-battle.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
- C5-STATUS (minor): Starmap loaded during the deep-play sweep without the prior canvas crash signature.
  - Evidence: step 22 (sweep starmap surface): 08-sp-campaign-deep-loop/22-sweep-starmap-surface.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_

### 09-coop-multiplayer-two-client (ok)

- Persona: host and guest proving co-op campaign and 1v1 lobby handoff surfaces
- Viewport: 1280x720
- Started: 2026-07-08T10:25:21.320Z
- Finished: 2026-07-08T10:25:27.468Z

#### Steps

- [ok] 1. seed host and guest vault identities (default)
  - Route: about:blank
  - Screenshot: 09-coop-multiplayer-two-client/01-seed-host-and-guest-vault-identities.png
  - Duration: 875 ms
- [ok] 2. host creates and guest joins co-op campaign (default)
  - Route: /gameplay/campaigns/campaign-1783506322570-puicrmo
  - Screenshot: 09-coop-multiplayer-two-client/02-host-creates-and-guest-joins-co-op-campaign.png
  - Duration: 1510 ms
- [ok] 3. skip guest ledger check because co-op join did not connect (guest)
  - Route: /gameplay/campaigns
  - Screenshot: 09-coop-multiplayer-two-client/03-skip-guest-ledger-check-because-co-op-join-did-not-connect.png
  - Duration: 1340 ms
- [ok] 4. host creates 1v1 match and guest joins lobby (default)
  - Route: /multiplayer/lobby/9WL4T5
  - Screenshot: 09-coop-multiplayer-two-client/04-host-creates-1v1-match-and-guest-joins-lobby.png
  - Duration: 2038 ms

#### Findings

- C3 (major): Harness uses MULTIPLAYER_STORE=durable for Playwright; it does not reproduce the plain-dev in-memory split-store C3 path. Host campaign=campaign-1783506322570-puicrmo, guest campaign=none, host badge=none, guest badge=none, join error=No room code rendered for host campaign..
  - Evidence: step 2 (host creates and guest joins co-op campaign): 09-coop-multiplayer-two-client/02-host-creates-and-guest-joins-co-op-campaign.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
- COOP-GUEST-LEDGER-SKIPPED (minor): Guest ledger projection check was skipped because the co-op join never reached a guest campaign route.
  - Evidence: step 3 (skip guest ledger check because co-op join did not connect): 09-coop-multiplayer-two-client/03-skip-guest-ledger-check-because-co-op-join-did-not-connect.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
- MULTIPLAYER-LOBBY-OCCUPIED (minor): 1v1 lobby occupied=true; host alpha="Alpha #1Deep Play HostNot readyLeaveReadySet AI", host bravo="Bravo #1pid_f8iNGGkzBXdFRN8dPZAr6mFGj1RNot readySet AI", guest alpha="Alpha #1Deep Play HostNot ready", guest bravo="Bravo #1pid_f8iNGGkzBXdFRN8dPZAr6mFGj1RNot readyLeaveReady".
  - Evidence: step 4 (host creates 1v1 match and guest joins lobby): 09-coop-multiplayer-two-client/04-host-creates-1v1-match-and-guest-joins-lobby.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_

### 10-gm-surfaces (ok)

- Persona: campaign GM validating ledger interventions and the tactical GM dock
- Viewport: 1280x720
- Started: 2026-07-08T10:25:27.725Z
- Finished: 2026-07-08T10:25:47.079Z

#### Steps

- [ok] 1. open campaign list (default)
  - Route: /gameplay/campaigns
  - Screenshot: 10-gm-surfaces/01-open-campaign-list.png
  - Duration: 1289 ms
- [ok] 2. start campaign wizard (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/02-start-campaign-wizard.png
  - Duration: 531 ms
- [ok] 3. name campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/03-name-campaign.png
  - Duration: 459 ms
- [ok] 4. keep default mercenary campaign type (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/04-keep-default-mercenary-campaign-type.png
  - Duration: 428 ms
- [ok] 5. keep standard campaign preset (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/05-keep-standard-campaign-preset.png
  - Duration: 460 ms
- [ok] 6. add four units and four assigned pilots (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/06-add-four-units-and-four-assigned-pilots.png
  - Duration: 731 ms
- [ok] 7. submit campaign wizard and land on dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783506331657-znx83yp
  - Screenshot: 10-gm-surfaces/07-submit-campaign-wizard-and-land-on-dashboard.png
  - Duration: 568 ms
- [ok] 8. open campaign GM ledger (default)
  - Route: /gameplay/campaigns/campaign-1783506331657-znx83yp/gm-ledger
  - Screenshot: 10-gm-surfaces/08-open-campaign-gm-ledger.png
  - Duration: 1378 ms
  - Notes: Merchant preview=ready, approval=ApprovalApproved and applied to campaign state., playerLog=Player Action LogMerchant charge corrected by +2,500.00 C-bills.Finances - approved, privateLog=GM LedgerMerchant charge corrected by +2,500.00 C-bills.Hidden campaign merchant reversal: duplicated charge from a black-market branch.Without this GM action the duplicated merchant charge remains on the campaign ledger.Merchant inventory clue remains GM-only until the players discover it in play..
- [ok] 9. generate and approve merchant ledger correction (default)
  - Route: /gameplay/campaigns/campaign-1783506331657-znx83yp/gm-ledger
  - Screenshot: 10-gm-surfaces/09-generate-and-approve-merchant-ledger-correction.png
  - Duration: 503 ms
  - Notes: Merchant conflict status=requires-manual-takeover, approveDisabled=true.
- [ok] 10. preview merchant conflict blocked approval (default)
  - Route: /gameplay/campaigns/campaign-1783506331657-znx83yp/gm-ledger
  - Screenshot: 10-gm-surfaces/10-preview-merchant-conflict-blocked-approval.png
  - Duration: 434 ms
  - Notes: Time cascade preview=2026-07-08 -> 2026-07-10 (2 days); external effects=none rendered. Current UI renders summary plus effects list, not a per-day expanded breakdown.
- [ok] 11. preview and approve time-cascade correction (default)
  - Route: /gameplay/campaigns/campaign-1783506331657-znx83yp/gm-ledger
  - Screenshot: 10-gm-surfaces/11-preview-and-approve-time-cascade-correction.png
  - Duration: 516 ms
- [ok] 12. return to dashboard before battle setup save (default)
  - Route: /gameplay/campaigns/campaign-1783506331657-znx83yp
  - Screenshot: 10-gm-surfaces/12-return-to-dashboard-before-battle-setup-save.png
  - Duration: 1245 ms
- [ok] 13. save campaign to server (default)
  - Route: /gameplay/campaigns/campaign-1783506331657-znx83yp
  - Screenshot: 10-gm-surfaces/13-save-campaign-to-server.png
  - Duration: 462 ms
- [ok] 14. open contract market (default)
  - Route: /gameplay/campaigns/campaign-1783506331657-znx83yp/contract-market
  - Screenshot: 10-gm-surfaces/14-open-contract-market.png
  - Duration: 1207 ms
- [ok] 15. accept first available contract (default)
  - Route: /gameplay/campaigns/campaign-1783506331657-znx83yp/contract-market
  - Screenshot: 10-gm-surfaces/15-accept-first-available-contract.png
  - Duration: 1448 ms
- [ok] 16. open campaign missions (default)
  - Route: /gameplay/campaigns/campaign-1783506331657-znx83yp/missions
  - Screenshot: 10-gm-surfaces/16-open-campaign-missions.png
  - Duration: 1192 ms
- [ok] 17. open mission launch briefing (default)
  - Route: /gameplay/campaigns/campaign-1783506331657-znx83yp/missions/contract-1783506336906-l4fecvl/launch
  - Screenshot: 10-gm-surfaces/17-open-mission-launch-briefing.png
  - Duration: 552 ms
- [ok] 18. select roster and launch mission to pre-battle (default)
  - Route: /gameplay/encounters/encounter-14e36075-95a3-440c-9aef-8569ee958987/pre-battle?campaignId=campaign-1783506331657-znx83yp&missionId=contract-1783506336906-l4fecvl
  - Screenshot: 10-gm-surfaces/18-select-roster-and-launch-mission-to-pre-battle.png
  - Duration: 852 ms
- [ok] 19. open manual battle before switching to GM query mode (default)
  - Route: /gameplay/games/b475f20e-bb78-4beb-8bb8-6ffdca76290b?campaignId=campaign-1783506331657-znx83yp&missionId=contract-1783506336906-l4fecvl
  - Screenshot: 10-gm-surfaces/19-open-manual-battle-before-switching-to-gm-query-mode.png
  - Duration: 723 ms
- [ok] 20. enter battle GM dock via query param (default)
  - Route: /gameplay/games/b475f20e-bb78-4beb-8bb8-6ffdca76290b?campaignId=campaign-1783506331657-znx83yp&missionId=contract-1783506336906-l4fecvl&gm=1
  - Screenshot: 10-gm-surfaces/20-enter-battle-gm-dock-via-query-param.png
  - Duration: 1666 ms
  - Notes: GM tactical mode is entered by appending ?gm=1; source resolveGameSessionShellMode confirms no in-app toggle exists.
- [ok] 21. preview and approve GM Advance Phase (default)
  - Route: /gameplay/games/b475f20e-bb78-4beb-8bb8-6ffdca76290b?campaignId=campaign-1783506331657-znx83yp&missionId=contract-1783506336906-l4fecvl&gm=1
  - Screenshot: 10-gm-surfaces/21-preview-and-approve-gm-advance-phase.png
  - Duration: 2707 ms

#### Findings

- GM-LEDGER-MERCHANT (minor): Merchant correction preview and approval were captured with player/private ledger split evidence.
  - Evidence: step 9 (generate and approve merchant ledger correction): 10-gm-surfaces/09-generate-and-approve-merchant-ledger-correction.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
- GM-LEDGER-CONFLICT (minor): Merchant conflict correction was captured in the blocked approval state.
  - Evidence: step 10 (preview merchant conflict blocked approval): 10-gm-surfaces/10-preview-merchant-conflict-blocked-approval.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
- GM-TIME-CASCADE (moderate): Time cascade correction was captured with the full current preview panel; UI currently exposes a summary/effects list rather than per-day breakdown.
  - Evidence: step 11 (preview and approve time-cascade correction): 10-gm-surfaces/11-preview-and-approve-time-cascade-correction.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
- C2-STATUS (minor): GM Advance Phase before="Initiative" after="Movement"; phaseChanged=true, composer=false, error=none.
  - Evidence: step 21 (preview and approve GM Advance Phase): 10-gm-surfaces/21-preview-and-approve-gm-advance-phase.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
