# UX Walkthrough Review - 2026-07-08T14-03-04

## TL;DR

- Reviewer summary: \_\_\_
- Release/blocker call: \_\_\_
- Follow-up owner: \_\_\_

## Run Summary

- Build mode: development
- Started: 2026-07-08T20:03:21.127Z
- Finished: 2026-07-08T20:04:33.563Z
- Journeys: 2 (0 failed)
- Steps: 45 (0 failed, 4 with console/page errors)
- Findings: 7

## Journeys

### 08-sp-campaign-deep-loop (ok)

- Persona: player pushing a campaign from creation through a battle attempt and full sweep
- Viewport: 1280x720
- Started: 2026-07-08T20:03:21.127Z
- Finished: 2026-07-08T20:04:05.907Z

#### Steps

- [ok] 1. open campaign list (default)
  - Route: /gameplay/campaigns
  - Screenshot: 08-sp-campaign-deep-loop/01-open-campaign-list.png
  - Duration: 12015 ms
- [ok] 2. start campaign wizard (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/02-start-campaign-wizard.png
  - Duration: 815 ms
- [ok] 3. name campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/03-name-campaign.png
  - Duration: 461 ms
- [ok] 4. keep default mercenary campaign type (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/04-keep-default-mercenary-campaign-type.png
  - Duration: 440 ms
- [ok] 5. keep standard campaign preset (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/05-keep-standard-campaign-preset.png
  - Duration: 458 ms
- [ok] 6. add four units and four assigned pilots (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/06-add-four-units-and-four-assigned-pilots.png
  - Duration: 734 ms
- [ok] 7. submit campaign wizard and land on dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783541016086-rsepwor
  - Screenshot: 08-sp-campaign-deep-loop/07-submit-campaign-wizard-and-land-on-dashboard.png
  - Duration: 1319 ms
- [ok] 8. save campaign to server (default)
  - Route: /gameplay/campaigns/campaign-1783541016086-rsepwor
  - Screenshot: 08-sp-campaign-deep-loop/08-save-campaign-to-server.png
  - Duration: 431 ms
- [ok] 9. open contract market (default)
  - Route: /gameplay/campaigns/campaign-1783541016086-rsepwor/contract-market
  - Screenshot: 08-sp-campaign-deep-loop/09-open-contract-market.png
  - Duration: 1434 ms
- [ok] 10. accept first available contract (default)
  - Route: /gameplay/campaigns/campaign-1783541016086-rsepwor/contract-market
  - Screenshot: 08-sp-campaign-deep-loop/10-accept-first-available-contract.png
  - Duration: 1444 ms
- [ok] 11. open campaign missions (default)
  - Route: /gameplay/campaigns/campaign-1783541016086-rsepwor/missions
  - Screenshot: 08-sp-campaign-deep-loop/11-open-campaign-missions.png
  - Duration: 1370 ms
- [ok] 12. open mission launch briefing (default)
  - Route: /gameplay/campaigns/campaign-1783541016086-rsepwor/missions/contract-1783541018209-lj35ti6/launch
  - Screenshot: 08-sp-campaign-deep-loop/12-open-mission-launch-briefing.png
  - Duration: 1311 ms
- [ok] 13. select roster and launch mission to pre-battle (default)
  - Route: /gameplay/encounters/encounter-a9357e87-ce80-4e5a-a901-4b6e9c849ca3/pre-battle?campaignId=campaign-1783541016086-rsepwor&missionId=contract-1783541018209-lj35ti6
  - Screenshot: 08-sp-campaign-deep-loop/13-select-roster-and-launch-mission-to-pre-battle.png
  - Duration: 3248 ms
  - Console/page errors: 1
- [ok] 14. attempt manual tactical play from pre-battle (default)
  - Route: /gameplay/games/6d4fe407-4e8c-4098-9dc4-1929e350b55e?campaignId=campaign-1783541016086-rsepwor&missionId=contract-1783541018209-lj35ti6
  - Screenshot: 08-sp-campaign-deep-loop/14-attempt-manual-tactical-play-from-pre-battle.png
  - Duration: 2531 ms
  - Console/page errors: 12
  - Notes: Known-fragile C1 surface; records current phase and movement affordances.
- [ok] 15. return to pre-battle and auto-resolve mission (default)
  - Route: /gameplay/games/5ccbace8-9df9-4965-b21b-75314021a394?campaignId=campaign-1783541016086-rsepwor&missionId=contract-1783541018209-lj35ti6
  - Screenshot: 08-sp-campaign-deep-loop/15-return-to-pre-battle-and-auto-resolve-mission.png
  - Duration: 2423 ms
- [ok] 16. sweep missions surface (default)
  - Route: /gameplay/campaigns/campaign-1783541016086-rsepwor/missions
  - Screenshot: 08-sp-campaign-deep-loop/16-sweep-missions-surface.png
  - Duration: 2326 ms
- [ok] 17. sweep campaign dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783541016086-rsepwor
  - Screenshot: 08-sp-campaign-deep-loop/17-sweep-campaign-dashboard.png
  - Duration: 1290 ms
- [ok] 18. sweep finances surface (default)
  - Route: /gameplay/campaigns/campaign-1783541016086-rsepwor/finances
  - Screenshot: 08-sp-campaign-deep-loop/18-sweep-finances-surface.png
  - Duration: 1380 ms
- [ok] 19. sweep personnel surface (default)
  - Route: /gameplay/campaigns/campaign-1783541016086-rsepwor/personnel
  - Screenshot: 08-sp-campaign-deep-loop/19-sweep-personnel-surface.png
  - Duration: 1434 ms
- [ok] 20. sweep forces surface (default)
  - Route: /gameplay/campaigns/campaign-1783541016086-rsepwor/forces
  - Screenshot: 08-sp-campaign-deep-loop/20-sweep-forces-surface.png
  - Duration: 1378 ms
- [ok] 21. sweep mech bay surface (default)
  - Route: /gameplay/campaigns/campaign-1783541016086-rsepwor/mech-bay
  - Screenshot: 08-sp-campaign-deep-loop/21-sweep-mech-bay-surface.png
  - Duration: 1404 ms
- [ok] 22. sweep starmap surface (default)
  - Route: /gameplay/campaigns/campaign-1783541016086-rsepwor/starmap
  - Screenshot: 08-sp-campaign-deep-loop/22-sweep-starmap-surface.png
  - Duration: 2035 ms
- [ok] 23. advance campaign one day (default)
  - Route: /gameplay/campaigns/campaign-1783541016086-rsepwor
  - Screenshot: 08-sp-campaign-deep-loop/23-advance-campaign-one-day.png
  - Duration: 1709 ms
- [ok] 24. check campaign ledger (default)
  - Route: /gameplay/campaigns/campaign-1783541016086-rsepwor/log
  - Screenshot: 08-sp-campaign-deep-loop/24-check-campaign-ledger.png
  - Duration: 1384 ms

#### Findings

- C4-STATUS (minor): Pre-battle roster handoff did not show the prior one-unit collapse; 4 selected units produced: Player Force4 unitsDeep Loop 1783541001130 Sabotage for Clan Ghost Bear Lance4,733 Battle ValueLocust LCT-1V(pilot assigned)leadHunchback HBK-4G(pilot assigned)memberMarauder MAD-3R(pilot assigned)memberAtlas AS7-D(pilot assigned)member 4,733 Battle Value
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
- Started: 2026-07-08T20:04:06.004Z
- Finished: 2026-07-08T20:04:33.252Z

#### Steps

- [ok] 1. open campaign list (default)
  - Route: /gameplay/campaigns
  - Screenshot: 10-gm-surfaces/01-open-campaign-list.png
  - Duration: 1319 ms
- [ok] 2. start campaign wizard (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/02-start-campaign-wizard.png
  - Duration: 538 ms
- [ok] 3. name campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/03-name-campaign.png
  - Duration: 447 ms
- [ok] 4. keep default mercenary campaign type (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/04-keep-default-mercenary-campaign-type.png
  - Duration: 436 ms
- [ok] 5. keep standard campaign preset (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/05-keep-standard-campaign-preset.png
  - Duration: 435 ms
- [ok] 6. add four units and four assigned pilots (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/06-add-four-units-and-four-assigned-pilots.png
  - Duration: 730 ms
- [ok] 7. submit campaign wizard and land on dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783541049933-q5tqsqc
  - Screenshot: 10-gm-surfaces/07-submit-campaign-wizard-and-land-on-dashboard.png
  - Duration: 544 ms
- [ok] 8. open campaign GM ledger (default)
  - Route: /gameplay/campaigns/campaign-1783541049933-q5tqsqc/gm-ledger
  - Screenshot: 10-gm-surfaces/08-open-campaign-gm-ledger.png
  - Duration: 1404 ms
  - Notes: Merchant preview=ready, approval=ApprovalApproved and applied to campaign state., playerLog=Player Action LogMerchant charge corrected by +2,500.00 C-bills.Finances - approved, privateLog=GM LedgerMerchant charge corrected by +2,500.00 C-bills.Hidden campaign merchant reversal: duplicated charge from a black-market branch.Without this GM action the duplicated merchant charge remains on the campaign ledger.Merchant inventory clue remains GM-only until the players discover it in play..
- [ok] 9. generate and approve merchant ledger correction (default)
  - Route: /gameplay/campaigns/campaign-1783541049933-q5tqsqc/gm-ledger
  - Screenshot: 10-gm-surfaces/09-generate-and-approve-merchant-ledger-correction.png
  - Duration: 495 ms
  - Notes: Merchant conflict status=requires-manual-takeover, approveDisabled=true.
- [ok] 10. preview merchant conflict blocked approval (default)
  - Route: /gameplay/campaigns/campaign-1783541049933-q5tqsqc/gm-ledger
  - Screenshot: 10-gm-surfaces/10-preview-merchant-conflict-blocked-approval.png
  - Duration: 432 ms
  - Notes: Time cascade preview=2026-07-08 -> 2026-07-10 (2 days); external effects=none rendered. Current UI renders summary plus effects list, not a per-day expanded breakdown.
- [ok] 11. preview and approve time-cascade correction (default)
  - Route: /gameplay/campaigns/campaign-1783541049933-q5tqsqc/gm-ledger
  - Screenshot: 10-gm-surfaces/11-preview-and-approve-time-cascade-correction.png
  - Duration: 527 ms
- [ok] 12. return to dashboard before battle setup save (default)
  - Route: /gameplay/campaigns/campaign-1783541049933-q5tqsqc
  - Screenshot: 10-gm-surfaces/12-return-to-dashboard-before-battle-setup-save.png
  - Duration: 1258 ms
- [ok] 13. save campaign to server (default)
  - Route: /gameplay/campaigns/campaign-1783541049933-q5tqsqc
  - Screenshot: 10-gm-surfaces/13-save-campaign-to-server.png
  - Duration: 440 ms
- [ok] 14. open contract market (default)
  - Route: /gameplay/campaigns/campaign-1783541049933-q5tqsqc/contract-market
  - Screenshot: 10-gm-surfaces/14-open-contract-market.png
  - Duration: 1228 ms
- [ok] 15. accept first available contract (default)
  - Route: /gameplay/campaigns/campaign-1783541049933-q5tqsqc/contract-market
  - Screenshot: 10-gm-surfaces/15-accept-first-available-contract.png
  - Duration: 1438 ms
- [ok] 16. open campaign missions (default)
  - Route: /gameplay/campaigns/campaign-1783541049933-q5tqsqc/missions
  - Screenshot: 10-gm-surfaces/16-open-campaign-missions.png
  - Duration: 1228 ms
- [ok] 17. open mission launch briefing (default)
  - Route: /gameplay/campaigns/campaign-1783541049933-q5tqsqc/missions/contract-1783541055216-sacgd89/launch
  - Screenshot: 10-gm-surfaces/17-open-mission-launch-briefing.png
  - Duration: 543 ms
- [ok] 18. select roster and launch mission to pre-battle (default)
  - Route: /gameplay/encounters/encounter-10f00eea-886b-4e89-8bae-715db4b532bb/pre-battle?campaignId=campaign-1783541049933-q5tqsqc&missionId=contract-1783541055216-sacgd89
  - Screenshot: 10-gm-surfaces/18-select-roster-and-launch-mission-to-pre-battle.png
  - Duration: 782 ms
- [ok] 19. open manual battle before switching to GM query mode (default)
  - Route: /gameplay/games/de667db4-661e-41a2-82aa-fff724702b9a?campaignId=campaign-1783541049933-q5tqsqc&missionId=contract-1783541055216-sacgd89
  - Screenshot: 10-gm-surfaces/19-open-manual-battle-before-switching-to-gm-query-mode.png
  - Duration: 769 ms
  - Console/page errors: 12
- [ok] 20. enter battle GM dock via query param (default)
  - Route: /gameplay/games/de667db4-661e-41a2-82aa-fff724702b9a?campaignId=campaign-1783541049933-q5tqsqc&missionId=contract-1783541055216-sacgd89&gm=1
  - Screenshot: 10-gm-surfaces/20-enter-battle-gm-dock-via-query-param.png
  - Duration: 1784 ms
  - Console/page errors: 16
  - Notes: GM tactical mode is entered by appending ?gm=1; source resolveGameSessionShellMode confirms no in-app toggle exists.
- [ok] 21. preview and approve GM Advance Phase (default)
  - Route: /gameplay/games/de667db4-661e-41a2-82aa-fff724702b9a?campaignId=campaign-1783541049933-q5tqsqc&missionId=contract-1783541055216-sacgd89&gm=1
  - Screenshot: 10-gm-surfaces/21-preview-and-approve-gm-advance-phase.png
  - Duration: 10470 ms

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
- C2-UNKNOWN (minor): GM Advance Phase phase text was unreadable before/after approve; before="Initiative" after="unknown"; composer=false, error=none.
  - Evidence: step 21 (preview and approve GM Advance Phase): 10-gm-surfaces/21-preview-and-approve-gm-advance-phase.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
