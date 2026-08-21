# Council Decision — Campaign-journal reconciliation and the next-work order

> OMO Council, 2026-08-20 (Lean++ thin: Phase-0 Metis + Oracle/Explore-Deep/Momus, Phase 3 cross-attack
> RAN — one round, Oracle answering Momus's kill and Explore-Deep's contradiction; Phase 4.5 verified by
> omo-judge, 2-pass, combined REVISE applied to this text). Brief: "how should we organize the work
> that's coming next and do the remainder of what we need to?"

**Headline:** The supersede/sequence/merge call everyone framed as two options is really a
merge-then-supersede with a flipped cursor design — and the "unblocked" vault track isn't unblocked.

**Brief (collapsed by Phase 0):** one decision gates 5 of the 13 active changes — the disposition of
`design-campaign-authority-and-sync` (user-directed 2026-08-07; 4 journal-free Group-1 slices landed
2026-08-20 via PRs #1253/#1254) versus `adopt-campaign-event-journal-authority` (the campaign-journal
slice of the `harden-gm-two-player-campaign-sessions` umbrella). Around it, order the rest.

## Decision — MERGE-THEN-SUPERSEDE

`design-campaign-authority-and-sync` becomes the single surviving home for campaign journal work,
absorbing two umbrella-side elements **intact** (per Oracle's own Phase-3 concession, which upgraded
his Phase-2 "pure supersede"):

1. **The D2 migration machinery** — `adopt-campaign-event-journal-authority/design.md` D2's
   `CampaignAuthorityMigrationState` enum (`legacy | shadowing | journal | blocked`) with shadow-vs-journal
   digest comparison before cutover. It solves legacy-cutover safety, which the design's D8 one-shot
   adoption genesis does not (Explore-Deep: "DIVERGENT mechanics, same intent").
2. **The centralized cursor doctrine** — design D4 is REWRITTEN to *consume* the privacy-owned
   `(deliveryEpochId, deliverySequence)` mapping (`add-authority-audit-and-privacy-proof/design.md:48`,
   tasks PR5.1/PR7) instead of minting per-grant sequence+digest chains inside
   campaign-access-projection. The umbrella side explicitly forbids campaign-local allocators
   ("do not mint a campaign-specific epoch, sequence allocator, or raw-journal cursor" — PR5.1);
   the delivery-epoch mapping fails closed on foreign epochs and is strictly stronger. Oracle's Phase-3
   crux, conceded: "who owns the cursor allocator — I concede ownership to privacy."

Everything else the seats verified as the SAME work (stream identity `streamType:'campaign'`/
`streamId:<campaignId>`; expected-revision atomic batch commit; buffer-then-drain catch-up handshake)
needs no reconciliation — one spec surface survives. `adopt-campaign-event-journal-authority` archives
as superseded with an explicit absorption group so its PR2 (migration states), PR3 (journal lineage)
and PR7 (per-campaign cutover) content is carried, not dropped; the harden-gm wave map and
`add-cross-stream-effect-receipts`' predecessor re-point to the reconciled change.

**The dependency payoff:** the reconciled change declares NARROW primitive dependencies — the campaign
baseline schema pack (replay-schema PR3) and the delivery-epoch schema subset of audit-privacy —
instead of adopt-*'s whole-change gates (its task 0.1 required audit-privacy *archived*). The full
chain as written was 41 PR-sized units (replay-schema remainder 24 + audit-privacy 10 + adopt-* 7,
per their tasks.md group headers); the narrow path needs only the specific primitives, prioritized
early inside those changes.

## Execution order

1. **Now — `add-camp01-authority-receipts` task 4.1** (the sole open task of 19; open per the ledger).
   Its F/G reporter blockers are archived, so it is startable. First VERIFY how much the H wave's
   shipped capture machinery (`captureCamp01AttestedPng`, the guarded capture transaction) already
   satisfies before implementing; close honestly either way.
2. **Now — author the reconciliation delta** (spec-only PR): amend design D4 (consume delivery-epoch),
   import D2 migration states, add the absorption group, archive adopt-* as superseded, re-point
   `add-cross-stream-effect-receipts` + the harden-gm wave map, update the active-change ledger.
   The PR itself is the program-owner approval surface.
3. **Now — start `add-subsystem-lanes-and-ci` (W6).** Its only hard gate — the W5
   (`add-viewport-layout-sweep`) implementation merge — is satisfied (W0–W5 all merged, verified
   2026-07-11). Its own Group 1 is read-only ground-truth re-verification, which doubles as the
   collision check Momus's one-kill rule left unexamined.
4. **BLOCKED, owner decision flagged — `design-vault-campaign-separation-and-maps`.** Momus's kill,
   conceded: its own gate reads "starts only after CAMP-01F/G/H **merge** — frozen-contract
   precondition" (`tasks.md:1`, `proposal.md:14`). F/G archived 2026-08-20, but the H change
   (`prove-saved-custom-unit-campaign-journey`, tasks 0/9) is active and unarchived. The H *wave* is
   receipt-sealed under recorded reduced claims (product PR #1245; both camp-01h receipts re-admit
   through the live durable index), so the owner MAY amend the gate to read receipts-sealed-as-
   satisfying — a cheap, recorded amendment — or leave vault blocked. Safe default: blocked. NOTE
   (Captain, overriding Oracle's Phase-3 "archive H first is cheap"): archiving H is bound to the
   parent's 9.1 exact-main receipt gate, i.e. the unreduced product wave — NOT bookkeeping.
5. **After the reconciliation delta merges** — campaign-authority journal Group 1 resumes against the
   narrow dependencies; the umbrella chain prioritizes replay PR1B/2/3 and the audit-privacy
   delivery-epoch subset accordingly.
6. **The unreduced-claim CAMP product wave runs AFTER journal cutover** — re-pointing the frozen
   receipt fact-slot contract twice is the only real double-work on the board (Oracle Phase 2,
   unchallenged).
7. **Residuals fold inline, never filed:** campaign PUT 409 retry-noise → the journal Group-1 persist
   seam; GM-TIME-CASCADE per-day breakdown → whichever surface PR touches it.

## Survival Score — Modified

Phase 3 ran (one cross-attack round). Momus's kill (vault-not-unblocked) was conceded and re-ordered
the plan; Explore-Deep's cursor-ownership contradiction flipped D4's design; Oracle himself moved
pure-supersede → merge-then-supersede in Phase 3. The surviving decision is the modified one.

**Trade-offs accepted:** design-campaign takes ownership of delivery-cursor privacy proofs (leak
tests 3.3/4.3 lose their old predecessor); the harden-gm umbrella loses its campaign leaf and must
re-base; adopt-*'s planning effort survives only as absorbed content.
**Second-order (6-month view):** one journal spec surface instead of two prevents the double-spec
drift that produced today's contradiction; the narrow-dependency pattern is reusable for the combat
journal adoption (`adopt-combat-event-journal-authority`) when its turn comes.
**Open risks / revisit triggers:** if authoring the absorption group reveals the delivery-epoch
schema cannot serve per-grant scope filtering without modification, revisit cursor ownership; if W6
Group-1 re-verification finds drift from the July baselines, W6 rescopes before implementation.
**Dissent on record:** none live after cross-attack. Unexamined by adversaries: W6 file-collision
breadth (mitigated — W6 starts read-only) and judge A's misread of the 41-unit arithmetic (corrected
above by making the breakdown explicit).

**Decision crux:** cursor-allocator ownership — resolved to the privacy-owned delivery-epoch mapping.
**Missing information:** whether the H-change archive can honestly complete under reduced claims
without the parent 9.1 product wave — owner's call, tracked in step 4.

*Synthesis verified by omo-judge (2-pass, combined REVISE applied).*
