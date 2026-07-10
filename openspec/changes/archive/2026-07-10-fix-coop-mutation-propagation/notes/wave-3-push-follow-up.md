# Wave 3 Push Follow-up

Wave 3 wires host day advance through the existing `CampaignMatchHost.applyHostIntent({ kind: 'AdvanceDay' })` path after the full local campaign mutation has persisted successfully. This commits a `CampaignDayAdvanced` event to the co-op event log and pushes it to connected guests through the existing `CampaignSyncSession` transport.

Other host-side mutations, including GM ledger corrections, now receive the Wave 2 persistence floor because the shared co-op `updateCampaign` save path awaits server persistence and retry-on-409 before resolving. They do not yet emit generic live-push events. The current co-op event log is a compact ledger projection with explicit event types, so mapping arbitrary `ICampaign` aggregate updates into live events should be a separate follow-up with per-mutation intent/event mappings rather than a broad snapshot-like push.
