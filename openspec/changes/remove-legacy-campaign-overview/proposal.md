# Remove the legacy campaign overview stack and unmounted UI

## Why

An audit found a legacy campaign overview stack and three unmounted panels with
no production importer. The campaign detail route mounts `CampaignDashboardPage`;
nothing mounts `CampaignOverviewTab`, `MissionTreeView`, `ContextPanel`,
`RefitLaunchPanel` or `ImportUnitDialog`. The owner approved deleting them on
2026-11-07 (ruling D1).

## What Changes

- Delete `CampaignOverviewTab` (+ `.missionSections`, `.sections`, `.feedback`),
  `MissionTreeView`, `CampaignStatusHelpers`.
- Move `DeleteCampaignDialog` (live: the campaign dashboard uses it) verbatim to
  `src/components/campaign/DeleteCampaignDialog.tsx`, keeping its test ids.
- Delete the legacy `CampaignStatus` / `CampaignMissionStatus` enums, the legacy
  `ICampaign` / `ICampaignMission` shapes in `CampaignInterfaces.types.ts` and
  their runtime helpers. The file keeps only the live `CampaignPilotStatus`
  re-export; the live campaign model is `Campaign.ts`.
- Delete `ContextPanel*`, `RefitLaunchPanel` and `ImportUnitDialog` with their
  stories and tests.
- REMOVED requirement: `Context Panel Mode System` (campaign-hud). No code
  implements the context-panel modes after this change.

## Impact

Affected capability: `campaign-hud`. No runtime behaviour changes: none of the
deleted modules is mounted. The refit launch flow stays live (mech bay
`onLaunchRefit` + `CampaignRefitCommandBar`), so `campaign-refit-and-prestige`
is untouched. `ImportUnitDialog` and the legacy campaign types are mentioned
only in examples and migration notes, not in a requirement. The living specs
keep those narrative mentions for a canonical sync to tidy.
