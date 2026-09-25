# Lane A review addendum: U35g
reviewedHead: 402102dc8be014c5590f304a7969d8661cb37ce0
baseline: 0fd24c343d8de2d467bb5b2d3d57c3beeb2d89af
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Original review

File: `E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/u35g-lane-a-review-20260925.md`
sha256: `8581fb6508215c33654728ca3547d4f416f073135cdf51c95eb0b74cf2ad0c6a` (computed with `sha256sum` on the file
as it stands; unchanged since I wrote it).

## The owner's decision

Independently re-fetched from GitHub (`gh api repos/:owner/:repo/issues/comments/5828801317`) rather than
taken only on the coordinator's word — the comment is `OWNER-RULING 402102dc8be014c5590f304a7969d8661cb37ce0`,
posted 2026-09-25T07:43:33Z, and reads in the relevant part:

> **Lane A: APPROVE-WITH-REQUIRED-EDITS.**
> - All 11 gates are green.
> - Red reproduced: 7 of the 8 rows fail on the baseline's product files.
> - A duplicate outcome rewrites nothing.
> - A throw in the rewrite rolls the whole outcome back.
>
> **The required edit is deferred by the owner's choice ("Follow-on unit (Recommended)").** When a unit
> carries `sourceVersion`, the strict campaign baseline schema pack refuses the outcome's roster event. The
> same gap already exists for the genesis and snapshot events production writes today. The pack is not wired
> to any production replay. A follow-on unit fixes the pack's roster-unit shape for every producer before the
> pack is wired.
>
> [...]
>
> Owner's answer: "Approve (Recommended)"

So the owner chose, among the three options the parent put to them (merge U35g at `402102dc8` and plan U35j to
fix the pack's roster-unit shape for every producer before it is wired; fold the fix into U35g now; or strip
`sourceVersion` from the outcome payload): **"Follow-on unit (Recommended)"** for my Finding 1, then ruled the
head itself **"Approve (Recommended)"**.

## Merge fidelity — confirmed by `git diff`, not assumed

Fetched `origin`, then ran (read-only, no checkout change, from the root `E:/Projects/MekStation`, which is no
longer a worktree of anything under review):

```
git diff 402102dc8be014c5590f304a7969d8661cb37ce0 7405959ff61df257aa45355f8b90f21f601c9576 -- src
```

Output: empty. I also ran the same diff scoped to exactly the 10 files (7 product + 3 test) I reviewed —
also empty — and compared each file's git blob hash at both commits directly with `git rev-parse
<commit>:<path>`; all 7 product-file blob hashes are identical between the two commits (e.g.
`CampaignMatchHostOutcomeInbox.ts` is `bbc908ce80b8846f1d46c473f78b54aa36817d66` at both). `7405959ff`'s only
parent is `a2e24c8a8` (not `402102dc8` — this was a squash-style merge, not a fast-forward), and the full
diff between the two commits (all paths, not just `src`) touches only roadmap bookkeeping: the U22 unit's own
evidence receipts, two UAT round-1 evidence files, and `roadmap.json`/`units.json`. **The merge commit
reproduces the reviewed head's `src` content byte-for-byte**; nothing I reviewed changed in flight.

## Correction to my original Setup / Finding 1

The coordinator flagged that my original review's parenthetical — "nothing in `src/lib/campaign` or the
campaign recovery path imports `CAMPAIGN_BASELINE_SCHEMA_PACK`" — is wrong, and asked me to check it myself.
I did, at the reviewed head, read-only:

```
git show 402102dc8be014c5590f304a7969d8661cb37ce0:src/lib/campaign/authority/campaignAuthorityMigration.ts
```

**I agree the correction is right; my original claim was incomplete.** `src/lib/campaign/authority/
campaignAuthorityMigration.ts:32-34` does import `CAMPAIGN_BASELINE_SCHEMA_PACK` (and
`CAMPAIGN_BASELINE_EVENT_TYPES`). I read the one call site (`campaignSchemaPipelineFingerprint`, lines
~108-127): it builds a `ReplaySchemaRegistry({ events: CAMPAIGN_BASELINE_SCHEMA_PACK })` and calls
`.fingerprintPipeline(...)`, which I traced into `ReplaySchemaRegistry.fingerprintPipeline` ->
`fingerprintReplayPipeline` in `src/lib/events/replay/ReplayPipelineFingerprint.ts`: that function hashes
`eventType` / `schemaVersion` / `schemaId` / transition-id strings — registration *identity* — and never calls
any schema's `.parse()` or otherwise inspects a payload's shape. So the correction stands and narrows further
than the coordinator's summary states it: the pack IS imported from inside U35g's own ownership path
(`src/lib/campaign`), but that import only binds a migration marker to a deterministic identity hash of the
pack's registrations; it still never validates or rejects an actual event payload anywhere in production code
on this head. My Finding 1 measured the `.strict()` shape-refusal by calling the schema's `.parse()` directly
against a probe payload — that refusal remains real and reproducible, but nothing on this head's production
path ever calls `.parse()` on a live `RosterUnitChanged` event, including through this fingerprint use. This
is consistent with, and reinforces, the owner's stated basis for deferring rather than blocking ("The pack is
not wired to any production replay").

## Findings 2-4 (unchanged, kept as recorded)

- **Finding 2** [recorded, non-blocking]: a damaged unit's activity-feed entry still reads "repaired"
  (`campaignActivityProjection.ts:167-172`), pre-existing, unchanged by this PR.
- **Finding 3** [recorded, non-blocking, UAT round 2 triage]: the guest's mirror-sync "Units" count now
  includes destroyed units (`CampaignCoopRouteSurfaceConnected.tsx:373-375`, rendered at
  `CampaignCoopRouteSurface.tsx:451-456`) — the correct consequence of the owner's decision to keep destroyed
  units rather than a bug.
- **Finding 4** [info, low confidence]: the rewritten `unit` payload keeps the ledger's own `designation`
  rather than the battle's derived one (`CampaignMatchHostOutcomeInbox.ts:216`); no renaming capability found,
  so risk is judged very low.

None of these three were ever "required edit" findings in the original review, and nothing above changes that.

## Verdict rationale

My Finding 1 was the sole reason the original verdict was APPROVE-WITH-REQUIRED-EDITS. The owner is Lane B —
the higher authority for exactly this review class (authority/idempotency/concurrency/migration) — and ruled,
on a structured question naming my finding, to defer the fix to a follow-on unit (U35j) rather than fold it
into U35g or strip the field here. That is an authoritative disposition of Finding 1, not a deferral I am
inventing myself: it moves the required edit out of U35g's scope by decision, not by omission. Merge fidelity
is independently confirmed (`git diff` on `src` between the reviewed head and the merge commit is empty,
blob-hash-identical file by file), so the code the owner ruled on is exactly the code I reviewed. My own
correction above, if anything, reinforces the owner's "not wired to any production replay" basis rather than
undercutting it. With Finding 1 authoritatively out of scope and Findings 2-4 non-blocking as originally
recorded, no required edit remains within U35g's scope: **Verdict: APPROVE**.
