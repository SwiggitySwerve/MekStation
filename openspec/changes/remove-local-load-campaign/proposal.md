## Why

`useCampaignStore.loadCampaign` read the `campaign-<id>` localStorage record and merged the separately persisted `missions-<id>` and `forces-<id>` blobs on top of it. Nothing in production called it: all seven call sites (the campaign page shell, the customizer routing, the campaigns index, and the two mission-launch modules) use `useCampaignPersistenceStore.loadCampaign`, which loads the server record. A scratch study with real storage fault injection showed the path tore between the two writes: a contract-closure credit of 3,960,000 C-bills was lost at 3 of 8 write boundaries, with no routed-payout code involved. The only reload a restarted app performs locally is the zustand rehydrate of the `campaign-store` blob.

## What Changes

The action, its `CampaignStore['loadCampaign']` type member and its three now-unused imports are removed (two production files). Tests that called it are ported to the production load paths: a new `createCampaignStore()` (the rehydrate), or `deserializeCampaign` then `switchCampaign` (what the persistence store does). Two reader-only cases (unknown id, corrupt record) are deleted. The legacy-shape save test becomes a direct `deserializeCampaign` assertion.

The writers of `campaign-<id>` are untouched, and so are existing `campaign-*` records in users' storage (no cleanup). A permanent fault-injection test, `campaignDayCrashWindows.test.ts`, pins the live reload path: a crash after every write of a day leaves the contract and the wallet consistent.

## Impact

Affected capability: campaign-persistence. No persisted field, wire shape or schema changes. `deserializeCampaign` is now called in production only with empty child maps, so the live-map branch of `mergeSerializedMissionMap` is no longer reachable from production; it is left in place for a separate decision. Whether the `campaign-<id>` writes are still needed is a separate K4 proposal.
