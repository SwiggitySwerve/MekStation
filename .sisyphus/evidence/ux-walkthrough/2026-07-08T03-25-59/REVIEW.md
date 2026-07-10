# UX Walkthrough Review - 2026-07-08T03-25-59

## TL;DR

- Reviewer summary: \_\_\_
- Release/blocker call: \_\_\_
- Follow-up owner: \_\_\_

## Run Summary

- Build mode: development
- Started: 2026-07-08T09:26:06.263Z
- Finished: 2026-07-08T09:26:45.091Z
- Journeys: 1 (1 failed)
- Steps: 12 (1 failed, 0 with console/page errors)
- Findings: 3

## Journeys

### 10-gm-surfaces (failed)

- Persona: campaign GM validating ledger interventions and the tactical GM dock
- Viewport: 1280x720
- Started: 2026-07-08T09:26:06.263Z
- Finished: 2026-07-08T09:26:44.796Z

#### Steps

- [ok] 1. open campaign list (default)
  - Route: /gameplay/campaigns
  - Screenshot: 10-gm-surfaces/01-open-campaign-list.png
  - Duration: 11357 ms
- [ok] 2. start campaign wizard (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/02-start-campaign-wizard.png
  - Duration: 1297 ms
- [ok] 3. name campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/03-name-campaign.png
  - Duration: 458 ms
- [ok] 4. keep default mercenary campaign type (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/04-keep-default-mercenary-campaign-type.png
  - Duration: 435 ms
- [ok] 5. keep standard campaign preset (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/05-keep-standard-campaign-preset.png
  - Duration: 442 ms
- [ok] 6. add four units and four assigned pilots (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 10-gm-surfaces/06-add-four-units-and-four-assigned-pilots.png
  - Duration: 723 ms
- [ok] 7. submit campaign wizard and land on dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783502781013-mkj7lpe
  - Screenshot: 10-gm-surfaces/07-submit-campaign-wizard-and-land-on-dashboard.png
  - Duration: 800 ms
- [ok] 8. open campaign GM ledger (default)
  - Route: /gameplay/campaigns/campaign-1783502781013-mkj7lpe/gm-ledger
  - Screenshot: 10-gm-surfaces/08-open-campaign-gm-ledger.png
  - Duration: 1478 ms
  - Notes: Merchant preview=ready, approval=ApprovalApproved and applied to campaign state., playerLog=Player Action LogMerchant charge corrected by +2,500.00 C-bills.Finances - approved, privateLog=GM LedgerMerchant charge corrected by +2,500.00 C-bills.Hidden campaign merchant reversal: duplicated charge from a black-market branch.Without this GM action the duplicated merchant charge remains on the campaign ledger.Merchant inventory clue remains GM-only until the players discover it in play..
- [ok] 9. generate and approve merchant ledger correction (default)
  - Route: /gameplay/campaigns/campaign-1783502781013-mkj7lpe/gm-ledger
  - Screenshot: 10-gm-surfaces/09-generate-and-approve-merchant-ledger-correction.png
  - Duration: 512 ms
  - Notes: Merchant conflict status=requires-manual-takeover, approveDisabled=true.
- [ok] 10. preview merchant conflict blocked approval (default)
  - Route: /gameplay/campaigns/campaign-1783502781013-mkj7lpe/gm-ledger
  - Screenshot: 10-gm-surfaces/10-preview-merchant-conflict-blocked-approval.png
  - Duration: 443 ms
  - Notes: Time cascade preview=2026-07-08 -> 2026-07-10 (2 days); external effects=none rendered. Current UI renders summary plus effects list, not a per-day expanded breakdown.
- [ok] 11. preview and approve time-cascade correction (default)
  - Route: /gameplay/campaigns/campaign-1783502781013-mkj7lpe/gm-ledger
  - Screenshot: 10-gm-surfaces/11-preview-and-approve-time-cascade-correction.png
  - Duration: 533 ms
- [failed] 12. save campaign to server (default)
  - Route: /gameplay/campaigns/campaign-1783502781013-mkj7lpe/gm-ledger
  - Screenshot: 10-gm-surfaces/12-save-campaign-to-server-FAILED.png
  - Duration: 20049 ms
  - Failure: Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed Locator: getByTestId('campaign-save-status-card') Expected: visible Timeout: 20000ms Error: element(s) not found Call log: [2m - Expect "toBeVisible" with timeout 20000ms[22m [2m - waiting for getByTestId('campaign-save-status-card')[22m

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
