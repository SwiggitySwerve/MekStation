# UX Walkthrough Review - 2026-07-08T03-17-27

## TL;DR

- Reviewer summary: \_\_\_
- Release/blocker call: \_\_\_
- Follow-up owner: \_\_\_

## Run Summary

- Build mode: development
- Started: 2026-07-08T09:17:33.600Z
- Finished: 2026-07-08T09:18:25.199Z
- Journeys: 1 (1 failed)
- Steps: 13 (1 failed, 1 with console/page errors)
- Findings: 0

## Journeys

### 08-sp-campaign-deep-loop (failed)

- Persona: player pushing a campaign from creation through a battle attempt and full sweep
- Viewport: 1280x720
- Started: 2026-07-08T09:17:33.600Z
- Finished: 2026-07-08T09:18:24.917Z

#### Steps

- [ok] 1. open campaign list (default)
  - Route: /gameplay/campaigns
  - Screenshot: 08-sp-campaign-deep-loop/01-open-campaign-list.png
  - Duration: 11441 ms
- [ok] 2. start campaign wizard (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/02-start-campaign-wizard.png
  - Duration: 814 ms
- [ok] 3. name campaign (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/03-name-campaign.png
  - Duration: 465 ms
- [ok] 4. keep default mercenary campaign type (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/04-keep-default-mercenary-campaign-type.png
  - Duration: 428 ms
- [ok] 5. keep standard campaign preset (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/05-keep-standard-campaign-preset.png
  - Duration: 440 ms
- [ok] 6. add four units and four assigned pilots (default)
  - Route: /gameplay/campaigns/create
  - Screenshot: 08-sp-campaign-deep-loop/06-add-four-units-and-four-assigned-pilots.png
  - Duration: 753 ms
- [ok] 7. submit campaign wizard and land on dashboard (default)
  - Route: /gameplay/campaigns/campaign-1783502267985-nhtcxsa
  - Screenshot: 08-sp-campaign-deep-loop/07-submit-campaign-wizard-and-land-on-dashboard.png
  - Duration: 826 ms
- [ok] 8. save campaign to server (default)
  - Route: /gameplay/campaigns/campaign-1783502267985-nhtcxsa
  - Screenshot: 08-sp-campaign-deep-loop/08-save-campaign-to-server.png
  - Duration: 433 ms
- [ok] 9. open contract market (default)
  - Route: /gameplay/campaigns/campaign-1783502267985-nhtcxsa/contract-market
  - Screenshot: 08-sp-campaign-deep-loop/09-open-contract-market.png
  - Duration: 1407 ms
- [ok] 10. accept first available contract (default)
  - Route: /gameplay/campaigns/campaign-1783502267985-nhtcxsa/contract-market
  - Screenshot: 08-sp-campaign-deep-loop/10-accept-first-available-contract.png
  - Duration: 1452 ms
- [ok] 11. open campaign missions (default)
  - Route: /gameplay/campaigns/campaign-1783502267985-nhtcxsa/missions
  - Screenshot: 08-sp-campaign-deep-loop/11-open-campaign-missions.png
  - Duration: 1446 ms
- [ok] 12. open mission launch briefing (default)
  - Route: /gameplay/campaigns/campaign-1783502267985-nhtcxsa/missions/contract-1783502269584-7lkxqom/launch
  - Screenshot: 08-sp-campaign-deep-loop/12-open-mission-launch-briefing.png
  - Duration: 1316 ms
- [failed] 13. select roster and launch mission to pre-battle (default)
  - Route: /gameplay/encounters/encounter-9eea8219-3a22-44d1-a4f1-0537df92288e?campaignId=campaign-1783502267985-nhtcxsa&missionId=contract-1783502269584-7lkxqom
  - Screenshot: 08-sp-campaign-deep-loop/13-select-roster-and-launch-mission-to-pre-battle-FAILED.png
  - Duration: 30089 ms
  - Failure: Error: [2mexpect([22m[31mpage[39m[2m).[22mtoHaveURL[2m([22m[32mexpected[39m[2m)[22m failed Expected pattern: [32m/\/gameplay\/encounters\/[^/]+\/pre-battle/[39m Received string: [31m"http://localhost:3600/gameplay/encounters/encounter-9eea8219-3a22-44d1-a4f1-0537df92288e?campaignId=campaign-1783502267985-nhtcxsa&missionId=contract-1783502269584-7lkxqom"[39m Timeout: 30000ms Call log: [2m - Expect "toHaveURL" with timeout 30000ms[22m [2m 5 × unexpected value "http://localhost:3600/gameplay/campaigns/campaign-1783502267985-nhtcxsa/missions/contract-1783502269584-7lkxqom/launch"[22m [2m 28 × unexpected value "http://localhost:3600/gameplay/encounters/encounter-9eea8219-3a22-44d1-a4f1-0537df92288e?campaignId=campaign-1783502267985-nhtcxsa&missionId=contract-1783502269584-7lkxqom"[22m
  - Console/page errors: 1

#### Findings

- _No findings recorded._
