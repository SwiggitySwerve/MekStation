# UX Walkthrough Review - 2026-07-08T14-06-03

## TL;DR

- Reviewer summary: \_\_\_
- Release/blocker call: \_\_\_
- Follow-up owner: \_\_\_

## Run Summary

- Build mode: development
- Started: 2026-07-08T20:06:10.225Z
- Finished: 2026-07-08T20:06:55.018Z
- Journeys: 1 (0 failed)
- Steps: 21 (0 failed, 3 with console/page errors)
- Findings: 4

## Journeys

### 10-gm-surfaces (ok)

- Persona: campaign GM validating ledger interventions and the tactical GM dock
- Viewport: 1280x720
- Started: 2026-07-08T20:06:10.225Z
- Finished: 2026-07-08T20:06:54.700Z

#### Steps

- [ok] 1. open campaign list (default)
  - Route: /gameplay/campaigns
  - Screenshot: 10-gm-surfaces/01-open-campaign-list.png
  - Duration: 12492 ms
- [ok] 2. start campaign wizard (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/02-start-campaign-wizard.png
  - Duration: 1317 ms
- [ok] 3. name campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/03-name-campaign.png
  - Duration: 481 ms
- [ok] 4. keep default mercenary campaign type (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/04-keep-default-mercenary-campaign-type.png
  - Duration: 439 ms
- [ok] 5. keep standard campaign preset (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/05-keep-standard-campaign-preset.png
  - Duration: 437 ms
- [ok] 6. add four units and four assigned pilots (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/06-add-four-units-and-four-assigned-pilots.png
  - Duration: 758 ms
- [ok] 7. submit campaign wizard and land on dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783541186197-txajbaa
  - Screenshot: 10-gm-surfaces/07-submit-campaign-wizard-and-land-on-dashboard.png
  - Duration: 1337 ms
- [ok] 8. open campaign GM ledger (default)
  - Route: /gameplay/campaigns/campaign-1783541186197-txajbaa/gm-ledger
  - Screenshot: 10-gm-surfaces/08-open-campaign-gm-ledger.png
  - Duration: 1432 ms
  - Notes: Merchant preview=ready, approval=ApprovalApproved and applied to campaign state., playerLog=Player Action LogMerchant charge corrected by +2,500.00 C-bills.Finances - approved, privateLog=GM LedgerMerchant charge corrected by +2,500.00 C-bills.Hidden campaign merchant reversal: duplicated charge from a black-market branch.Without this GM action the duplicated merchant charge remains on the campaign ledger.Merchant inventory clue remains GM-only until the players discover it in play..
- [ok] 9. generate and approve merchant ledger correction (default)
  - Route: /gameplay/campaigns/campaign-1783541186197-txajbaa/gm-ledger
  - Screenshot: 10-gm-surfaces/09-generate-and-approve-merchant-ledger-correction.png
  - Duration: 497 ms
  - Notes: Merchant conflict status=requires-manual-takeover, approveDisabled=true.
- [ok] 10. preview merchant conflict blocked approval (default)
  - Route: /gameplay/campaigns/campaign-1783541186197-txajbaa/gm-ledger
  - Screenshot: 10-gm-surfaces/10-preview-merchant-conflict-blocked-approval.png
  - Duration: 450 ms
  - Notes: Time cascade preview=2026-07-08 -> 2026-07-10 (2 days); external effects=none rendered. Current UI renders summary plus effects list, not a per-day expanded breakdown.
- [ok] 11. preview and approve time-cascade correction (default)
  - Route: /gameplay/campaigns/campaign-1783541186197-txajbaa/gm-ledger
  - Screenshot: 10-gm-surfaces/11-preview-and-approve-time-cascade-correction.png
  - Duration: 523 ms
- [ok] 12. return to dashboard before battle setup save (default)
  - Route: /gameplay/campaigns/campaign-1783541186197-txajbaa
  - Screenshot: 10-gm-surfaces/12-return-to-dashboard-before-battle-setup-save.png
  - Duration: 1254 ms
- [ok] 13. save campaign to server (default)
  - Route: /gameplay/campaigns/campaign-1783541186197-txajbaa
  - Screenshot: 10-gm-surfaces/13-save-campaign-to-server.png
  - Duration: 428 ms
- [ok] 14. open contract market (default)
  - Route: /gameplay/campaigns/campaign-1783541186197-txajbaa/contract-market
  - Screenshot: 10-gm-surfaces/14-open-contract-market.png
  - Duration: 1403 ms
- [ok] 15. accept first available contract (default)
  - Route: /gameplay/campaigns/campaign-1783541186197-txajbaa/contract-market
  - Screenshot: 10-gm-surfaces/15-accept-first-available-contract.png
  - Duration: 1440 ms
- [ok] 16. open campaign missions (default)
  - Route: /gameplay/campaigns/campaign-1783541186197-txajbaa/missions
  - Screenshot: 10-gm-surfaces/16-open-campaign-missions.png
  - Duration: 1432 ms
- [ok] 17. open mission launch briefing (default)
  - Route: /gameplay/campaigns/campaign-1783541186197-txajbaa/missions/contract-1783541192462-q8euyhe/launch
  - Screenshot: 10-gm-surfaces/17-open-mission-launch-briefing.png
  - Duration: 1336 ms
- [ok] 18. select roster and launch mission to pre-battle (default)
  - Route: /gameplay/encounters/encounter-75be3e87-654d-4e02-9331-8e16ad0508f3/pre-battle?campaignId=campaign-1783541186197-txajbaa&missionId=contract-1783541192462-q8euyhe
  - Screenshot: 10-gm-surfaces/18-select-roster-and-launch-mission-to-pre-battle.png
  - Duration: 3215 ms
  - Console/page errors: 1
- [ok] 19. open manual battle before switching to GM query mode (default)
  - Route: /gameplay/games/bdc2adfa-861d-4ee2-902f-509c30323f9c?campaignId=campaign-1783541186197-txajbaa&missionId=contract-1783541192462-q8euyhe
  - Screenshot: 10-gm-surfaces/19-open-manual-battle-before-switching-to-gm-query-mode.png
  - Duration: 1509 ms
  - Console/page errors: 12
- [ok] 20. enter battle GM dock via query param (default)
  - Route: /gameplay/games/bdc2adfa-861d-4ee2-902f-509c30323f9c?campaignId=campaign-1783541186197-txajbaa&missionId=contract-1783541192462-q8euyhe&gm=1
  - Screenshot: 10-gm-surfaces/20-enter-battle-gm-dock-via-query-param.png
  - Duration: 1789 ms
  - Console/page errors: 16
  - Notes: GM tactical mode is entered by appending ?gm=1; source resolveGameSessionShellMode confirms no in-app toggle exists.
- [ok] 21. preview and approve GM Advance Phase (default)
  - Route: /gameplay/games/bdc2adfa-861d-4ee2-902f-509c30323f9c?campaignId=campaign-1783541186197-txajbaa&missionId=contract-1783541192462-q8euyhe&gm=1
  - Screenshot: 10-gm-surfaces/21-preview-and-approve-gm-advance-phase.png
  - Duration: 10498 ms

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
