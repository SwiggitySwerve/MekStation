# Tasks: Campaign Authority and Synchronization

Implementation is gated (same gate as design-vault-campaign-separation-and-maps): starts only after CAMP-01F/G/H complete. Groups are dependency-ordered; each lands as one or more capped PRs with review, SHA-guarded merge, and prune.

## 1. Server-Authoritative Source Instances (campaign-authority + campaign-persistence delta)

- [ ] 1.1 Bind campaign creation to the server store: creation writes the source instance record (authority metadata per D2) and the genesis event to the journal (`streamType: 'campaign'`) before acknowledgement; deep links resolve via the server; remove the browser-only creation path.
- [ ] 1.2 Route every campaign mutation through the command → validate → append (fsync) → acknowledge → project pipeline on the source; reproject campaign state from the stream; type and surface command rejections.
- [ ] 1.3 Demote client Zustand persistence to a cache keyed by `(instanceId, revision)` with head validation on load (replace-not-merge on divergence).
- [ ] 1.4 Legacy adoption flow (D8): offer, import, genesis-with-digest, demote browser copy; label unadopted copies legacy/unshareable.
- [ ] 1.5 Fix the campaigns API silent-failure modes surfaced by the 2026-08-06/07 audits (silent 500 on list; not-found vs unowned distinctions per the campaign-authority deep-link scenario).

## 2. Grants and Share Function (campaign-replication)

- [ ] 2.1 Grant model at the source: issue/list/revoke grants `{grantId, campaignId, participantIdentity, scopes, issuedAt, revokedAt?}`; persist in the server store; sign grant tokens with the existing vault-identity machinery.
- [ ] 2.2 Share surface on the campaign dashboard: issue a grant, show active grants and their scopes, revoke; replica-side redeem flow that instantiates the durable replica with full provenance (D2) and surfaces replica identity on every campaign-identity surface.
- [ ] 2.3 Replica durable store: received scoped events into the consuming device's local journal (`campaign-replica` streams, D6); offline read-only load with disconnected status; restart survival.

## 3. Scoped Projection and Broadcast (campaign-access-projection)

- [ ] 3.1 Scope stamping at emission (D3): closed vocabulary in the campaign event envelope inside canonical bytes; enumerate every campaign event constructor and assign its scope; QC sweep asserting no unstamped emission site.
- [ ] 3.2 Per-grant projection at the source (D4): filter by scope set, contiguous per-grant sequencing, per-grant digest chain; GM all-scopes grant receives the raw stream.
- [ ] 3.3 Campaign sync channel on the existing WS path (D5): grant-token auth, cursor-resumable backfill from per-grant sequence, live fan-out after durable append (D7); idempotent replica apply; chain-verification failure → re-request from last verified cursor.
- [ ] 3.4 Scope-filtered snapshots: `CampaignSnapshotPublished` derived by the shared projection function; late-join backfill = snapshot + stream tail; equivalence verification between snapshot hydration and full scoped replay.
- [ ] 3.5 Upgrade the co-op guest path in place (coop-campaign-sync delta): mirror backed by the durable replica; hydration scope-filtered; rejoin resumes from per-grant cursor; existing intent/veto/arbitration flows unchanged on top.
- [ ] 3.6 Scoped-perspective UI: replica surfaces (dashboard, activity log, missions, starmap) render only in-scope events and label the scoped perspective; GM surfaces render the full stream with per-event scope visible for audit.

## 4. Verification

- [ ] 4.1 Journal-level: campaign stream append/chain/recovery reuse tests; adoption genesis digest binding; replica-stream chain verification incl. tamper and reorder cases.
- [ ] 4.2 Authority: replica hard-guard (local mutation rejected + typed), command-at-source-only, durable-before-acknowledge crash test, downstream-failure isolation of the source.
- [ ] 4.3 Projection leak tests: transport-level assertion that a player-scope connection never carries `gm` material in any frame (positive control: GM connection carries it); withheld-count non-inference (contiguous per-grant sequencing across a burst of out-of-scope events); revocation stops delivery at the boundary.
- [ ] 4.4 Late-join and resume: day-40 join backfills scoped day-1 history; reconnect exactly-once by sequence; snapshot-vs-replay equivalence.
- [ ] 4.5 Live two-device drive: source on one server process, replica on a second (own port + own journal file), share → redeem → mutate → verify scoped convergence and offline replica read; extend the e2e journey set.
