# UX Walkthrough Review - 2026-07-08T14-08-51

## TL;DR

- Reviewer summary: \_\_\_
- Release/blocker call: \_\_\_
- Follow-up owner: \_\_\_

## Run Summary

- Build mode: development
- Started: 2026-07-08T20:08:57.377Z
- Finished: 2026-07-08T20:09:59.794Z
- Journeys: 2 (0 failed)
- Steps: 45 (0 failed, 4 with console/page errors)
- Findings: 7

## Journeys

### 08-sp-campaign-deep-loop (ok)

- Persona: player pushing a campaign from creation through a battle attempt and full sweep
- Viewport: 1280x720
- Started: 2026-07-08T20:08:57.377Z
- Finished: 2026-07-08T20:09:42.100Z

#### Steps

- [ok] 1. open campaign list (default)
  - Route: /gameplay/campaigns
  - Screenshot: 08-sp-campaign-deep-loop/01-open-campaign-list.png
  - Duration: 11935 ms
- [ok] 2. start campaign wizard (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/02-start-campaign-wizard.png
  - Duration: 817 ms
- [ok] 3. name campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/03-name-campaign.png
  - Duration: 461 ms
- [ok] 4. keep default mercenary campaign type (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/04-keep-default-mercenary-campaign-type.png
  - Duration: 442 ms
- [ok] 5. keep standard campaign preset (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/05-keep-standard-campaign-preset.png
  - Duration: 433 ms
- [ok] 6. add four units and four assigned pilots (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/06-add-four-units-and-four-assigned-pilots.png
  - Duration: 750 ms
- [ok] 7. submit campaign wizard and land on dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783541352255-vcrvag1
  - Screenshot: 08-sp-campaign-deep-loop/07-submit-campaign-wizard-and-land-on-dashboard.png
  - Duration: 1337 ms
- [ok] 8. save campaign to server (default)
  - Route: /gameplay/campaigns/campaign-1783541352255-vcrvag1
  - Screenshot: 08-sp-campaign-deep-loop/08-save-campaign-to-server.png
  - Duration: 440 ms
- [ok] 9. open contract market (default)
  - Route: /gameplay/campaigns/campaign-1783541352255-vcrvag1/contract-market
  - Screenshot: 08-sp-campaign-deep-loop/09-open-contract-market.png
  - Duration: 1427 ms
- [ok] 10. accept first available contract (default)
  - Route: /gameplay/campaigns/campaign-1783541352255-vcrvag1/contract-market
  - Screenshot: 08-sp-campaign-deep-loop/10-accept-first-available-contract.png
  - Duration: 1446 ms
- [ok] 11. open campaign missions (default)
  - Route: /gameplay/campaigns/campaign-1783541352255-vcrvag1/missions
  - Screenshot: 08-sp-campaign-deep-loop/11-open-campaign-missions.png
  - Duration: 1387 ms
- [ok] 12. open mission launch briefing (default)
  - Route: /gameplay/campaigns/campaign-1783541352255-vcrvag1/missions/contract-1783541354394-4pp62st/launch
  - Screenshot: 08-sp-campaign-deep-loop/12-open-mission-launch-briefing.png
  - Duration: 1311 ms
- [ok] 13. select roster and launch mission to pre-battle (default)
  - Route: /gameplay/encounters/encounter-13ce5ef6-8786-474b-8c5b-75c1144731b3/pre-battle?campaignId=campaign-1783541352255-vcrvag1&missionId=contract-1783541354394-4pp62st
  - Screenshot: 08-sp-campaign-deep-loop/13-select-roster-and-launch-mission-to-pre-battle.png
  - Duration: 3232 ms
  - Console/page errors: 1
- [ok] 14. attempt manual tactical play from pre-battle (default)
  - Route: /gameplay/games/6643450d-023a-4512-8d13-e2cbb737d138?campaignId=campaign-1783541352255-vcrvag1&missionId=contract-1783541354394-4pp62st
  - Screenshot: 08-sp-campaign-deep-loop/14-attempt-manual-tactical-play-from-pre-battle.png
  - Duration: 2481 ms
  - Console/page errors: 12
  - Notes: Known-fragile C1 surface; records current phase and movement affordances.
- [ok] 15. return to pre-battle and auto-resolve mission (default)
  - Route: /gameplay/games/edcb2e1b-314f-48f1-a2a6-a498ed904738?campaignId=campaign-1783541352255-vcrvag1&missionId=contract-1783541354394-4pp62st
  - Screenshot: 08-sp-campaign-deep-loop/15-return-to-pre-battle-and-auto-resolve-mission.png
  - Duration: 2426 ms
- [ok] 16. sweep missions surface (default)
  - Route: /gameplay/campaigns/campaign-1783541352255-vcrvag1/missions
  - Screenshot: 08-sp-campaign-deep-loop/16-sweep-missions-surface.png
  - Duration: 2367 ms
- [ok] 17. sweep campaign dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783541352255-vcrvag1
  - Screenshot: 08-sp-campaign-deep-loop/17-sweep-campaign-dashboard.png
  - Duration: 1259 ms
- [ok] 18. sweep finances surface (default)
  - Route: /gameplay/campaigns/campaign-1783541352255-vcrvag1/finances
  - Screenshot: 08-sp-campaign-deep-loop/18-sweep-finances-surface.png
  - Duration: 1418 ms
- [ok] 19. sweep personnel surface (default)
  - Route: /gameplay/campaigns/campaign-1783541352255-vcrvag1/personnel
  - Screenshot: 08-sp-campaign-deep-loop/19-sweep-personnel-surface.png
  - Duration: 1415 ms
- [ok] 20. sweep forces surface (default)
  - Route: /gameplay/campaigns/campaign-1783541352255-vcrvag1/forces
  - Screenshot: 08-sp-campaign-deep-loop/20-sweep-forces-surface.png
  - Duration: 1382 ms
- [ok] 21. sweep mech bay surface (default)
  - Route: /gameplay/campaigns/campaign-1783541352255-vcrvag1/mech-bay
  - Screenshot: 08-sp-campaign-deep-loop/21-sweep-mech-bay-surface.png
  - Duration: 1419 ms
- [ok] 22. sweep starmap surface (default)
  - Route: /gameplay/campaigns/campaign-1783541352255-vcrvag1/starmap
  - Screenshot: 08-sp-campaign-deep-loop/22-sweep-starmap-surface.png
  - Duration: 2036 ms
- [ok] 23. advance campaign one day (default)
  - Route: /gameplay/campaigns/campaign-1783541352255-vcrvag1
  - Screenshot: 08-sp-campaign-deep-loop/23-advance-campaign-one-day.png
  - Duration: 1693 ms
- [ok] 24. check campaign ledger (default)
  - Route: /gameplay/campaigns/campaign-1783541352255-vcrvag1/log
  - Screenshot: 08-sp-campaign-deep-loop/24-check-campaign-ledger.png
  - Duration: 1405 ms

#### Findings

- C4-STATUS (minor): Pre-battle roster handoff did not show the prior one-unit collapse; 4 selected units produced: Player Force4 unitsDeep Loop 1783541337379 Cadre Duty for Kell Hounds Lance4,733 Battle ValueLocust LCT-1V(pilot assigned)leadHunchback HBK-4G(pilot assigned)memberMarauder MAD-3R(pilot assigned)memberAtlas AS7-D(pilot assigned)member 4,733 Battle Value
  - Evidence: step 13 (select roster and launch mission to pre-battle): 08-sp-campaign-deep-loop/13-select-roster-and-launch-mission-to-pre-battle.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
- C1-STATUS (minor): Manual battle attempt reached a playable tactical state or a changed failure mode: phase unavailable; spAdvance=false; composer=false; lockIn=false; no movement error captured
  - Evidence: step 14 (attempt manual tactical play from pre-battle): 08-sp-campaign-deep-loop/14-attempt-manual-tactical-play-from-pre-battle.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
- C5-STATUS (minor): Starmap loaded during the deep-play sweep without the prior canvas crash signature.
  - Evidence: step 22 (sweep starmap surface): 08-sp-campaign-deep-loop/22-sweep-starmap-surface.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_

### 10-gm-surfaces (ok)

- Persona: campaign GM validating ledger interventions and the tactical GM dock
- Viewport: 1280x720
- Started: 2026-07-08T20:09:42.215Z
- Finished: 2026-07-08T20:09:59.465Z

#### Steps

- [ok] 1. open campaign list (default)
  - Route: /gameplay/campaigns
  - Screenshot: 10-gm-surfaces/01-open-campaign-list.png
  - Duration: 1313 ms
- [ok] 2. start campaign wizard (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/02-start-campaign-wizard.png
  - Duration: 544 ms
- [ok] 3. name campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/03-name-campaign.png
  - Duration: 461 ms
- [ok] 4. keep default mercenary campaign type (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/04-keep-default-mercenary-campaign-type.png
  - Duration: 427 ms
- [ok] 5. keep standard campaign preset (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/05-keep-standard-campaign-preset.png
  - Duration: 447 ms
- [ok] 6. add four units and four assigned pilots (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/06-add-four-units-and-four-assigned-pilots.png
  - Duration: 744 ms
- [ok] 7. submit campaign wizard and land on dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783541386187-jv52rxo
  - Screenshot: 10-gm-surfaces/07-submit-campaign-wizard-and-land-on-dashboard.png
  - Duration: 558 ms
- [ok] 8. open campaign GM ledger (default)
  - Route: /gameplay/campaigns/campaign-1783541386187-jv52rxo/gm-ledger
  - Screenshot: 10-gm-surfaces/08-open-campaign-gm-ledger.png
  - Duration: 1374 ms
  - Notes: Merchant preview=ready, approval=ApprovalApproved and applied to campaign state., playerLog=Player Action LogMerchant charge corrected by +2,500.00 C-bills.Finances - approved, privateLog=GM LedgerMerchant charge corrected by +2,500.00 C-bills.Hidden campaign merchant reversal: duplicated charge from a black-market branch.Without this GM action the duplicated merchant charge remains on the campaign ledger.Merchant inventory clue remains GM-only until the players discover it in play..
- [ok] 9. generate and approve merchant ledger correction (default)
  - Route: /gameplay/campaigns/campaign-1783541386187-jv52rxo/gm-ledger
  - Screenshot: 10-gm-surfaces/09-generate-and-approve-merchant-ledger-correction.png
  - Duration: 507 ms
  - Notes: Merchant conflict status=requires-manual-takeover, approveDisabled=true.
- [ok] 10. preview merchant conflict blocked approval (default)
  - Route: /gameplay/campaigns/campaign-1783541386187-jv52rxo/gm-ledger
  - Screenshot: 10-gm-surfaces/10-preview-merchant-conflict-blocked-approval.png
  - Duration: 423 ms
  - Notes: Time cascade preview=2026-07-08 -> 2026-07-10 (2 days); external effects=none rendered. Current UI renders summary plus effects list, not a per-day expanded breakdown.
- [ok] 11. preview and approve time-cascade correction (default)
  - Route: /gameplay/campaigns/campaign-1783541386187-jv52rxo/gm-ledger
  - Screenshot: 10-gm-surfaces/11-preview-and-approve-time-cascade-correction.png
  - Duration: 536 ms
- [ok] 12. return to dashboard before battle setup save (default)
  - Route: /gameplay/campaigns/campaign-1783541386187-jv52rxo
  - Screenshot: 10-gm-surfaces/12-return-to-dashboard-before-battle-setup-save.png
  - Duration: 1249 ms
- [ok] 13. save campaign to server (default)
  - Route: /gameplay/campaigns/campaign-1783541386187-jv52rxo
  - Screenshot: 10-gm-surfaces/13-save-campaign-to-server.png
  - Duration: 461 ms
- [ok] 14. open contract market (default)
  - Route: /gameplay/campaigns/campaign-1783541386187-jv52rxo/contract-market
  - Screenshot: 10-gm-surfaces/14-open-contract-market.png
  - Duration: 1241 ms
- [ok] 15. accept first available contract (default)
  - Route: /gameplay/campaigns/campaign-1783541386187-jv52rxo/contract-market
  - Screenshot: 10-gm-surfaces/15-accept-first-available-contract.png
  - Duration: 1458 ms
- [ok] 16. open campaign missions (default)
  - Route: /gameplay/campaigns/campaign-1783541386187-jv52rxo/missions
  - Screenshot: 10-gm-surfaces/16-open-campaign-missions.png
  - Duration: 1222 ms
- [ok] 17. open mission launch briefing (default)
  - Route: /gameplay/campaigns/campaign-1783541386187-jv52rxo/missions/contract-1783541391472-xub1rqh/launch
  - Screenshot: 10-gm-surfaces/17-open-mission-launch-briefing.png
  - Duration: 549 ms
- [ok] 18. select roster and launch mission to pre-battle (default)
  - Route: /gameplay/encounters/encounter-15624ba8-7338-49ca-ad65-85383b3cbee7/pre-battle?campaignId=campaign-1783541386187-jv52rxo&missionId=contract-1783541391472-xub1rqh
  - Screenshot: 10-gm-surfaces/18-select-roster-and-launch-mission-to-pre-battle.png
  - Duration: 783 ms
- [ok] 19. open manual battle before switching to GM query mode (default)
  - Route: /gameplay/games/5f3b6c4d-b32f-4bd0-8291-04119c45a9a4?campaignId=campaign-1783541386187-jv52rxo&missionId=contract-1783541391472-xub1rqh
  - Screenshot: 10-gm-surfaces/19-open-manual-battle-before-switching-to-gm-query-mode.png
  - Duration: 707 ms
  - Console/page errors: 16
- [ok] 20. enter battle GM dock via query param (default)
  - Route: /gameplay/games/5f3b6c4d-b32f-4bd0-8291-04119c45a9a4?campaignId=campaign-1783541386187-jv52rxo&missionId=contract-1783541391472-xub1rqh&gm=1
  - Screenshot: 10-gm-surfaces/20-enter-battle-gm-dock-via-query-param.png
  - Duration: 1730 ms
  - Console/page errors: 16
  - Notes: GM tactical mode is entered by appending ?gm=1; source resolveGameSessionShellMode confirms no in-app toggle exists.
- [ok] 21. preview and approve GM Advance Phase (default)
  - Route: /gameplay/games/5f3b6c4d-b32f-4bd0-8291-04119c45a9a4?campaignId=campaign-1783541386187-jv52rxo&missionId=contract-1783541391472-xub1rqh&gm=1
  - Screenshot: 10-gm-surfaces/21-preview-and-approve-gm-advance-phase.png
  - Duration: 514 ms

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
- C2-STATUS (minor): GM Advance Phase before="Initiative" after="unknown"; phaseChanged=true, composer=false, terminal=Defeat Destruction Return to Campaign Replay Game Back to Games View Full Event Timeline, error=none.
  - Evidence: step 21 (preview and approve GM Advance Phase): 10-gm-surfaces/21-preview-and-approve-gm-advance-phase.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
