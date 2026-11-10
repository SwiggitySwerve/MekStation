# GM intervention rules

The interventions package owns cascade preview creation, freshness, approval
preparation and canonical ledger recording. Domain implementers own their pure
projection and application rules; callers apply prepared results before recording
successful approvals.

- Every cascade preview captures transient source-state freshness in the pipeline.
  Campaign previews compare campaign ID, `updatedAt` and normalized `currentDate`.
  Other states use the existing `hashState` utility. Changing a state fingerprint
  or a campaign version requires regenerating the preview.
- Preparation rejects missing or stale freshness before calling a domain
  implementer. Legacy time-correction base checks remain enforced. UI action
  tokens separately prevent duplicate or obsolete control actions.
- Freshness belongs only to previews. Approved records, persisted campaign
  effects, serialized saves and co-op host intents never carry it.
- Canonical intervention statuses are `approved` and `manual`. Preview and
  cancellation append nothing; refusal, failure and blocked preparation append
  nothing. Invalid external record statuses remain rejected at the append boundary.
- Co-op freshness compares the caller's state before dispatch. Host-side journal
  version comparison requires a separate transport contract. The existing local
  application path for co-op time corrections is outside this rule change.
- The tactical live-session support decision belongs to
  `GmTacticalCommandPreviewAdapter.getGmTacticalCorrectionBlockReason`. Position,
  damage, heat/ammo, initiative, lifecycle and objective corrections are
  temporarily blocked: their eventless edits disappear on the next game action.
  The command registry and tactical preview/approval surface consume this same
  decision. Stale ready previews are rechecked and unknown preview IDs refuse
  before preparation, engine calls, session updates or ledger writes.
- Advance Phase remains event-backed through `InteractiveSession.advancePhase`.
  Attack correction, unit reload and resource grants retain their existing
  unsupported/deferred boundaries. Pure domain projection previews remain
  available to their owning modules; they do not authorize live state edits.
- Re-enable the six controls only after [D-8 R10 correction events](../../../openspec/changes/disable-gm-non-event-corrections/proposal.md#d-8-r10-follow-up)
  preserve approved effects through subsequent actions and replay, with the
  schema and privacy contracts approved separately.

These invariants are exercised by the intervention, campaign control-plane,
campaign page, tactical surface and GM ledger E2E suites. No database migration,
replay schema change or rewrite of stored history is required: repository writers
already reject the removed record statuses and do not persist preview objects.

Specification: `openspec/specs/gm-cascade-preview/spec.md`, with the active delta in
`openspec/changes/fix-gm-cascade-preview-freshness/`.
