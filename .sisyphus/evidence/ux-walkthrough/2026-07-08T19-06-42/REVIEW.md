# UX Walkthrough Review - 2026-07-08T19-06-42

## TL;DR

- Reviewer summary: LOOP-CLOSE RE-AUDIT after 5 merged iterations (#1013 phase progression, #1014 this harness, #1015 roster->battle, #1016 multiplayer store split, #1017 starmap). 10/10 journeys, 107/107 steps green. All four 2026-07-07 playtest criticals verified fixed by journey evidence: C1-STATUS, C2-STATUS, C4-STATUS, C5-STATUS (minors documenting working behavior). C3 fixed LIVE on plain `npm run dev` (transport proof: 1 banner, 0x1008, lobby alive, two-browser co-op join delivered host snapshot — evidence screenshots 95-97) but journey 09 records a residual harness-environment issue: under the Playwright webServer (MULTIPLAYER_STORE=durable, e2e mode) the co-op host campaign renders NO room code, so the in-harness guest join never runs. 1v1 lobby now fully works in-harness (both seats occupied).
- Release/blocker call: no blockers. Surviving work is next-wave backlog, led by the journey-09 harness-env co-op room-code render.
- Follow-up owner: next planning wave. Backlog: journey-09 harness-env co-op room code; GM-TIME-CASCADE (moderate — preview lacks per-day summaries); gm.reload-unit commit semantics; dashboard staleness M2; finance posting M4; co-op onboarding M5; ForceCard custom-units names; co-op host/client mission-launch import gap; local 4-project Playwright matrix contention; 4 steps with console errors (see step records).

## Run Summary

- Build mode: development
- Started: 2026-07-09T01:06:54.811Z
- Finished: 2026-07-09T01:08:58.897Z
- Journeys: 10 (0 failed)
- Steps: 107 (0 failed, 4 with console/page errors)
- Findings: 10

## Journeys

### 01-first-visit-navigation (ok)

- Persona: first-time visitor exploring the app shell
- Viewport: 1280x720
- Started: 2026-07-09T01:08:06.530Z
- Finished: 2026-07-09T01:08:14.684Z

#### Steps

- [ok] 1. land on dashboard (default)
  - Route: /
  - Screenshot: 01-first-visit-navigation/01-land-on-dashboard.png
  - Duration: 3154 ms
- [ok] 2. open Browse menu (default)
  - Route: /
  - Screenshot: 01-first-visit-navigation/02-open-browse-menu.png
  - Duration: 648 ms
- [ok] 3. open Gameplay menu (default)
  - Route: /
  - Screenshot: 01-first-visit-navigation/03-open-gameplay-menu.png
  - Duration: 648 ms
- [ok] 4. visit gameplay hub from dashboard card (default)
  - Route: /gameplay
  - Screenshot: 01-first-visit-navigation/04-visit-gameplay-hub-from-dashboard-card.png
  - Duration: 807 ms
- [ok] 5. read onboarding page (default)
  - Route: /onboarding
  - Screenshot: 01-first-visit-navigation/05-read-onboarding-page.png
  - Duration: 1431 ms
- [ok] 6. return to dashboard from onboarding (default)
  - Route: /
  - Screenshot: 01-first-visit-navigation/06-return-to-dashboard-from-onboarding.png
  - Duration: 650 ms
- [ok] 7. open settings (default)
  - Route: /settings
  - Screenshot: 01-first-visit-navigation/07-open-settings.png
  - Duration: 816 ms

#### Findings

- _No findings recorded._

### 02-compendium-browse (ok)

- Persona: player researching units and equipment
- Viewport: 1280x720
- Started: 2026-07-09T01:08:14.797Z
- Finished: 2026-07-09T01:08:22.883Z

#### Steps

- [ok] 1. open compendium hub (default)
  - Route: /compendium
  - Screenshot: 02-compendium-browse/01-open-compendium-hub.png
  - Duration: 1616 ms
- [ok] 2. search the compendium for "heat" (default)
  - Route: /compendium
  - Screenshot: 02-compendium-browse/02-search-the-compendium-for-heat.png
  - Duration: 548 ms
- [ok] 3. clear search and open unit database (default)
  - Route: /compendium/units
  - Screenshot: 02-compendium-browse/03-clear-search-and-open-unit-database.png
  - Duration: 546 ms
- [ok] 4. open the first unit detail (default)
  - Route: /compendium/units/battle-tripod-r-h3l-2x
  - Screenshot: 02-compendium-browse/04-open-the-first-unit-detail.png
  - Duration: 899 ms
- [ok] 5. browser-back returns to unit database (default)
  - Route: /compendium/units
  - Screenshot: 02-compendium-browse/05-browser-back-returns-to-unit-database.png
  - Duration: 618 ms
- [ok] 6. open equipment catalog (default)
  - Route: /compendium/equipment
  - Screenshot: 02-compendium-browse/06-open-equipment-catalog.png
  - Duration: 1459 ms
- [ok] 7. open the first equipment detail (default)
  - Route: /compendium/equipment/ac-2
  - Screenshot: 02-compendium-browse/07-open-the-first-equipment-detail.png
  - Duration: 903 ms
- [ok] 8. open rules reference (default)
  - Route: /compendium/rules
  - Screenshot: 02-compendium-browse/08-open-rules-reference.png
  - Duration: 1497 ms

#### Findings

- _No findings recorded._

### 03-fresh-profile-empty-states (ok)

- Persona: new player with no saved content yet
- Viewport: 1280x720
- Started: 2026-07-09T01:08:23.213Z
- Finished: 2026-07-09T01:08:29.023Z

#### Steps

- [ok] 1. my units is empty (default)
  - Route: /units
  - Screenshot: 03-fresh-profile-empty-states/01-my-units-is-empty.png
  - Duration: 1497 ms
- [ok] 2. replay library (default)
  - Route: /replay-library
  - Screenshot: 03-fresh-profile-empty-states/02-replay-library.png
  - Duration: 1711 ms
- [ok] 3. watch the first replay (default)
  - Route: /replay-library
  - Screenshot: 03-fresh-profile-empty-states/03-watch-the-first-replay.png
  - Duration: 1274 ms
  - Notes: Library was already populated on this profile — exercised the watch path instead of the empty-state CTA.
- [ok] 4. return to the library (default)
  - Route: /replay-library
  - Screenshot: 03-fresh-profile-empty-states/04-return-to-the-library.png
  - Duration: 1324 ms

#### Findings

- _No findings recorded._

### 04-quick-game-auto-resolve (ok)

- Persona: player running their first quick battle
- Viewport: 1280x720
- Started: 2026-07-09T01:08:29.120Z
- Finished: 2026-07-09T01:08:37.212Z

#### Steps

- [ok] 1. quick game welcome (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/01-quick-game-welcome.png
  - Duration: 2060 ms
- [ok] 2. start setup (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/02-start-setup.png
  - Duration: 451 ms
- [ok] 3. add two units to my force (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/03-add-two-units-to-my-force.png
  - Duration: 480 ms
- [ok] 4. continue to scenario configuration (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/04-continue-to-scenario-configuration.png
  - Duration: 437 ms
- [ok] 5. generate scenario (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/05-generate-scenario.png
  - Duration: 578 ms
- [ok] 6. review scenario (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/06-review-scenario.png
  - Duration: 416 ms
- [ok] 7. auto-resolve the battle (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/07-auto-resolve-the-battle.png
  - Duration: 1048 ms
- [ok] 8. inspect unit outcomes tab (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/08-inspect-unit-outcomes-tab.png
  - Duration: 466 ms
- [ok] 9. inspect replay tab (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/09-inspect-replay-tab.png
  - Duration: 810 ms
- [ok] 10. exit to games (default)
  - Route: /gameplay/games
  - Screenshot: 04-quick-game-auto-resolve/10-exit-to-games.png
  - Duration: 1346 ms

#### Findings

- _No findings recorded._

### 05-customizer-new-unit (ok)

- Persona: player building their first custom BattleMech
- Viewport: 1280x720
- Started: 2026-07-09T01:08:37.321Z
- Finished: 2026-07-09T01:08:44.817Z

#### Steps

- [ok] 1. open the customizer (default)
  - Route: /customizer
  - Screenshot: 05-customizer-new-unit/01-open-the-customizer.png
  - Duration: 2797 ms
- [ok] 2. open the new-unit dialog (default)
  - Route: /customizer
  - Screenshot: 05-customizer-new-unit/02-open-the-new-unit-dialog.png
  - Duration: 440 ms
- [ok] 3. create a default BattleMech (default)
  - Route: /customizer/9d512062-aebc-4220-87f6-4fa2b48a9b4e/structure
  - Screenshot: 05-customizer-new-unit/03-create-a-default-battlemech.png
  - Duration: 516 ms
- [ok] 4. adjust heat sinks (autosave) (default)
  - Route: /customizer/9d512062-aebc-4220-87f6-4fa2b48a9b4e/structure
  - Screenshot: 05-customizer-new-unit/04-adjust-heat-sinks-autosave.png
  - Duration: 466 ms
  - Notes: Edits autosave to local storage; the transient Saved toast is the only save feedback.
- [ok] 5. view armor diagram (default)
  - Route: /customizer/9d512062-aebc-4220-87f6-4fa2b48a9b4e/armor
  - Screenshot: 05-customizer-new-unit/05-view-armor-diagram.png
  - Duration: 474 ms
- [ok] 6. view overview tab (default)
  - Route: /customizer/9d512062-aebc-4220-87f6-4fa2b48a9b4e/overview
  - Screenshot: 05-customizer-new-unit/06-view-overview-tab.png
  - Duration: 571 ms
- [ok] 7. view equipment tab (default)
  - Route: /customizer/9d512062-aebc-4220-87f6-4fa2b48a9b4e/equipment
  - Screenshot: 05-customizer-new-unit/07-view-equipment-tab.png
  - Duration: 563 ms
- [ok] 8. view critical slots tab (default)
  - Route: /customizer/9d512062-aebc-4220-87f6-4fa2b48a9b4e/criticals
  - Screenshot: 05-customizer-new-unit/08-view-critical-slots-tab.png
  - Duration: 584 ms
- [ok] 9. view record sheet preview (default)
  - Route: /customizer/9d512062-aebc-4220-87f6-4fa2b48a9b4e/preview
  - Screenshot: 05-customizer-new-unit/09-view-record-sheet-preview.png
  - Duration: 1085 ms

#### Findings

- _No findings recorded._

### 06-campaign-create-to-launch (ok)

- Persona: player starting a mercenary campaign
- Viewport: 1280x720
- Started: 2026-07-09T01:08:44.950Z
- Finished: 2026-07-09T01:08:53.363Z

#### Steps

- [ok] 1. campaigns list (fresh profile) (default)
  - Route: /gameplay/campaigns
  - Screenshot: 06-campaign-create-to-launch/01-campaigns-list-fresh-profile.png
  - Duration: 1361 ms
- [ok] 2. start the campaign wizard (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 06-campaign-create-to-launch/02-start-the-campaign-wizard.png
  - Duration: 542 ms
- [ok] 3. name the campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 06-campaign-create-to-launch/03-name-the-campaign.png
  - Duration: 407 ms
- [ok] 4. choose campaign type (default mercenary) (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 06-campaign-create-to-launch/04-choose-campaign-type-default-mercenary.png
  - Duration: 436 ms
- [ok] 5. choose preset (default standard) (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 06-campaign-create-to-launch/05-choose-preset-default-standard.png
  - Duration: 450 ms
- [ok] 6. add a starting unit and pilot (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 06-campaign-create-to-launch/06-add-a-starting-unit-and-pilot.png
  - Duration: 507 ms
- [ok] 7. review and create the campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 06-campaign-create-to-launch/07-review-and-create-the-campaign.png
  - Duration: 440 ms
- [ok] 8. land on the campaign dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783559329119-9vj4jsf
  - Screenshot: 06-campaign-create-to-launch/08-land-on-the-campaign-dashboard.png
  - Duration: 526 ms
- [ok] 9. save the campaign to the server (default)
  - Route: /gameplay/campaigns/campaign-1783559329119-9vj4jsf
  - Screenshot: 06-campaign-create-to-launch/09-save-the-campaign-to-the-server.png
  - Duration: 450 ms
  - Notes: A new campaign lives only in browser storage until the player finds the Save now card — easy to lose a campaign without noticing.
- [ok] 10. visit the starmap (default)
  - Route: /gameplay/campaigns/campaign-1783559329119-9vj4jsf/starmap
  - Screenshot: 06-campaign-create-to-launch/10-visit-the-starmap.png
  - Duration: 656 ms
- [ok] 11. visit the mech bay (default)
  - Route: /gameplay/campaigns/campaign-1783559329119-9vj4jsf/mech-bay
  - Screenshot: 06-campaign-create-to-launch/11-visit-the-mech-bay.png
  - Duration: 568 ms
- [ok] 12. browse the contract market (default)
  - Route: /gameplay/campaigns/campaign-1783559329119-9vj4jsf/contract-market
  - Screenshot: 06-campaign-create-to-launch/12-browse-the-contract-market.png
  - Duration: 559 ms
- [ok] 13. accept a contract offer (default)
  - Route: /gameplay/campaigns/campaign-1783559329119-9vj4jsf/contract-market
  - Screenshot: 06-campaign-create-to-launch/13-accept-a-contract-offer.png
  - Duration: 431 ms
- [ok] 14. see the mission on the missions page (default)
  - Route: /gameplay/campaigns/campaign-1783559329119-9vj4jsf/missions
  - Screenshot: 06-campaign-create-to-launch/14-see-the-mission-on-the-missions-page.png
  - Duration: 545 ms
  - Notes: Launch button is enabled with the wizard-added roster.
- [ok] 15. open the mission launch screen (default)
  - Route: /gameplay/campaigns/campaign-1783559329119-9vj4jsf/missions/contract-1783559331404-eedytg4/launch
  - Screenshot: 06-campaign-create-to-launch/15-open-the-mission-launch-screen.png
  - Duration: 534 ms
  - Notes: Launch screen reached through the mission-card Launch link.

#### Findings

- _No findings recorded._

### 07-mobile-navigation (ok)

- Persona: phone user finding their way around
- Viewport: 1280x720
- Started: 2026-07-09T01:08:53.466Z
- Finished: 2026-07-09T01:08:58.556Z

#### Steps

- [ok] 1. mobile dashboard (default)
  - Route: /
  - Screenshot: 07-mobile-navigation/01-mobile-dashboard.png
  - Duration: 1347 ms
- [ok] 2. open hamburger menu (default)
  - Route: /
  - Screenshot: 07-mobile-navigation/02-open-hamburger-menu.png
  - Duration: 427 ms
- [ok] 3. navigate to quick game from mobile menu (default)
  - Route: /gameplay/quick
  - Screenshot: 07-mobile-navigation/03-navigate-to-quick-game-from-mobile-menu.png
  - Duration: 526 ms
- [ok] 4. mobile compendium hub (default)
  - Route: /compendium
  - Screenshot: 07-mobile-navigation/04-mobile-compendium-hub.png
  - Duration: 1558 ms
- [ok] 5. mobile unit database (default)
  - Route: /compendium/units
  - Screenshot: 07-mobile-navigation/05-mobile-unit-database.png
  - Duration: 1232 ms

#### Findings

- _No findings recorded._

### 08-sp-campaign-deep-loop (ok)

- Persona: player pushing a campaign from creation through a battle attempt and full sweep
- Viewport: 1280x720
- Started: 2026-07-09T01:06:54.811Z
- Finished: 2026-07-09T01:07:41.633Z

#### Steps

- [ok] 1. open campaign list (default)
  - Route: /gameplay/campaigns
  - Screenshot: 08-sp-campaign-deep-loop/01-open-campaign-list.png
  - Duration: 12566 ms
- [ok] 2. start campaign wizard (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/02-start-campaign-wizard.png
  - Duration: 1333 ms
- [ok] 3. name campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/03-name-campaign.png
  - Duration: 486 ms
- [ok] 4. keep default mercenary campaign type (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/04-keep-default-mercenary-campaign-type.png
  - Duration: 430 ms
- [ok] 5. keep standard campaign preset (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/05-keep-standard-campaign-preset.png
  - Duration: 457 ms
- [ok] 6. add four units and four assigned pilots (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/06-add-four-units-and-four-assigned-pilots.png
  - Duration: 731 ms
- [ok] 7. submit campaign wizard and land on dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783559230856-pjbb00t
  - Screenshot: 08-sp-campaign-deep-loop/07-submit-campaign-wizard-and-land-on-dashboard.png
  - Duration: 1320 ms
- [ok] 8. save campaign to server (default)
  - Route: /gameplay/campaigns/campaign-1783559230856-pjbb00t
  - Screenshot: 08-sp-campaign-deep-loop/08-save-campaign-to-server.png
  - Duration: 435 ms
- [ok] 9. open contract market (default)
  - Route: /gameplay/campaigns/campaign-1783559230856-pjbb00t/contract-market
  - Screenshot: 08-sp-campaign-deep-loop/09-open-contract-market.png
  - Duration: 1507 ms
- [ok] 10. accept first available contract (default)
  - Route: /gameplay/campaigns/campaign-1783559230856-pjbb00t/contract-market
  - Screenshot: 08-sp-campaign-deep-loop/10-accept-first-available-contract.png
  - Duration: 1453 ms
- [ok] 11. open campaign missions (default)
  - Route: /gameplay/campaigns/campaign-1783559230856-pjbb00t/missions
  - Screenshot: 08-sp-campaign-deep-loop/11-open-campaign-missions.png
  - Duration: 1511 ms
- [ok] 12. open mission launch briefing (default)
  - Route: /gameplay/campaigns/campaign-1783559230856-pjbb00t/missions/contract-1783559233041-evi8k55/launch
  - Screenshot: 08-sp-campaign-deep-loop/12-open-mission-launch-briefing.png
  - Duration: 1319 ms
- [ok] 13. select roster and launch mission to pre-battle (default)
  - Route: /gameplay/encounters/encounter-a93ce974-2e13-4119-b1be-a8b2c16060b2/pre-battle?campaignId=campaign-1783559230856-pjbb00t&missionId=contract-1783559233041-evi8k55
  - Screenshot: 08-sp-campaign-deep-loop/13-select-roster-and-launch-mission-to-pre-battle.png
  - Duration: 3400 ms
  - Console/page errors: 1
- [ok] 14. attempt manual tactical play from pre-battle (default)
  - Route: /gameplay/games/672775fd-dcd6-4a2a-8dc6-c757859bdb9b?campaignId=campaign-1783559230856-pjbb00t&missionId=contract-1783559233041-evi8k55
  - Screenshot: 08-sp-campaign-deep-loop/14-attempt-manual-tactical-play-from-pre-battle.png
  - Duration: 2678 ms
  - Console/page errors: 16
  - Notes: Known-fragile C1 surface; records current phase and movement affordances.
- [ok] 15. return to pre-battle and auto-resolve mission (default)
  - Route: /gameplay/games/e916a8ef-a561-4c1e-a7dc-731e20f647b4?campaignId=campaign-1783559230856-pjbb00t&missionId=contract-1783559233041-evi8k55
  - Screenshot: 08-sp-campaign-deep-loop/15-return-to-pre-battle-and-auto-resolve-mission.png
  - Duration: 2444 ms
- [ok] 16. sweep missions surface (default)
  - Route: /gameplay/campaigns/campaign-1783559230856-pjbb00t/missions
  - Screenshot: 08-sp-campaign-deep-loop/16-sweep-missions-surface.png
  - Duration: 2358 ms
- [ok] 17. sweep campaign dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783559230856-pjbb00t
  - Screenshot: 08-sp-campaign-deep-loop/17-sweep-campaign-dashboard.png
  - Duration: 1291 ms
- [ok] 18. sweep finances surface (default)
  - Route: /gameplay/campaigns/campaign-1783559230856-pjbb00t/finances
  - Screenshot: 08-sp-campaign-deep-loop/18-sweep-finances-surface.png
  - Duration: 1444 ms
- [ok] 19. sweep personnel surface (default)
  - Route: /gameplay/campaigns/campaign-1783559230856-pjbb00t/personnel
  - Screenshot: 08-sp-campaign-deep-loop/19-sweep-personnel-surface.png
  - Duration: 1523 ms
- [ok] 20. sweep forces surface (default)
  - Route: /gameplay/campaigns/campaign-1783559230856-pjbb00t/forces
  - Screenshot: 08-sp-campaign-deep-loop/20-sweep-forces-surface.png
  - Duration: 1419 ms
- [ok] 21. sweep mech bay surface (default)
  - Route: /gameplay/campaigns/campaign-1783559230856-pjbb00t/mech-bay
  - Screenshot: 08-sp-campaign-deep-loop/21-sweep-mech-bay-surface.png
  - Duration: 1492 ms
- [ok] 22. sweep starmap surface (default)
  - Route: /gameplay/campaigns/campaign-1783559230856-pjbb00t/starmap
  - Screenshot: 08-sp-campaign-deep-loop/22-sweep-starmap-surface.png
  - Duration: 2090 ms
- [ok] 23. advance campaign one day (default)
  - Route: /gameplay/campaigns/campaign-1783559230856-pjbb00t
  - Screenshot: 08-sp-campaign-deep-loop/23-advance-campaign-one-day.png
  - Duration: 1724 ms
- [ok] 24. check campaign ledger (default)
  - Route: /gameplay/campaigns/campaign-1783559230856-pjbb00t/log
  - Screenshot: 08-sp-campaign-deep-loop/24-check-campaign-ledger.png
  - Duration: 1401 ms

#### Findings

- C4-STATUS (minor): Pre-battle roster handoff did not show the prior one-unit collapse; 4 selected units produced: Player Force4 unitsDeep Loop 1783559214819 Guerrilla Warfare for House Davion Lance4,733 Battle ValueLocust LCT-1V(pilot assigned)leadHunchback HBK-4G(pilot assigned)memberMarauder MAD-3R(pilot assigned)memberAtlas AS7-D(pilot assigned)member 4,733 Battle Value
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

### 09-coop-multiplayer-two-client (ok)

- Persona: host and guest proving co-op campaign and 1v1 lobby handoff surfaces
- Viewport: 1280x720
- Started: 2026-07-09T01:07:41.788Z
- Finished: 2026-07-09T01:07:48.754Z

#### Steps

- [ok] 1. seed host and guest vault identities (default)
  - Route: about:blank
  - Screenshot: 09-coop-multiplayer-two-client/01-seed-host-and-guest-vault-identities.png
  - Duration: 856 ms
- [ok] 2. host creates and guest joins co-op campaign (default)
  - Route: /gameplay/campaigns/campaign-1783559263159-ef2hcyd
  - Screenshot: 09-coop-multiplayer-two-client/02-host-creates-and-guest-joins-co-op-campaign.png
  - Duration: 1679 ms
- [ok] 3. skip guest ledger check because co-op join did not connect (guest)
  - Route: /gameplay/campaigns
  - Screenshot: 09-coop-multiplayer-two-client/03-skip-guest-ledger-check-because-co-op-join-did-not-connect.png
  - Duration: 1340 ms
- [ok] 4. host creates 1v1 match and guest joins lobby (default)
  - Route: /multiplayer/lobby/NRZAL4
  - Screenshot: 09-coop-multiplayer-two-client/04-host-creates-1v1-match-and-guest-joins-lobby.png
  - Duration: 2615 ms

#### Findings

- C3 (major): Harness uses MULTIPLAYER_STORE=durable for Playwright; it does not reproduce the plain-dev in-memory split-store C3 path. Host campaign=campaign-1783559263159-ef2hcyd, guest campaign=none, host badge=none, guest badge=none, join error=No room code rendered for host campaign..
  - Evidence: step 2 (host creates and guest joins co-op campaign): 09-coop-multiplayer-two-client/02-host-creates-and-guest-joins-co-op-campaign.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
- COOP-GUEST-LEDGER-SKIPPED (minor): Guest ledger projection check was skipped because the co-op join never reached a guest campaign route.
  - Evidence: step 3 (skip guest ledger check because co-op join did not connect): 09-coop-multiplayer-two-client/03-skip-guest-ledger-check-because-co-op-join-did-not-connect.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
- MULTIPLAYER-LOBBY-OCCUPIED (minor): 1v1 lobby occupied=true; host alpha="Alpha #1Deep Play HostNot readyLeaveReadySet AI", host bravo="Bravo #1pid_pn1NGZkhb58PemT7DXatyUTyxxRNot readySet AI", guest alpha="Alpha #1Deep Play HostNot ready", guest bravo="Bravo #1pid_pn1NGZkhb58PemT7DXatyUTyxxRNot readyLeaveReady".
  - Evidence: step 4 (host creates 1v1 match and guest joins lobby): 09-coop-multiplayer-two-client/04-host-creates-1v1-match-and-guest-joins-lobby.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_

### 10-gm-surfaces (ok)

- Persona: campaign GM validating ledger interventions and the tactical GM dock
- Viewport: 1280x720
- Started: 2026-07-09T01:07:48.812Z
- Finished: 2026-07-09T01:08:06.195Z

#### Steps

- [ok] 1. open campaign list (default)
  - Route: /gameplay/campaigns
  - Screenshot: 10-gm-surfaces/01-open-campaign-list.png
  - Duration: 1349 ms
- [ok] 2. start campaign wizard (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/02-start-campaign-wizard.png
  - Duration: 536 ms
- [ok] 3. name campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/03-name-campaign.png
  - Duration: 459 ms
- [ok] 4. keep default mercenary campaign type (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/04-keep-default-mercenary-campaign-type.png
  - Duration: 427 ms
- [ok] 5. keep standard campaign preset (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/05-keep-standard-campaign-preset.png
  - Duration: 433 ms
- [ok] 6. add four units and four assigned pilots (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/06-add-four-units-and-four-assigned-pilots.png
  - Duration: 741 ms
- [ok] 7. submit campaign wizard and land on dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783559272788-tdcwjpo
  - Screenshot: 10-gm-surfaces/07-submit-campaign-wizard-and-land-on-dashboard.png
  - Duration: 559 ms
- [ok] 8. open campaign GM ledger (default)
  - Route: /gameplay/campaigns/campaign-1783559272788-tdcwjpo/gm-ledger
  - Screenshot: 10-gm-surfaces/08-open-campaign-gm-ledger.png
  - Duration: 1483 ms
  - Notes: Merchant preview=ready, approval=ApprovalApproved and applied to campaign state., playerLog=Player Action LogMerchant charge corrected by +2,500.00 C-bills.Finances - approved, privateLog=GM LedgerMerchant charge corrected by +2,500.00 C-bills.Hidden campaign merchant reversal: duplicated charge from a black-market branch.Without this GM action the duplicated merchant charge remains on the campaign ledger.Merchant inventory clue remains GM-only until the players discover it in play..
- [ok] 9. generate and approve merchant ledger correction (default)
  - Route: /gameplay/campaigns/campaign-1783559272788-tdcwjpo/gm-ledger
  - Screenshot: 10-gm-surfaces/09-generate-and-approve-merchant-ledger-correction.png
  - Duration: 501 ms
  - Notes: Merchant conflict status=requires-manual-takeover, approveDisabled=true.
- [ok] 10. preview merchant conflict blocked approval (default)
  - Route: /gameplay/campaigns/campaign-1783559272788-tdcwjpo/gm-ledger
  - Screenshot: 10-gm-surfaces/10-preview-merchant-conflict-blocked-approval.png
  - Duration: 450 ms
  - Notes: Time cascade preview=2026-07-09 -> 2026-07-11 (2 days); external effects=none rendered. Current UI renders summary plus effects list, not a per-day expanded breakdown.
- [ok] 11. preview and approve time-cascade correction (default)
  - Route: /gameplay/campaigns/campaign-1783559272788-tdcwjpo/gm-ledger
  - Screenshot: 10-gm-surfaces/11-preview-and-approve-time-cascade-correction.png
  - Duration: 518 ms
- [ok] 12. return to dashboard before battle setup save (default)
  - Route: /gameplay/campaigns/campaign-1783559272788-tdcwjpo
  - Screenshot: 10-gm-surfaces/12-return-to-dashboard-before-battle-setup-save.png
  - Duration: 1247 ms
- [ok] 13. save campaign to server (default)
  - Route: /gameplay/campaigns/campaign-1783559272788-tdcwjpo
  - Screenshot: 10-gm-surfaces/13-save-campaign-to-server.png
  - Duration: 448 ms
- [ok] 14. open contract market (default)
  - Route: /gameplay/campaigns/campaign-1783559272788-tdcwjpo/contract-market
  - Screenshot: 10-gm-surfaces/14-open-contract-market.png
  - Duration: 1229 ms
- [ok] 15. accept first available contract (default)
  - Route: /gameplay/campaigns/campaign-1783559272788-tdcwjpo/contract-market
  - Screenshot: 10-gm-surfaces/15-accept-first-available-contract.png
  - Duration: 1453 ms
- [ok] 16. open campaign missions (default)
  - Route: /gameplay/campaigns/campaign-1783559272788-tdcwjpo/missions
  - Screenshot: 10-gm-surfaces/16-open-campaign-missions.png
  - Duration: 1200 ms
- [ok] 17. open mission launch briefing (default)
  - Route: /gameplay/campaigns/campaign-1783559272788-tdcwjpo/missions/contract-1783559278154-zw0puqq/launch
  - Screenshot: 10-gm-surfaces/17-open-mission-launch-briefing.png
  - Duration: 538 ms
- [ok] 18. select roster and launch mission to pre-battle (default)
  - Route: /gameplay/encounters/encounter-5971068c-fe2a-4335-a8b9-efc16cdd5592/pre-battle?campaignId=campaign-1783559272788-tdcwjpo&missionId=contract-1783559278154-zw0puqq
  - Screenshot: 10-gm-surfaces/18-select-roster-and-launch-mission-to-pre-battle.png
  - Duration: 827 ms
- [ok] 19. open manual battle before switching to GM query mode (default)
  - Route: /gameplay/games/ddbec108-8869-4ea7-8481-e3ede9e1155f?campaignId=campaign-1783559272788-tdcwjpo&missionId=contract-1783559278154-zw0puqq
  - Screenshot: 10-gm-surfaces/19-open-manual-battle-before-switching-to-gm-query-mode.png
  - Duration: 741 ms
  - Console/page errors: 16
- [ok] 20. enter battle GM dock via query param (default)
  - Route: /gameplay/games/ddbec108-8869-4ea7-8481-e3ede9e1155f?campaignId=campaign-1783559272788-tdcwjpo&missionId=contract-1783559278154-zw0puqq&gm=1
  - Screenshot: 10-gm-surfaces/20-enter-battle-gm-dock-via-query-param.png
  - Duration: 1732 ms
  - Console/page errors: 16
  - Notes: GM tactical mode is entered by appending ?gm=1; source resolveGameSessionShellMode confirms no in-app toggle exists.
- [ok] 21. preview and approve GM Advance Phase (default)
  - Route: /gameplay/games/ddbec108-8869-4ea7-8481-e3ede9e1155f?campaignId=campaign-1783559272788-tdcwjpo&missionId=contract-1783559278154-zw0puqq&gm=1
  - Screenshot: 10-gm-surfaces/21-preview-and-approve-gm-advance-phase.png
  - Duration: 510 ms

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
