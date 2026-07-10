# UX Walkthrough Review - 2026-07-08T03-15-29

## TL;DR

- Reviewer summary: \_\_\_
- Release/blocker call: \_\_\_
- Follow-up owner: \_\_\_

## Run Summary

- Build mode: development
- Started: 2026-07-08T09:16:01.896Z
- Finished: 2026-07-08T09:16:42.295Z
- Journeys: 1 (1 failed)
- Steps: 10 (1 failed, 1 with console/page errors)
- Findings: 0

## Journeys

### 08-sp-campaign-deep-loop (failed)

- Persona: player pushing a campaign from creation through a battle attempt and full sweep
- Viewport: 1280x720
- Started: 2026-07-08T09:16:01.896Z
- Finished: 2026-07-08T09:16:42.000Z

#### Steps

- [ok] 1. open campaign list (default)
  - Route: /gameplay/campaigns
  - Screenshot: 08-sp-campaign-deep-loop/01-open-campaign-list.png
  - Duration: 13804 ms
- [ok] 2. start campaign wizard (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/02-start-campaign-wizard.png
  - Duration: 1314 ms
- [ok] 3. name campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/03-name-campaign.png
  - Duration: 475 ms
- [ok] 4. keep default mercenary campaign type (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/04-keep-default-mercenary-campaign-type.png
  - Duration: 439 ms
- [ok] 5. keep standard campaign preset (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/05-keep-standard-campaign-preset.png
  - Duration: 449 ms
- [ok] 6. add four units and four assigned pilots (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/06-add-four-units-and-four-assigned-pilots.png
  - Duration: 776 ms
- [ok] 7. submit campaign wizard and land on dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783502179188-pws9qie
  - Screenshot: 08-sp-campaign-deep-loop/07-submit-campaign-wizard-and-land-on-dashboard.png
  - Duration: 829 ms
- [ok] 8. save campaign to server (default)
  - Route: /gameplay/campaigns/campaign-1783502179188-pws9qie
  - Screenshot: 08-sp-campaign-deep-loop/08-save-campaign-to-server.png
  - Duration: 437 ms
- [ok] 9. open contract market (default)
  - Route: /gameplay/campaigns/campaign-1783502179188-pws9qie/contract-market
  - Screenshot: 08-sp-campaign-deep-loop/09-open-contract-market.png
  - Duration: 1477 ms
- [failed] 10. accept first available contract (default)
  - Route: /gameplay/campaigns/campaign-1783502179188-pws9qie/contract-market
  - Screenshot: 08-sp-campaign-deep-loop/10-accept-first-available-contract-FAILED.png
  - Duration: 20101 ms
  - Failure: Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed Locator: getByText(/accepted|contract accepted/i) Expected: visible Timeout: 20000ms Error: element(s) not found Call log: [2m - Expect "toBeVisible" with timeout 20000ms[22m [2m - waiting for getByText(/accepted|contract accepted/i)[22m
  - Console/page errors: 1

#### Findings

- _No findings recorded._
