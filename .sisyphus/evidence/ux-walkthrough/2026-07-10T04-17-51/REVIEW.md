# UX Walkthrough Review - 2026-07-10T04-17-51

## TL;DR

- Reviewer summary: \_\_\_
- Release/blocker call: \_\_\_
- Follow-up owner: \_\_\_

## Run Summary

- Build mode: development
- Started: 2026-07-10T10:17:57.783Z
- Finished: 2026-07-10T10:21:31.992Z
- Journeys: 10 (0 failed)
- Steps: 107 (0 failed, 5 with console/page errors)
- Findings: 10

## Journeys

### 01-first-visit-navigation (ok)

- Persona: first-time visitor exploring the app shell
- Viewport: 1280x720
- Started: 2026-07-10T10:19:59.710Z
- Finished: 2026-07-10T10:20:12.829Z

#### Steps

- [ok] 1. land on dashboard (default)
  - Route: /
  - Screenshot: 01-first-visit-navigation/01-land-on-dashboard.png
  - Duration: 2176 ms
- [ok] 2. open Browse menu (default)
  - Route: /
  - Screenshot: 01-first-visit-navigation/02-open-browse-menu.png
  - Duration: 689 ms
- [ok] 3. open Gameplay menu (default)
  - Route: /
  - Screenshot: 01-first-visit-navigation/03-open-gameplay-menu.png
  - Duration: 705 ms
- [ok] 4. visit gameplay hub from dashboard card (default)
  - Route: /gameplay
  - Screenshot: 01-first-visit-navigation/04-visit-gameplay-hub-from-dashboard-card.png
  - Duration: 2339 ms
- [ok] 5. read onboarding page (default)
  - Route: /onboarding
  - Screenshot: 01-first-visit-navigation/05-read-onboarding-page.png
  - Duration: 1460 ms
- [ok] 6. return to dashboard from onboarding (default)
  - Route: /
  - Screenshot: 01-first-visit-navigation/06-return-to-dashboard-from-onboarding.png
  - Duration: 2419 ms
- [ok] 7. open settings (default)
  - Route: /settings
  - Screenshot: 01-first-visit-navigation/07-open-settings.png
  - Duration: 3330 ms

#### Findings

- _No findings recorded._

### 02-compendium-browse (ok)

- Persona: player researching units and equipment
- Viewport: 1280x720
- Started: 2026-07-10T10:20:12.934Z
- Finished: 2026-07-10T10:20:29.412Z

#### Steps

- [ok] 1. open compendium hub (default)
  - Route: /compendium
  - Screenshot: 02-compendium-browse/01-open-compendium-hub.png
  - Duration: 3825 ms
- [ok] 2. search the compendium for "heat" (default)
  - Route: /compendium
  - Screenshot: 02-compendium-browse/02-search-the-compendium-for-heat.png
  - Duration: 553 ms
- [ok] 3. clear search and open unit database (default)
  - Route: /compendium
  - Screenshot: 02-compendium-browse/03-clear-search-and-open-unit-database.png
  - Duration: 592 ms
- [ok] 4. open the first unit detail (default)
  - Route: /compendium/units/battle-tripod-r-h3l-2x
  - Screenshot: 02-compendium-browse/04-open-the-first-unit-detail.png
  - Duration: 2779 ms
- [ok] 5. browser-back returns to unit database (default)
  - Route: /compendium/units
  - Screenshot: 02-compendium-browse/05-browser-back-returns-to-unit-database.png
  - Duration: 632 ms
- [ok] 6. open equipment catalog (default)
  - Route: /compendium/equipment
  - Screenshot: 02-compendium-browse/06-open-equipment-catalog.png
  - Duration: 3163 ms
- [ok] 7. open the first equipment detail (default)
  - Route: /compendium/equipment/ac-2
  - Screenshot: 02-compendium-browse/07-open-the-first-equipment-detail.png
  - Duration: 3442 ms
- [ok] 8. open rules reference (default)
  - Route: /compendium/rules
  - Screenshot: 02-compendium-browse/08-open-rules-reference.png
  - Duration: 1491 ms

#### Findings

- _No findings recorded._

### 03-fresh-profile-empty-states (ok)

- Persona: new player with no saved content yet
- Viewport: 1280x720
- Started: 2026-07-10T10:20:29.628Z
- Finished: 2026-07-10T10:20:36.518Z

#### Steps

- [ok] 1. my units is empty (default)
  - Route: /units
  - Screenshot: 03-fresh-profile-empty-states/01-my-units-is-empty.png
  - Duration: 2200 ms
- [ok] 2. replay library (default)
  - Route: /replay-library
  - Screenshot: 03-fresh-profile-empty-states/02-replay-library.png
  - Duration: 1780 ms
- [ok] 3. watch the first replay (default)
  - Route: /replay-library
  - Screenshot: 03-fresh-profile-empty-states/03-watch-the-first-replay.png
  - Duration: 1478 ms
  - Notes: Library was already populated on this profile — exercised the watch path instead of the empty-state CTA.
- [ok] 4. return to the library (default)
  - Route: /replay-library
  - Screenshot: 03-fresh-profile-empty-states/04-return-to-the-library.png
  - Duration: 1428 ms

#### Findings

- _No findings recorded._

### 04-quick-game-auto-resolve (ok)

- Persona: player running their first quick battle
- Viewport: 1280x720
- Started: 2026-07-10T10:20:36.629Z
- Finished: 2026-07-10T10:20:45.007Z

#### Steps

- [ok] 1. quick game welcome (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/01-quick-game-welcome.png
  - Duration: 2878 ms
- [ok] 2. start setup (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/02-start-setup.png
  - Duration: 434 ms
- [ok] 3. add two units to my force (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/03-add-two-units-to-my-force.png
  - Duration: 479 ms
- [ok] 4. continue to scenario configuration (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/04-continue-to-scenario-configuration.png
  - Duration: 455 ms
- [ok] 5. generate scenario (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/05-generate-scenario.png
  - Duration: 564 ms
- [ok] 6. review scenario (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/06-review-scenario.png
  - Duration: 425 ms
- [ok] 7. auto-resolve the battle (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/07-auto-resolve-the-battle.png
  - Duration: 571 ms
- [ok] 8. inspect unit outcomes tab (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/08-inspect-unit-outcomes-tab.png
  - Duration: 465 ms
- [ok] 9. inspect replay tab (default)
  - Route: /gameplay/quick
  - Screenshot: 04-quick-game-auto-resolve/09-inspect-replay-tab.png
  - Duration: 777 ms
- [ok] 10. exit to games (default)
  - Route: /gameplay/games
  - Screenshot: 04-quick-game-auto-resolve/10-exit-to-games.png
  - Duration: 1330 ms

#### Findings

- _No findings recorded._

### 05-customizer-new-unit (ok)

- Persona: player building their first custom BattleMech
- Viewport: 1280x720
- Started: 2026-07-10T10:20:45.125Z
- Finished: 2026-07-10T10:20:55.000Z

#### Steps

- [ok] 1. open the customizer (default)
  - Route: /customizer
  - Screenshot: 05-customizer-new-unit/01-open-the-customizer.png
  - Duration: 4964 ms
- [ok] 2. open the new-unit dialog (default)
  - Route: /customizer
  - Screenshot: 05-customizer-new-unit/02-open-the-new-unit-dialog.png
  - Duration: 445 ms
- [ok] 3. create a default BattleMech (default)
  - Route: /customizer/c73c0a33-4af6-497b-a2eb-73c2e7a9f669/structure
  - Screenshot: 05-customizer-new-unit/03-create-a-default-battlemech.png
  - Duration: 525 ms
- [ok] 4. adjust heat sinks (autosave) (default)
  - Route: /customizer/c73c0a33-4af6-497b-a2eb-73c2e7a9f669/structure
  - Screenshot: 05-customizer-new-unit/04-adjust-heat-sinks-autosave.png
  - Duration: 486 ms
  - Notes: Edits autosave to local storage; the transient Saved toast is the only save feedback.
- [ok] 5. view armor diagram (default)
  - Route: /customizer/c73c0a33-4af6-497b-a2eb-73c2e7a9f669/armor
  - Screenshot: 05-customizer-new-unit/05-view-armor-diagram.png
  - Duration: 483 ms
- [ok] 6. view overview tab (default)
  - Route: /customizer/c73c0a33-4af6-497b-a2eb-73c2e7a9f669/overview
  - Screenshot: 05-customizer-new-unit/06-view-overview-tab.png
  - Duration: 493 ms
- [ok] 7. view equipment tab (default)
  - Route: /customizer/c73c0a33-4af6-497b-a2eb-73c2e7a9f669/equipment
  - Screenshot: 05-customizer-new-unit/07-view-equipment-tab.png
  - Duration: 557 ms
- [ok] 8. view critical slots tab (default)
  - Route: /customizer/c73c0a33-4af6-497b-a2eb-73c2e7a9f669/criticals
  - Screenshot: 05-customizer-new-unit/08-view-critical-slots-tab.png
  - Duration: 586 ms
- [ok] 9. view record sheet preview (default)
  - Route: /customizer/c73c0a33-4af6-497b-a2eb-73c2e7a9f669/preview
  - Screenshot: 05-customizer-new-unit/09-view-record-sheet-preview.png
  - Duration: 1336 ms

#### Findings

- _No findings recorded._

### 06-campaign-create-to-launch (ok)

- Persona: player starting a mercenary campaign
- Viewport: 1280x720
- Started: 2026-07-10T10:20:55.291Z
- Finished: 2026-07-10T10:21:20.557Z

#### Steps

- [ok] 1. campaigns list (fresh profile) (default)
  - Route: /gameplay/campaigns
  - Screenshot: 06-campaign-create-to-launch/01-campaigns-list-fresh-profile.png
  - Duration: 3402 ms
- [ok] 2. start the campaign wizard (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 06-campaign-create-to-launch/02-start-the-campaign-wizard.png
  - Duration: 3356 ms
- [ok] 3. name the campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 06-campaign-create-to-launch/03-name-the-campaign.png
  - Duration: 408 ms
- [ok] 4. choose campaign type (default mercenary) (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 06-campaign-create-to-launch/04-choose-campaign-type-default-mercenary.png
  - Duration: 437 ms
- [ok] 5. choose preset (default standard) (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 06-campaign-create-to-launch/05-choose-preset-default-standard.png
  - Duration: 449 ms
- [ok] 6. add a starting unit and pilot (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 06-campaign-create-to-launch/06-add-a-starting-unit-and-pilot.png
  - Duration: 525 ms
- [ok] 7. review and create the campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 06-campaign-create-to-launch/07-review-and-create-the-campaign.png
  - Duration: 424 ms
- [ok] 8. land on the campaign dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783678864332-4i5vdpa
  - Screenshot: 06-campaign-create-to-launch/08-land-on-the-campaign-dashboard.png
  - Duration: 546 ms
- [ok] 9. save the campaign to the server (default)
  - Route: /gameplay/campaigns/campaign-1783678864332-4i5vdpa
  - Screenshot: 06-campaign-create-to-launch/09-save-the-campaign-to-the-server.png
  - Duration: 440 ms
  - Notes: A new campaign lives only in browser storage until the player finds the Save now card — easy to lose a campaign without noticing.
- [ok] 10. visit the starmap (default)
  - Route: /gameplay/campaigns/campaign-1783678864332-4i5vdpa/starmap
  - Screenshot: 06-campaign-create-to-launch/10-visit-the-starmap.png
  - Duration: 2418 ms
- [ok] 11. visit the mech bay (default)
  - Route: /gameplay/campaigns/campaign-1783678864332-4i5vdpa/mech-bay
  - Screenshot: 06-campaign-create-to-launch/11-visit-the-mech-bay.png
  - Duration: 3362 ms
- [ok] 12. browse the contract market (default)
  - Route: /gameplay/campaigns/campaign-1783678864332-4i5vdpa/contract-market
  - Screenshot: 06-campaign-create-to-launch/12-browse-the-contract-market.png
  - Duration: 3388 ms
- [ok] 13. accept a contract offer (default)
  - Route: /gameplay/campaigns/campaign-1783678864332-4i5vdpa/contract-market
  - Screenshot: 06-campaign-create-to-launch/13-accept-a-contract-offer.png
  - Duration: 432 ms
- [ok] 14. see the mission on the missions page (default)
  - Route: /gameplay/campaigns/campaign-1783678864332-4i5vdpa/missions
  - Screenshot: 06-campaign-create-to-launch/14-see-the-mission-on-the-missions-page.png
  - Duration: 2337 ms
  - Notes: Launch button is enabled with the wizard-added roster.
- [ok] 15. open the mission launch screen (default)
  - Route: /gameplay/campaigns/campaign-1783678864332-4i5vdpa/missions/contract-1783678873350-y2g9ff6/launch
  - Screenshot: 06-campaign-create-to-launch/15-open-the-mission-launch-screen.png
  - Duration: 3342 ms
  - Notes: Launch screen reached through the mission-card Launch link.

#### Findings

- _No findings recorded._

### 07-mobile-navigation (ok)

- Persona: phone user finding their way around
- Viewport: 1280x720
- Started: 2026-07-10T10:21:20.664Z
- Finished: 2026-07-10T10:21:31.684Z

#### Steps

- [ok] 1. mobile dashboard (default)
  - Route: /
  - Screenshot: 07-mobile-navigation/01-mobile-dashboard.png
  - Duration: 3532 ms
- [ok] 2. open hamburger menu (default)
  - Route: /
  - Screenshot: 07-mobile-navigation/02-open-hamburger-menu.png
  - Duration: 441 ms
- [ok] 3. navigate to quick game from mobile menu (default)
  - Route: /gameplay/quick
  - Screenshot: 07-mobile-navigation/03-navigate-to-quick-game-from-mobile-menu.png
  - Duration: 2324 ms
- [ok] 4. mobile compendium hub (default)
  - Route: /compendium
  - Screenshot: 07-mobile-navigation/04-mobile-compendium-hub.png
  - Duration: 3466 ms
- [ok] 5. mobile unit database (default)
  - Route: /compendium/units
  - Screenshot: 07-mobile-navigation/05-mobile-unit-database.png
  - Duration: 1257 ms

#### Findings

- _No findings recorded._

### 08-sp-campaign-deep-loop (ok)

- Persona: player pushing a campaign from creation through a battle attempt and full sweep
- Viewport: 1280x720
- Started: 2026-07-10T10:17:57.783Z
- Finished: 2026-07-10T10:19:07.546Z

#### Steps

- [ok] 1. open campaign list (default)
  - Route: /gameplay/campaigns
  - Screenshot: 08-sp-campaign-deep-loop/01-open-campaign-list.png
  - Duration: 14980 ms
- [ok] 2. start campaign wizard (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/02-start-campaign-wizard.png
  - Duration: 3365 ms
- [ok] 3. name campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/03-name-campaign.png
  - Duration: 492 ms
- [ok] 4. keep default mercenary campaign type (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/04-keep-default-mercenary-campaign-type.png
  - Duration: 454 ms
- [ok] 5. keep standard campaign preset (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/05-keep-standard-campaign-preset.png
  - Duration: 440 ms
- [ok] 6. add four units and four assigned pilots (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/06-add-four-units-and-four-assigned-pilots.png
  - Duration: 764 ms
- [ok] 7. submit campaign wizard and land on dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783678698323-mgtx79k
  - Screenshot: 08-sp-campaign-deep-loop/07-submit-campaign-wizard-and-land-on-dashboard.png
  - Duration: 1333 ms
- [ok] 8. save campaign to server (default)
  - Route: /gameplay/campaigns/campaign-1783678698323-mgtx79k
  - Screenshot: 08-sp-campaign-deep-loop/08-save-campaign-to-server.png
  - Duration: 454 ms
- [ok] 9. open contract market (default)
  - Route: /gameplay/campaigns/campaign-1783678698323-mgtx79k/contract-market
  - Screenshot: 08-sp-campaign-deep-loop/09-open-contract-market.png
  - Duration: 3341 ms
- [ok] 10. accept first available contract (default)
  - Route: /gameplay/campaigns/campaign-1783678698323-mgtx79k/contract-market
  - Screenshot: 08-sp-campaign-deep-loop/10-accept-first-available-contract.png
  - Duration: 1440 ms
- [ok] 11. open campaign missions (default)
  - Route: /gameplay/campaigns/campaign-1783678698323-mgtx79k/missions
  - Screenshot: 08-sp-campaign-deep-loop/11-open-campaign-missions.png
  - Duration: 2286 ms
  - Console/page errors: 1
- [ok] 12. open mission launch briefing (default)
  - Route: /gameplay/campaigns/campaign-1783678698323-mgtx79k/missions/contract-1783678702366-0zc0y2n/launch
  - Screenshot: 08-sp-campaign-deep-loop/12-open-mission-launch-briefing.png
  - Duration: 3346 ms
- [ok] 13. select roster and launch mission to pre-battle (default)
  - Route: /gameplay/encounters/encounter-96fe0108-1690-4446-b122-98dcabca3daf/pre-battle?campaignId=campaign-1783678698323-mgtx79k&missionId=contract-1783678702366-0zc0y2n
  - Screenshot: 08-sp-campaign-deep-loop/13-select-roster-and-launch-mission-to-pre-battle.png
  - Duration: 5268 ms
  - Console/page errors: 1
- [ok] 14. attempt manual tactical play from pre-battle (default)
  - Route: /gameplay/games/f42d7fbc-7638-4173-8e67-f44c780e0499?campaignId=campaign-1783678698323-mgtx79k&missionId=contract-1783678702366-0zc0y2n
  - Screenshot: 08-sp-campaign-deep-loop/14-attempt-manual-tactical-play-from-pre-battle.png
  - Duration: 5964 ms
  - Notes: Known-fragile C1 surface; records current phase and movement affordances.
- [ok] 15. return to pre-battle and auto-resolve mission (default)
  - Route: /gameplay/games/6b2eff11-e283-449a-9e63-b83d347432f1?campaignId=campaign-1783678698323-mgtx79k&missionId=contract-1783678702366-0zc0y2n
  - Screenshot: 08-sp-campaign-deep-loop/15-return-to-pre-battle-and-auto-resolve-mission.png
  - Duration: 4206 ms
- [ok] 16. sweep missions surface (default)
  - Route: /gameplay/campaigns/campaign-1783678698323-mgtx79k/missions
  - Screenshot: 08-sp-campaign-deep-loop/16-sweep-missions-surface.png
  - Duration: 2527 ms
- [ok] 17. sweep campaign dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783678698323-mgtx79k
  - Screenshot: 08-sp-campaign-deep-loop/17-sweep-campaign-dashboard.png
  - Duration: 3642 ms
- [ok] 18. sweep finances surface (default)
  - Route: /gameplay/campaigns/campaign-1783678698323-mgtx79k/finances
  - Screenshot: 08-sp-campaign-deep-loop/18-sweep-finances-surface.png
  - Duration: 1431 ms
- [ok] 19. sweep personnel surface (default)
  - Route: /gameplay/campaigns/campaign-1783678698323-mgtx79k/personnel
  - Screenshot: 08-sp-campaign-deep-loop/19-sweep-personnel-surface.png
  - Duration: 2391 ms
- [ok] 20. sweep forces surface (default)
  - Route: /gameplay/campaigns/campaign-1783678698323-mgtx79k/forces
  - Screenshot: 08-sp-campaign-deep-loop/20-sweep-forces-surface.png
  - Duration: 1400 ms
- [ok] 21. sweep mech bay surface (default)
  - Route: /gameplay/campaigns/campaign-1783678698323-mgtx79k/mech-bay
  - Screenshot: 08-sp-campaign-deep-loop/21-sweep-mech-bay-surface.png
  - Duration: 2389 ms
- [ok] 22. sweep starmap surface (default)
  - Route: /gameplay/campaigns/campaign-1783678698323-mgtx79k/starmap
  - Screenshot: 08-sp-campaign-deep-loop/22-sweep-starmap-surface.png
  - Duration: 2055 ms
- [ok] 23. advance campaign one day (default)
  - Route: /gameplay/campaigns/campaign-1783678698323-mgtx79k
  - Screenshot: 08-sp-campaign-deep-loop/23-advance-campaign-one-day.png
  - Duration: 2138 ms
- [ok] 24. check campaign ledger (default)
  - Route: /gameplay/campaigns/campaign-1783678698323-mgtx79k/log
  - Screenshot: 08-sp-campaign-deep-loop/24-check-campaign-ledger.png
  - Duration: 3652 ms
  - Console/page errors: 1

#### Findings

- C4-STATUS (minor): Pre-battle roster handoff did not show the prior one-unit collapse; 4 selected units produced: Player Force4 unitsDeep Loop 1783678677786 Observation Raid for Kell Hounds Lance4,733 Battle ValueLocust LCT-1V(pilot assigned)leadHunchback HBK-4G(pilot assigned)memberMarauder MAD-3R(pilot assigned)memberAtlas AS7-D(pilot assigned)member 4,733 Battle Value
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
- Started: 2026-07-10T10:19:07.704Z
- Finished: 2026-07-10T10:19:20.133Z

#### Steps

- [ok] 1. seed host and guest vault identities (default)
  - Route: about:blank
  - Screenshot: 09-coop-multiplayer-two-client/01-seed-host-and-guest-vault-identities.png
  - Duration: 870 ms
- [ok] 2. host creates and guest joins co-op campaign (default)
  - Route: /gameplay/campaigns/campaign-1783678750250-7zgh5nb
  - Screenshot: 09-coop-multiplayer-two-client/02-host-creates-and-guest-joins-co-op-campaign.png
  - Duration: 2952 ms
- [ok] 3. guest direct route shows read-only co-op ledger (guest)
  - Route: /gameplay/campaigns/campaign-1783678750250-7zgh5nb/gm-ledger
  - Screenshot: 09-coop-multiplayer-two-client/03-guest-direct-route-shows-read-only-co-op-ledger.png
  - Duration: 3833 ms
- [ok] 4. host creates 1v1 match and guest joins lobby (default)
  - Route: /multiplayer/lobby/4CWWUU
  - Screenshot: 09-coop-multiplayer-two-client/04-host-creates-1v1-match-and-guest-joins-lobby.png
  - Duration: 4298 ms

#### Findings

- C3-HARNESS-DIVERGENCE (minor): Harness uses MULTIPLAYER_STORE=durable for Playwright; it does not reproduce the plain-dev in-memory split-store C3 path. Co-op badge reads wait for hydration before capture. Host campaign=campaign-1783678750250-7zgh5nb, guest campaign=campaign-1783678750250-7zgh5nb, host badge=Co-op session: HostTD2W8W, guest badge=Co-op session: Guest, join error=none.
  - Evidence: step 2 (host creates and guest joins co-op campaign): 09-coop-multiplayer-two-client/02-host-creates-and-guest-joins-co-op-campaign.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
- COOP-GUEST-LEDGER-READONLY (minor): Guest direct gm-ledger route read-only=true; notice=true, playerView=true, playerLog=true, hiddenAbsent=true, controlsAbsent=true, privateLogAbsent=true, navLinkAbsent=true, gmSurfaceAfterReload=false, survivedReload=true.
  - Evidence: step 3 (guest direct route shows read-only co-op ledger): 09-coop-multiplayer-two-client/03-guest-direct-route-shows-read-only-co-op-ledger.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
- MULTIPLAYER-LOBBY-OCCUPIED (minor): 1v1 lobby occupied=true; host alpha="Alpha #1Deep Play HostNot readyLeaveReadySet AI", host bravo="Bravo #1pid_3vdcPuafMA8VhwYaw33qS12bu9UDNot readySet AI", guest alpha="Alpha #1Deep Play HostNot ready", guest bravo="Bravo #1pid_3vdcPuafMA8VhwYaw33qS12bu9UDNot readyLeaveReady".
  - Evidence: step 4 (host creates 1v1 match and guest joins lobby): 09-coop-multiplayer-two-client/04-host-creates-1v1-match-and-guest-joins-lobby.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_

### 10-gm-surfaces (ok)

- Persona: campaign GM validating ledger interventions and the tactical GM dock
- Viewport: 1280x720
- Started: 2026-07-10T10:19:20.192Z
- Finished: 2026-07-10T10:19:59.564Z

#### Steps

- [ok] 1. open campaign list (default)
  - Route: /gameplay/campaigns
  - Screenshot: 10-gm-surfaces/01-open-campaign-list.png
  - Duration: 3186 ms
- [ok] 2. start campaign wizard (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/02-start-campaign-wizard.png
  - Duration: 3349 ms
- [ok] 3. name campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/03-name-campaign.png
  - Duration: 479 ms
- [ok] 4. keep default mercenary campaign type (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/04-keep-default-mercenary-campaign-type.png
  - Duration: 458 ms
- [ok] 5. keep standard campaign preset (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/05-keep-standard-campaign-preset.png
  - Duration: 451 ms
- [ok] 6. add four units and four assigned pilots (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/06-add-four-units-and-four-assigned-pilots.png
  - Duration: 747 ms
- [ok] 7. submit campaign wizard and land on dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783678768886-to9p25i
  - Screenshot: 10-gm-surfaces/07-submit-campaign-wizard-and-land-on-dashboard.png
  - Duration: 816 ms
- [ok] 8. open campaign GM ledger (default)
  - Route: /gameplay/campaigns/campaign-1783678768886-to9p25i/gm-ledger
  - Screenshot: 10-gm-surfaces/08-open-campaign-gm-ledger.png
  - Duration: 3552 ms
  - Notes: Merchant preview=ready, approval=ApprovalApproved and applied to campaign state., playerLog=Player Action LogMerchant charge corrected by +2,500.00 C-bills.Finances - approved, privateLog=GM LedgerMerchant charge corrected by +2,500.00 C-bills.Hidden campaign merchant reversal: duplicated charge from a black-market branch.Without this GM action the duplicated merchant charge remains on the campaign ledger.Merchant inventory clue remains GM-only until the players discover it in play..
- [ok] 9. generate and approve merchant ledger correction (default)
  - Route: /gameplay/campaigns/campaign-1783678768886-to9p25i/gm-ledger
  - Screenshot: 10-gm-surfaces/09-generate-and-approve-merchant-ledger-correction.png
  - Duration: 518 ms
  - Notes: Merchant conflict status=requires-manual-takeover, approveDisabled=true.
- [ok] 10. preview merchant conflict blocked approval (default)
  - Route: /gameplay/campaigns/campaign-1783678768886-to9p25i/gm-ledger
  - Screenshot: 10-gm-surfaces/10-preview-merchant-conflict-blocked-approval.png
  - Duration: 452 ms
  - Notes: Time cascade preview=2026-07-10 -> 2026-07-12 (2 days); external effects=none rendered. Current UI renders summary plus effects list, not a per-day expanded breakdown.
- [ok] 11. preview and approve time-cascade correction (default)
  - Route: /gameplay/campaigns/campaign-1783678768886-to9p25i/gm-ledger
  - Screenshot: 10-gm-surfaces/11-preview-and-approve-time-cascade-correction.png
  - Duration: 542 ms
- [ok] 12. return to dashboard before battle setup save (default)
  - Route: /gameplay/campaigns/campaign-1783678768886-to9p25i
  - Screenshot: 10-gm-surfaces/12-return-to-dashboard-before-battle-setup-save.png
  - Duration: 1998 ms
- [ok] 13. save campaign to server (default)
  - Route: /gameplay/campaigns/campaign-1783678768886-to9p25i
  - Screenshot: 10-gm-surfaces/13-save-campaign-to-server.png
  - Duration: 431 ms
- [ok] 14. open contract market (default)
  - Route: /gameplay/campaigns/campaign-1783678768886-to9p25i/contract-market
  - Screenshot: 10-gm-surfaces/14-open-contract-market.png
  - Duration: 3059 ms
- [ok] 15. accept first available contract (default)
  - Route: /gameplay/campaigns/campaign-1783678768886-to9p25i/contract-market
  - Screenshot: 10-gm-surfaces/15-accept-first-available-contract.png
  - Duration: 1459 ms
- [ok] 16. open campaign missions (default)
  - Route: /gameplay/campaigns/campaign-1783678768886-to9p25i/missions
  - Screenshot: 10-gm-surfaces/16-open-campaign-missions.png
  - Duration: 2089 ms
  - Console/page errors: 1
- [ok] 17. open mission launch briefing (default)
  - Route: /gameplay/campaigns/campaign-1783678768886-to9p25i/missions/contract-1783678779201-ysu53x8/launch
  - Screenshot: 10-gm-surfaces/17-open-mission-launch-briefing.png
  - Duration: 3352 ms
- [ok] 18. select roster and launch mission to pre-battle (default)
  - Route: /gameplay/encounters/encounter-50b23f6f-b92b-40ab-9f19-e469a8912f23/pre-battle?campaignId=campaign-1783678768886-to9p25i&missionId=contract-1783678779201-ysu53x8
  - Screenshot: 10-gm-surfaces/18-select-roster-and-launch-mission-to-pre-battle.png
  - Duration: 3566 ms
  - Console/page errors: 1
- [ok] 19. open manual battle before switching to GM query mode (default)
  - Route: /gameplay/games/94cc3a93-4f88-4456-9061-fdc79ebbe198?campaignId=campaign-1783678768886-to9p25i&missionId=contract-1783678779201-ysu53x8
  - Screenshot: 10-gm-surfaces/19-open-manual-battle-before-switching-to-gm-query-mode.png
  - Duration: 3249 ms
- [ok] 20. enter battle GM dock via query param (default)
  - Route: /gameplay/games/94cc3a93-4f88-4456-9061-fdc79ebbe198?campaignId=campaign-1783678768886-to9p25i&missionId=contract-1783678779201-ysu53x8&gm=1
  - Screenshot: 10-gm-surfaces/20-enter-battle-gm-dock-via-query-param.png
  - Duration: 3938 ms
  - Notes: GM tactical mode is entered by appending ?gm=1; source resolveGameSessionShellMode confirms no in-app toggle exists.
- [ok] 21. preview and approve GM Advance Phase (default)
  - Route: /gameplay/games/94cc3a93-4f88-4456-9061-fdc79ebbe198?campaignId=campaign-1783678768886-to9p25i&missionId=contract-1783678779201-ysu53x8&gm=1
  - Screenshot: 10-gm-surfaces/21-preview-and-approve-gm-advance-phase.png
  - Duration: 1680 ms

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
