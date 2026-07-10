# UX Walkthrough Review - 2026-07-08T03-27-10

## TL;DR

- Reviewer summary: \_\_\_
- Release/blocker call: \_\_\_
- Follow-up owner: \_\_\_

## Run Summary

- Build mode: development
- Started: 2026-07-08T09:27:15.958Z
- Finished: 2026-07-08T09:27:51.140Z
- Journeys: 1 (0 failed)
- Steps: 21 (0 failed, 1 with console/page errors)
- Findings: 4

## Journeys

### 10-gm-surfaces (ok)

- Persona: campaign GM validating ledger interventions and the tactical GM dock
- Viewport: 1280x720
- Started: 2026-07-08T09:27:15.958Z
- Finished: 2026-07-08T09:27:50.854Z

#### Steps

- [ok] 1. open campaign list (default)
  - Route: /gameplay/campaigns
  - Screenshot: 10-gm-surfaces/01-open-campaign-list.png
  - Duration: 11391 ms
- [ok] 2. start campaign wizard (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/02-start-campaign-wizard.png
  - Duration: 1319 ms
- [ok] 3. name campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/03-name-campaign.png
  - Duration: 462 ms
- [ok] 4. keep default mercenary campaign type (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/04-keep-default-mercenary-campaign-type.png
  - Duration: 440 ms
- [ok] 5. keep standard campaign preset (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/05-keep-standard-campaign-preset.png
  - Duration: 437 ms
- [ok] 6. add four units and four assigned pilots (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/06-add-four-units-and-four-assigned-pilots.png
  - Duration: 760 ms
- [ok] 7. submit campaign wizard and land on dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783502850794-yp66e09
  - Screenshot: 10-gm-surfaces/07-submit-campaign-wizard-and-land-on-dashboard.png
  - Duration: 792 ms
- [ok] 8. open campaign GM ledger (default)
  - Route: /gameplay/campaigns/campaign-1783502850794-yp66e09/gm-ledger
  - Screenshot: 10-gm-surfaces/08-open-campaign-gm-ledger.png
  - Duration: 1396 ms
  - Notes: Merchant preview=ready, approval=ApprovalApproved and applied to campaign state., playerLog=Player Action LogMerchant charge corrected by +2,500.00 C-bills.Finances - approved, privateLog=GM LedgerMerchant charge corrected by +2,500.00 C-bills.Hidden campaign merchant reversal: duplicated charge from a black-market branch.Without this GM action the duplicated merchant charge remains on the campaign ledger.Merchant inventory clue remains GM-only until the players discover it in play..
- [ok] 9. generate and approve merchant ledger correction (default)
  - Route: /gameplay/campaigns/campaign-1783502850794-yp66e09/gm-ledger
  - Screenshot: 10-gm-surfaces/09-generate-and-approve-merchant-ledger-correction.png
  - Duration: 492 ms
  - Notes: Merchant conflict status=requires-manual-takeover, approveDisabled=true.
- [ok] 10. preview merchant conflict blocked approval (default)
  - Route: /gameplay/campaigns/campaign-1783502850794-yp66e09/gm-ledger
  - Screenshot: 10-gm-surfaces/10-preview-merchant-conflict-blocked-approval.png
  - Duration: 458 ms
  - Notes: Time cascade preview=2026-07-08 -> 2026-07-10 (2 days); external effects=none rendered. Current UI renders summary plus effects list, not a per-day expanded breakdown.
- [ok] 11. preview and approve time-cascade correction (default)
  - Route: /gameplay/campaigns/campaign-1783502850794-yp66e09/gm-ledger
  - Screenshot: 10-gm-surfaces/11-preview-and-approve-time-cascade-correction.png
  - Duration: 538 ms
- [ok] 12. return to dashboard before battle setup save (default)
  - Route: /gameplay/campaigns/campaign-1783502850794-yp66e09
  - Screenshot: 10-gm-surfaces/12-return-to-dashboard-before-battle-setup-save.png
  - Duration: 1262 ms
- [ok] 13. save campaign to server (default)
  - Route: /gameplay/campaigns/campaign-1783502850794-yp66e09
  - Screenshot: 10-gm-surfaces/13-save-campaign-to-server.png
  - Duration: 448 ms
- [ok] 14. open contract market (default)
  - Route: /gameplay/campaigns/campaign-1783502850794-yp66e09/contract-market
  - Screenshot: 10-gm-surfaces/14-open-contract-market.png
  - Duration: 1389 ms
- [ok] 15. accept first available contract (default)
  - Route: /gameplay/campaigns/campaign-1783502850794-yp66e09/contract-market
  - Screenshot: 10-gm-surfaces/15-accept-first-available-contract.png
  - Duration: 1456 ms
- [ok] 16. open campaign missions (default)
  - Route: /gameplay/campaigns/campaign-1783502850794-yp66e09/missions
  - Screenshot: 10-gm-surfaces/16-open-campaign-missions.png
  - Duration: 1391 ms
- [ok] 17. open mission launch briefing (default)
  - Route: /gameplay/campaigns/campaign-1783502850794-yp66e09/missions/contract-1783502856512-tarslwu/launch
  - Screenshot: 10-gm-surfaces/17-open-mission-launch-briefing.png
  - Duration: 1313 ms
- [ok] 18. select roster and launch mission to pre-battle (default)
  - Route: /gameplay/encounters/encounter-753630d5-71fb-4d7f-ab24-a0c17347c6d6/pre-battle?campaignId=campaign-1783502850794-yp66e09&missionId=contract-1783502856512-tarslwu
  - Screenshot: 10-gm-surfaces/18-select-roster-and-launch-mission-to-pre-battle.png
  - Duration: 3247 ms
  - Console/page errors: 1
- [ok] 19. open manual battle before switching to GM query mode (default)
  - Route: /gameplay/games/caa49f09-4bba-46d0-81b8-20b618ddbb03?campaignId=campaign-1783502850794-yp66e09&missionId=contract-1783502856512-tarslwu
  - Screenshot: 10-gm-surfaces/19-open-manual-battle-before-switching-to-gm-query-mode.png
  - Duration: 1440 ms
- [ok] 20. enter battle GM dock via query param (default)
  - Route: /gameplay/games/caa49f09-4bba-46d0-81b8-20b618ddbb03?campaignId=campaign-1783502850794-yp66e09&missionId=contract-1783502856512-tarslwu&gm=1
  - Screenshot: 10-gm-surfaces/20-enter-battle-gm-dock-via-query-param.png
  - Duration: 1682 ms
  - Notes: GM tactical mode is entered by appending ?gm=1; source resolveGameSessionShellMode confirms no in-app toggle exists.
- [ok] 21. preview and approve GM Advance Phase (default)
  - Route: /gameplay/games/caa49f09-4bba-46d0-81b8-20b618ddbb03?campaignId=campaign-1783502850794-yp66e09&missionId=contract-1783502856512-tarslwu&gm=1
  - Screenshot: 10-gm-surfaces/21-preview-and-approve-gm-advance-phase.png
  - Duration: 2779 ms

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
- C2-STATUS (minor): GM Advance Phase before="Initiative" after="Movement"; phaseChanged=true, composer=true, error=none.
  - Evidence: step 21 (preview and approve GM Advance Phase): 10-gm-surfaces/21-preview-and-approve-gm-advance-phase.png
  - Reviewer verdict: \_\_\_ (confirmed / not reproducible / fixed)
  - Reviewer notes: \_\_\_
