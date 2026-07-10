# UX Walkthrough Review - 2026-07-09T18-44-16

## TL;DR

- Reviewer summary: \_\_\_
- Release/blocker call: \_\_\_
- Follow-up owner: \_\_\_

## Run Summary

- Build mode: development
- Started: 2026-07-10T00:44:36.185Z
- Finished: 2026-07-10T00:47:13.060Z
- Journeys: 10 (0 failed)
- Steps: 107 (0 failed, 2 with console/page errors)
- Findings: 10

## Journeys

### 01-first-visit-navigation (ok)

- Persona: first-time visitor exploring the app shell
- Viewport: 1280x720
- Started: 2026-07-10T00:46:15.103Z
- Finished: 2026-07-10T00:46:22.516Z

#### Steps

- [ok] 1. land on dashboard (default)
  - Route: /
  - Screenshot: 01-first-visit-navigation/01-land-on-dashboard.png
  - Duration: 1721 ms
- [ok] 2. open Browse menu (default)
  - Route: /
  - Screenshot: 01-first-visit-navigation/02-open-browse-menu.png
  - Duration: 683 ms
- [ok] 3. open Gameplay menu (default)
  - Route: /
  - Screenshot: 01-first-visit-navigation/03-open-gameplay-menu.png
  - Duration: 692 ms
- [ok] 4. visit gameplay hub from dashboard card (default)
  - Route: /gameplay
  - Screenshot: 01-first-visit-navigation/04-visit-gameplay-hub-from-dashboard-card.png
  - Duration: 830 ms
- [ok] 5. read onboarding page (default)
  - Route: /onboarding
  - Screenshot: 01-first-visit-navigation/05-read-onboarding-page.png
  - Duration: 1528 ms
- [ok] 6. return to dashboard from onboarding (default)
  - Route: /
  - Screenshot: 01-first-visit-navigation/06-return-to-dashboard-from-onboarding.png
  - Duration: 650 ms
- [ok] 7. open settings (default)
  - Route: /settings
  - Screenshot: 01-first-visit-navigation/07-open-settings.png
  - Duration: 1308 ms

#### Findings

- _No findings recorded._

### 02-compendium-browse (ok)

- Persona: player researching units and equipment
- Viewport: 1280x720
- Started: 2026-07-10T00:46:22.624Z
- Finished: 2026-07-10T00:46:31.444Z

#### Steps

- [ok] 1. open compendium hub (default)
  - Route: /compendium
  - Screenshot: 02-compendium-browse/01-open-compendium-hub.png
  - Duration: 1785 ms
- [ok] 2. search the compendium for "heat" (default)
  - Route: /compendium
  - Screenshot: 02-compendium-browse/02-search-the-compendium-for-heat.png
  - Duration: 565 ms
- [ok] 3. clear search and open unit database (default)
  - Route: /compendium/units
  - Screenshot: 02-compendium-browse/03-clear-search-and-open-unit-database.png
  - Duration: 557 ms
- [ok] 4. open the first unit detail (default)
  - Route: /compendium/units/battle-tripod-r-h3l-2x
  - Screenshot: 02-compendium-browse/04-open-the-first-unit-detail.png
  - Duration: 941 ms
- [ok] 5. browser-back returns to unit database (default)
  - Route: /compendium/units
  - Screenshot: 02-compendium-browse/05-browser-back-returns-to-unit-database.png
  - Duration: 799 ms
- [ok] 6. open equipment catalog (default)
  - Route: /compendium/equipment
  - Screenshot: 02-compendium-browse/06-open-equipment-catalog.png
  - Duration: 1580 ms
- [ok] 7. open the first equipment detail (default)
  - Route: /compendium/equipment/ac-2
  - Screenshot: 02-compendium-browse/07-open-the-first-equipment-detail.png
  - Duration: 939 ms
- [ok] 8. open rules reference (default)
  - Route: /compendium/rules
  - Screenshot: 02-compendium-browse/08-open-rules-reference.png
  - Duration: 1653 ms

#### Findings

- _No findings recorded._

### 03-fresh-profile-empty-states (ok)

- Persona: new player with no saved content yet
- Viewport: 1280x720
- Started: 2026-07-10T00:46:31.813Z
- Finished: 2026-07-10T00:46:38.929Z

#### Steps

- [ok] 1. my units is empty (default)
  - Route: /units
  - Screenshot: 03-fresh-profile-empty-states/01-my-units-is-empty.png
  - Duration: 1626 ms
- [ok] 2. replay library (default)
  - Route: /replay-library
  - Screenshot: 03-fresh-profile-empty-states/02-replay-library.png
  - Duration: 1877 ms
- [ok] 3. watch the first replay (default)
  - Route: /replay-library
  - Screenshot: 03-fresh-profile-empty-states/03-watch-the-first-replay.png
  - Duration: 1980 ms
  - Notes: Library was already populated on this profile — exercised the watch path instead of the empty-state CTA.
- [ok] 4. return to the library (default)
  - Route: /replay-library
  - Screenshot: 03-fresh-profile-empty-states/04-return-to-the-library.png
  - Duration: 1628 ms

#### Findings

- _No findings recorded._

### 04-quick-game-auto-resolve (ok)

- Persona: player running their first quick battle
- Viewport: 1280x720
- Started: 2026-07-10T00:46:40.048Z
- Finished: 2026-07-10T00:46:49.393Z

#### Steps

- [ok] 1. quick game welcome (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/01-quick-game-welcome.png
  - Duration: 2718 ms
- [ok] 2. start setup (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/02-start-setup.png
  - Duration: 453 ms
- [ok] 3. add two units to my force (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/03-add-two-units-to-my-force.png
  - Duration: 494 ms
- [ok] 4. continue to scenario configuration (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/04-continue-to-scenario-configuration.png
  - Duration: 463 ms
- [ok] 5. generate scenario (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/05-generate-scenario.png
  - Duration: 567 ms
- [ok] 6. review scenario (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/06-review-scenario.png
  - Duration: 422 ms
- [ok] 7. auto-resolve the battle (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/07-auto-resolve-the-battle.png
  - Duration: 570 ms
- [ok] 8. inspect unit outcomes tab (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/08-inspect-unit-outcomes-tab.png
  - Duration: 451 ms
- [ok] 9. inspect replay tab (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/09-inspect-replay-tab.png
  - Duration: 842 ms
- [ok] 10. exit to games (default)
  - Route: /gameplay/games
  - Screenshot: 04-quick-game-auto-resolve/10-exit-to-games.png
  - Duration: 2364 ms

#### Findings

- _No findings recorded._

### 05-customizer-new-unit (ok)

- Persona: player building their first custom BattleMech
- Viewport: 1280x720
- Started: 2026-07-10T00:46:49.520Z
- Finished: 2026-07-10T00:46:57.802Z

#### Steps

- [ok] 1. open the customizer (default)
  - Route: /customizer
  - Screenshot: 05-customizer-new-unit/01-open-the-customizer.png
  - Duration: 3316 ms
- [ok] 2. open the new-unit dialog (default)
  - Route: /customizer
  - Screenshot: 05-customizer-new-unit/02-open-the-new-unit-dialog.png
  - Duration: 464 ms
- [ok] 3. create a default BattleMech (default)
  - Route: /customizer/19fedb51-ab35-4880-b4a0-1d7d23d1d606/structure
  - Screenshot: 05-customizer-new-unit/03-create-a-default-battlemech.png
  - Duration: 543 ms
- [ok] 4. adjust heat sinks (autosave) (default)
  - Route: /customizer/19fedb51-ab35-4880-b4a0-1d7d23d1d606/structure
  - Screenshot: 05-customizer-new-unit/04-adjust-heat-sinks-autosave.png
  - Duration: 480 ms
  - Notes: Edits autosave to local storage; the transient Saved toast is the only save feedback.
- [ok] 5. view armor diagram (default)
  - Route: /customizer/19fedb51-ab35-4880-b4a0-1d7d23d1d606/armor
  - Screenshot: 05-customizer-new-unit/05-view-armor-diagram.png
  - Duration: 488 ms
- [ok] 6. view overview tab (default)
  - Route: /customizer/19fedb51-ab35-4880-b4a0-1d7d23d1d606/overview
  - Screenshot: 05-customizer-new-unit/06-view-overview-tab.png
  - Duration: 589 ms
- [ok] 7. view equipment tab (default)
  - Route: /customizer/19fedb51-ab35-4880-b4a0-1d7d23d1d606/equipment
  - Screenshot: 05-customizer-new-unit/07-view-equipment-tab.png
  - Duration: 513 ms
- [ok] 8. view critical slots tab (default)
  - Route: /customizer/19fedb51-ab35-4880-b4a0-1d7d23d1d606/criticals
  - Screenshot: 05-customizer-new-unit/08-view-critical-slots-tab.png
  - Duration: 582 ms
- [ok] 9. view record sheet preview (default)
  - Route: /customizer/19fedb51-ab35-4880-b4a0-1d7d23d1d606/preview
  - Screenshot: 05-customizer-new-unit/09-view-record-sheet-preview.png
  - Duration: 1307 ms

#### Findings

- _No findings recorded._

### 06-campaign-create-to-launch (ok)

- Persona: player starting a mercenary campaign
- Viewport: 1280x720
- Started: 2026-07-10T00:46:57.971Z
- Finished: 2026-07-10T00:47:06.726Z

#### Steps

- [ok] 1. campaigns list (fresh profile) (default)
  - Route: /gameplay/campaigns
  - Screenshot: 06-campaign-create-to-launch/01-campaigns-list-fresh-profile.png
  - Duration: 1487 ms
- [ok] 2. start the campaign wizard (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 06-campaign-create-to-launch/02-start-the-campaign-wizard.png
  - Duration: 557 ms
- [ok] 3. name the campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 06-campaign-create-to-launch/03-name-the-campaign.png
  - Duration: 423 ms
- [ok] 4. choose campaign type (default mercenary) (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 06-campaign-create-to-launch/04-choose-campaign-type-default-mercenary.png
  - Duration: 455 ms
- [ok] 5. choose preset (default standard) (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 06-campaign-create-to-launch/05-choose-preset-default-standard.png
  - Duration: 443 ms
- [ok] 6. add a starting unit and pilot (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 06-campaign-create-to-launch/06-add-a-starting-unit-and-pilot.png
  - Duration: 507 ms
- [ok] 7. review and create the campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 06-campaign-create-to-launch/07-review-and-create-the-campaign.png
  - Duration: 450 ms
- [ok] 8. land on the campaign dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783644422328-5h345h7
  - Screenshot: 06-campaign-create-to-launch/08-land-on-the-campaign-dashboard.png
  - Duration: 551 ms
- [ok] 9. save the campaign to the server (default)
  - Route: /gameplay/campaigns/campaign-1783644422328-5h345h7
  - Screenshot: 06-campaign-create-to-launch/09-save-the-campaign-to-the-server.png
  - Duration: 451 ms
  - Notes: A new campaign lives only in browser storage until the player finds the Save now card — easy to lose a campaign without noticing.
- [ok] 10. visit the starmap (default)
  - Route: /gameplay/campaigns/campaign-1783644422328-5h345h7/starmap
  - Screenshot: 06-campaign-create-to-launch/10-visit-the-starmap.png
  - Duration: 720 ms
- [ok] 11. visit the mech bay (default)
  - Route: /gameplay/campaigns/campaign-1783644422328-5h345h7/mech-bay
  - Screenshot: 06-campaign-create-to-launch/11-visit-the-mech-bay.png
  - Duration: 581 ms
- [ok] 12. browse the contract market (default)
  - Route: /gameplay/campaigns/campaign-1783644422328-5h345h7/contract-market
  - Screenshot: 06-campaign-create-to-launch/12-browse-the-contract-market.png
  - Duration: 581 ms
- [ok] 13. accept a contract offer (default)
  - Route: /gameplay/campaigns/campaign-1783644422328-5h345h7/contract-market
  - Screenshot: 06-campaign-create-to-launch/13-accept-a-contract-offer.png
  - Duration: 447 ms
- [ok] 14. see the mission on the missions page (default)
  - Route: /gameplay/campaigns/campaign-1783644422328-5h345h7/missions
  - Screenshot: 06-campaign-create-to-launch/14-see-the-mission-on-the-missions-page.png
  - Duration: 547 ms
  - Notes: Launch button is enabled with the wizard-added roster.
- [ok] 15. open the mission launch screen (default)
  - Route: /gameplay/campaigns/campaign-1783644422328-5h345h7/missions/contract-1783644424718-9gw6vc1/launch
  - Screenshot: 06-campaign-create-to-launch/15-open-the-mission-launch-screen.png
  - Duration: 553 ms
  - Notes: Launch screen reached through the mission-card Launch link.

#### Findings

- _No findings recorded._

### 07-mobile-navigation (ok)

- Persona: phone user finding their way around
- Viewport: 1280x720
- Started: 2026-07-10T00:47:07.189Z
- Finished: 2026-07-10T00:47:12.283Z

#### Steps

- [ok] 1. mobile dashboard (default)
  - Route: /
  - Screenshot: 07-mobile-navigation/01-mobile-dashboard.png
  - Duration: 1423 ms
- [ok] 2. open hamburger menu (default)
  - Route: /
  - Screenshot: 07-mobile-navigation/02-open-hamburger-menu.png
  - Duration: 437 ms
- [ok] 3. navigate to quick game from mobile menu (default)
  - Route: /gameplay/quick
  - Screenshot: 07-mobile-navigation/03-navigate-to-quick-game-from-mobile-menu.png
  - Duration: 553 ms
- [ok] 4. mobile compendium hub (default)
  - Route: /compendium
  - Screenshot: 07-mobile-navigation/04-mobile-compendium-hub.png
  - Duration: 1328 ms
- [ok] 5. mobile unit database (default)
  - Route: /compendium/units
  - Screenshot: 07-mobile-navigation/05-mobile-unit-database.png
  - Duration: 1353 ms

#### Findings

- _No findings recorded._

### 08-sp-campaign-deep-loop (ok)

- Persona: player pushing a campaign from creation through a battle attempt and full sweep
- Viewport: 1280x720
- Started: 2026-07-10T00:44:36.185Z
- Finished: 2026-07-10T00:45:45.459Z

#### Steps

- [ok] 1. open campaign list (default)
  - Route: /gameplay/campaigns
  - Screenshot: 08-sp-campaign-deep-loop/01-open-campaign-list.png
  - Duration: 23993 ms
- [ok] 2. start campaign wizard (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/02-start-campaign-wizard.png
  - Duration: 1340 ms
- [ok] 3. name campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/03-name-campaign.png
  - Duration: 509 ms
- [ok] 4. keep default mercenary campaign type (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/04-keep-default-mercenary-campaign-type.png
  - Duration: 453 ms
- [ok] 5. keep standard campaign preset (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/05-keep-standard-campaign-preset.png
  - Duration: 450 ms
- [ok] 6. add four units and four assigned pilots (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/06-add-four-units-and-four-assigned-pilots.png
  - Duration: 844 ms
- [ok] 7. submit campaign wizard and land on dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783644303817-u208hi1
  - Screenshot: 08-sp-campaign-deep-loop/07-submit-campaign-wizard-and-land-on-dashboard.png
  - Duration: 1354 ms
- [ok] 8. save campaign to server (default)
  - Route: /gameplay/campaigns/campaign-1783644303817-u208hi1
  - Screenshot: 08-sp-campaign-deep-loop/08-save-campaign-to-server.png
  - Duration: 446 ms
- [ok] 9. open contract market (default)
  - Route: /gameplay/campaigns/campaign-1783644303817-u208hi1/contract-market
  - Screenshot: 08-sp-campaign-deep-loop/09-open-contract-market.png
  - Duration: 1765 ms
- [ok] 10. accept first available contract (default)
  - Route: /gameplay/campaigns/campaign-1783644303817-u208hi1/contract-market
  - Screenshot: 08-sp-campaign-deep-loop/10-accept-first-available-contract.png
  - Duration: 1473 ms
- [ok] 11. open campaign missions (default)
  - Route: /gameplay/campaigns/campaign-1783644303817-u208hi1/missions
  - Screenshot: 08-sp-campaign-deep-loop/11-open-campaign-missions.png
  - Duration: 1706 ms
- [ok] 12. open mission launch briefing (default)
  - Route: /gameplay/campaigns/campaign-1783644303817-u208hi1/missions/contract-1783644306224-sb7n750/launch
  - Screenshot: 08-sp-campaign-deep-loop/12-open-mission-launch-briefing.png
  - Duration: 2370 ms
- [ok] 13. select roster and launch mission to pre-battle (default)
  - Route: /gameplay/encounters/encounter-0cd3b725-5535-49b1-b37b-22dd2472b280/pre-battle?campaignId=campaign-1783644303817-u208hi1&missionId=contract-1783644306224-sb7n750
  - Screenshot: 08-sp-campaign-deep-loop/13-select-roster-and-launch-mission-to-pre-battle.png
  - Duration: 4496 ms
  - Console/page errors: 1
- [ok] 14. attempt manual tactical play from pre-battle (default)
  - Route: /gameplay/games/73b98bc0-a5e1-417f-8881-7fff2d03c718?campaignId=campaign-1783644303817-u208hi1&missionId=contract-1783644306224-sb7n750
  - Screenshot: 08-sp-campaign-deep-loop/14-attempt-manual-tactical-play-from-pre-battle.png
  - Duration: 7092 ms
  - Notes: Known-fragile C1 surface; records current phase and movement affordances.
- [ok] 15. return to pre-battle and auto-resolve mission (default)
  - Route: /gameplay/games/24fccab1-b271-43b8-8dee-36219527cbe7?campaignId=campaign-1783644303817-u208hi1&missionId=contract-1783644306224-sb7n750
  - Screenshot: 08-sp-campaign-deep-loop/15-return-to-pre-battle-and-auto-resolve-mission.png
  - Duration: 2223 ms
- [ok] 16. sweep missions surface (default)
  - Route: /gameplay/campaigns/campaign-1783644303817-u208hi1/missions
  - Screenshot: 08-sp-campaign-deep-loop/16-sweep-missions-surface.png
  - Duration: 4209 ms
- [ok] 17. sweep campaign dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783644303817-u208hi1
  - Screenshot: 08-sp-campaign-deep-loop/17-sweep-campaign-dashboard.png
  - Duration: 1393 ms
- [ok] 18. sweep finances surface (default)
  - Route: /gameplay/campaigns/campaign-1783644303817-u208hi1/finances
  - Screenshot: 08-sp-campaign-deep-loop/18-sweep-finances-surface.png
  - Duration: 1600 ms
- [ok] 19. sweep personnel surface (default)
  - Route: /gameplay/campaigns/campaign-1783644303817-u208hi1/personnel
  - Screenshot: 08-sp-campaign-deep-loop/19-sweep-personnel-surface.png
  - Duration: 1634 ms
- [ok] 20. sweep forces surface (default)
  - Route: /gameplay/campaigns/campaign-1783644303817-u208hi1/forces
  - Screenshot: 08-sp-campaign-deep-loop/20-sweep-forces-surface.png
  - Duration: 1611 ms
- [ok] 21. sweep mech bay surface (default)
  - Route: /gameplay/campaigns/campaign-1783644303817-u208hi1/mech-bay
  - Screenshot: 08-sp-campaign-deep-loop/21-sweep-mech-bay-surface.png
  - Duration: 1671 ms
- [ok] 22. sweep starmap surface (default)
  - Route: /gameplay/campaigns/campaign-1783644303817-u208hi1/starmap
  - Screenshot: 08-sp-campaign-deep-loop/22-sweep-starmap-surface.png
  - Duration: 3189 ms
- [ok] 23. advance campaign one day (default)
  - Route: /gameplay/campaigns/campaign-1783644303817-u208hi1
  - Screenshot: 08-sp-campaign-deep-loop/23-advance-campaign-one-day.png
  - Duration: 1887 ms
- [ok] 24. check campaign ledger (default)
  - Route: /gameplay/campaigns/campaign-1783644303817-u208hi1/log
  - Screenshot: 08-sp-campaign-deep-loop/24-check-campaign-ledger.png
  - Duration: 1552 ms

#### Findings

- C4-STATUS (minor): Pre-battle roster handoff did not show the prior one-unit collapse; 4 selected units produced: Player Force4 unitsDeep Loop 1783644276194 Security Duty for Wolf's Dragoons Lance4,733 Battle ValueSlot 1(pilot assigned)leadSlot 2(pilot assigned)memberSlot 3(pilot assigned)memberSlot 4(pilot assigned)member 4,733 Battle Value
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
- Started: 2026-07-10T00:45:45.695Z
- Finished: 2026-07-10T00:45:53.723Z

#### Steps

- [ok] 1. seed host and guest vault identities (default)
  - Route: about:blank
  - Screenshot: 09-coop-multiplayer-two-client/01-seed-host-and-guest-vault-identities.png
  - Duration: 843 ms
- [ok] 2. host creates and guest joins co-op campaign (default)
  - Route: /gameplay/campaigns/campaign-1783644347226-7tv5ckj
  - Screenshot: 09-coop-multiplayer-two-client/02-host-creates-and-guest-joins-co-op-campaign.png
  - Duration: 1946 ms
- [ok] 3. skip guest ledger check because co-op join did not connect (guest)
  - Route: /gameplay/campaigns
  - Screenshot: 09-coop-multiplayer-two-client/03-skip-guest-ledger-check-because-co-op-join-did-not-connect.png
  - Duration: 1585 ms
- [ok] 4. host creates 1v1 match and guest joins lobby (default)
  - Route: /multiplayer/lobby/5VWTGU
  - Screenshot: 09-coop-multiplayer-two-client/04-host-creates-1v1-match-and-guest-joins-lobby.png
  - Duration: 3070 ms

#### Findings

- C3 (major): Harness uses MULTIPLAYER_STORE=durable for Playwright; it does not reproduce the plain-dev in-memory split-store C3 path. Host campaign=campaign-1783644347226-7tv5ckj, guest campaign=none, host badge=none, guest badge=none, join error=No room code rendered for host campaign..
  - Evidence: step 2 (host creates and guest joins co-op campaign): 09-coop-multiplayer-two-client/02-host-creates-and-guest-joins-co-op-campaign.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
- COOP-GUEST-LEDGER-SKIPPED (minor): Guest ledger projection check was skipped because the co-op join never reached a guest campaign route.
  - Evidence: step 3 (skip guest ledger check because co-op join did not connect): 09-coop-multiplayer-two-client/03-skip-guest-ledger-check-because-co-op-join-did-not-connect.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
- MULTIPLAYER-LOBBY-OCCUPIED (minor): 1v1 lobby occupied=true; host alpha="Alpha #1Deep Play HostNot readyLeaveReadySet AI", host bravo="Bravo #1pid_48DaPkwSQCxqPaffktD7ijZzrwEmNot readySet AI", guest alpha="Alpha #1Deep Play HostNot ready", guest bravo="Bravo #1pid_48DaPkwSQCxqPaffktD7ijZzrwEmNot readyLeaveReady".
  - Evidence: step 4 (host creates 1v1 match and guest joins lobby): 09-coop-multiplayer-two-client/04-host-creates-1v1-match-and-guest-joins-lobby.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_

### 10-gm-surfaces (ok)

- Persona: campaign GM validating ledger interventions and the tactical GM dock
- Viewport: 1280x720
- Started: 2026-07-10T00:45:53.816Z
- Finished: 2026-07-10T00:46:14.944Z

#### Steps

- [ok] 1. open campaign list (default)
  - Route: /gameplay/campaigns
  - Screenshot: 10-gm-surfaces/01-open-campaign-list.png
  - Duration: 1625 ms
- [ok] 2. start campaign wizard (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/02-start-campaign-wizard.png
  - Duration: 565 ms
- [ok] 3. name campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/03-name-campaign.png
  - Duration: 449 ms
- [ok] 4. keep default mercenary campaign type (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/04-keep-default-mercenary-campaign-type.png
  - Duration: 438 ms
- [ok] 5. keep standard campaign preset (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/05-keep-standard-campaign-preset.png
  - Duration: 449 ms
- [ok] 6. add four units and four assigned pilots (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/06-add-four-units-and-four-assigned-pilots.png
  - Duration: 765 ms
- [ok] 7. submit campaign wizard and land on dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783644358130-n72d9tg
  - Screenshot: 10-gm-surfaces/07-submit-campaign-wizard-and-land-on-dashboard.png
  - Duration: 555 ms
- [ok] 8. open campaign GM ledger (default)
  - Route: /gameplay/campaigns/campaign-1783644358130-n72d9tg/gm-ledger
  - Screenshot: 10-gm-surfaces/08-open-campaign-gm-ledger.png
  - Duration: 1557 ms
  - Notes: Merchant preview=ready, approval=ApprovalApproved and applied to campaign state., playerLog=Player Action LogMerchant charge corrected by +2,500.00 C-bills.Finances - approved, privateLog=GM LedgerMerchant charge corrected by +2,500.00 C-bills.Hidden campaign merchant reversal: duplicated charge from a black-market branch.Without this GM action the duplicated merchant charge remains on the campaign ledger.Merchant inventory clue remains GM-only until the players discover it in play..
- [ok] 9. generate and approve merchant ledger correction (default)
  - Route: /gameplay/campaigns/campaign-1783644358130-n72d9tg/gm-ledger
  - Screenshot: 10-gm-surfaces/09-generate-and-approve-merchant-ledger-correction.png
  - Duration: 516 ms
  - Notes: Merchant conflict status=requires-manual-takeover, approveDisabled=true.
- [ok] 10. preview merchant conflict blocked approval (default)
  - Route: /gameplay/campaigns/campaign-1783644358130-n72d9tg/gm-ledger
  - Screenshot: 10-gm-surfaces/10-preview-merchant-conflict-blocked-approval.png
  - Duration: 448 ms
  - Notes: Time cascade preview=2026-07-10 -> 2026-07-12 (2 days); external effects=none rendered. Current UI renders summary plus effects list, not a per-day expanded breakdown.
- [ok] 11. preview and approve time-cascade correction (default)
  - Route: /gameplay/campaigns/campaign-1783644358130-n72d9tg/gm-ledger
  - Screenshot: 10-gm-surfaces/11-preview-and-approve-time-cascade-correction.png
  - Duration: 575 ms
- [ok] 12. return to dashboard before battle setup save (default)
  - Route: /gameplay/campaigns/campaign-1783644358130-n72d9tg
  - Screenshot: 10-gm-surfaces/12-return-to-dashboard-before-battle-setup-save.png
  - Duration: 1370 ms
- [ok] 13. save campaign to server (default)
  - Route: /gameplay/campaigns/campaign-1783644358130-n72d9tg
  - Screenshot: 10-gm-surfaces/13-save-campaign-to-server.png
  - Duration: 465 ms
- [ok] 14. open contract market (default)
  - Route: /gameplay/campaigns/campaign-1783644358130-n72d9tg/contract-market
  - Screenshot: 10-gm-surfaces/14-open-contract-market.png
  - Duration: 1442 ms
- [ok] 15. accept first available contract (default)
  - Route: /gameplay/campaigns/campaign-1783644358130-n72d9tg/contract-market
  - Screenshot: 10-gm-surfaces/15-accept-first-available-contract.png
  - Duration: 1443 ms
- [ok] 16. open campaign missions (default)
  - Route: /gameplay/campaigns/campaign-1783644358130-n72d9tg/missions
  - Screenshot: 10-gm-surfaces/16-open-campaign-missions.png
  - Duration: 1597 ms
- [ok] 17. open mission launch briefing (default)
  - Route: /gameplay/campaigns/campaign-1783644358130-n72d9tg/missions/contract-1783644363948-e14f2y0/launch
  - Screenshot: 10-gm-surfaces/17-open-mission-launch-briefing.png
  - Duration: 550 ms
- [ok] 18. select roster and launch mission to pre-battle (default)
  - Route: /gameplay/encounters/encounter-19386057-d6e5-44be-9d32-44f6a7826d7d/pre-battle?campaignId=campaign-1783644358130-n72d9tg&missionId=contract-1783644363948-e14f2y0
  - Screenshot: 10-gm-surfaces/18-select-roster-and-launch-mission-to-pre-battle.png
  - Duration: 1299 ms
- [ok] 19. open manual battle before switching to GM query mode (default)
  - Route: /gameplay/games/06c048f1-67df-437e-a35a-41d2e79f5c03?campaignId=campaign-1783644358130-n72d9tg&missionId=contract-1783644363948-e14f2y0
  - Screenshot: 10-gm-surfaces/19-open-manual-battle-before-switching-to-gm-query-mode.png
  - Duration: 1132 ms
  - Console/page errors: 1
- [ok] 20. enter battle GM dock via query param (default)
  - Route: /gameplay/games/06c048f1-67df-437e-a35a-41d2e79f5c03?campaignId=campaign-1783644358130-n72d9tg&missionId=contract-1783644363948-e14f2y0&gm=1
  - Screenshot: 10-gm-surfaces/20-enter-battle-gm-dock-via-query-param.png
  - Duration: 2108 ms
  - Notes: GM tactical mode is entered by appending ?gm=1; source resolveGameSessionShellMode confirms no in-app toggle exists.
- [ok] 21. preview and approve GM Advance Phase (default)
  - Route: /gameplay/games/06c048f1-67df-437e-a35a-41d2e79f5c03?campaignId=campaign-1783644358130-n72d9tg&missionId=contract-1783644363948-e14f2y0&gm=1
  - Screenshot: 10-gm-surfaces/21-preview-and-approve-gm-advance-phase.png
  - Duration: 1779 ms

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
- C2-STATUS (minor): GM Advance Phase before="Initiative" after="Movement"; phaseChanged=true, composer=false, terminal=none, error=none.
  - Evidence: step 21 (preview and approve GM Advance Phase): 10-gm-surfaces/21-preview-and-approve-gm-advance-phase.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
