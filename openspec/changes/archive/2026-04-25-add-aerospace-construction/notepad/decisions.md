# Decisions log — add-aerospace-construction (BACKFILL)

> **Backfilled by `tier5-audit-cleanup` (Tier 1-4 audit follow-up).** Original close-out lacked a decisions log — unique among Tier 2 changes. This file documents the PR #388 retroactive spec additions for audit-trail integrity.
>
> **Caveat:** This is a one-off audit artifact. The broader rule "archives are immutable" still stands; future changes should author `notepad/decisions.md` synchronously during execution, not as a backfill.

---

## Retroactive spec additions (PR #388 verifier feedback)

During verification of `add-aerospace-construction` (PR #388, merged `d47e67e5`), the OpenSpec verifier flagged two SHALL gaps that the proposal/tasks layer had not surfaced explicitly. Rather than punt them to a follow-up change, the PR author added them inline as part of the close-out commit.

The two SHALL blocks are now archived alongside the rest of the spec at:

`openspec/changes/archive/2026-04-25-add-aerospace-construction/specs/aerospace-unit-system/spec.md`

### 1. `VAL-AERO-WING-HEAVY` — Wing-Mounted Heavy Weapon Cap

- **Spec block:** lines 130–144 (Requirement + 2 scenarios)
- **Trigger:** Verifier feedback noted that `VAL-AERO-ARC-MAX` enforces *count* limits per arc but no rule capped the *tonnage* of heavy weapons (PPC family, Gauss family, AC/20) per wing arc. TechManual (and MegaMek's analogous validator) caps total heavy-weapon tonnage per wing at `floor(unitTonnage / 10)` for ASF/CF, with Small Craft exempt.
- **Fix:** Added the SHALL block enforcing the cap, plus two scenarios (one positive case on a 65t ASF, one Small-Craft exemption case).
- **Registered at:** `openspec/changes/archive/2026-04-25-add-aerospace-construction/specs/aerospace-unit-system/spec.md:169` (the `VAL-AERO-*` registry list).

### 2. `VAL-AERO-BOMB-BAY` — Small Craft Bomb Bay Configuration

- **Spec block:** lines 146–160 (Requirement + 2 scenarios)
- **Trigger:** Verifier feedback flagged that the proposal mentioned configurable bomb bays for Small Craft but never specified the cost formula (`1 + capacityBombs` tons), the per-unit cap (`floor(unitTonnage / 2)`), or the ASF/CF exclusion rule.
- **Fix:** Added the SHALL block formalizing all three constraints, plus two scenarios (a Small Craft over-cap case, and an ASF-attempting-bay rejection).
- **Registered at:** `openspec/changes/archive/2026-04-25-add-aerospace-construction/specs/aerospace-unit-system/spec.md:169`.

---

## Audit-trail closure intent

Both rules were behaviorally implied by the proposal's "aerospace construction parity with TechManual" goal, but the **explicit SHALL contracts** were missing from the originally-authored spec. The PR #388 author treated this as in-scope cleanup rather than carving off a separate change, on the rationale that:

1. The rules were canonical TM constraints — not invention.
2. The verifier was the discovery surface; deferring would have left two known gaps in `archived` state.
3. Both rules were small (1 SHALL + 2 scenarios each); the close-out diff stayed reviewable.

This decisions log exists to make the late-add visible to anyone reading the archive cold, since `tasks.md` shows them inline without flagging them as a verifier-driven add.

## Process takeaway

When verifier feedback triggers a spec addition mid-close-out, author a `notepad/decisions.md` entry **synchronously** as part of the same commit, not as a backfill. Future Tier 5+ audits will have an easier time if every retroactive addition is self-documenting.

---

## References

- **PR #388:** `fix(openspec): close aerospace-construction spec/test gaps (verifier feedback)` — merged `d47e67e5`
- **Audit plan:** `~/.claude/plans/look-at-tiers-1-eventual-seahorse.md` (Tier 2, line item flagging "no notepad entry exists for `add-aerospace-construction`")
- **Backfill change:** `openspec/changes/tier5-audit-cleanup/` (Phase B 2.1)
