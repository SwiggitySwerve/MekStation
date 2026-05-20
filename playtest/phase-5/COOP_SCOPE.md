# Phase 5 — Co-op Campaign Scope Note

**Date**: 2026-05-20
**Plan**: `~/.claude/plans/snappy-sprouting-giraffe.md` Phase 5
**Decision**: Phase 5 is **manual-UAT only** in this playtest cycle. No scripted Playwright spec is authored.

## Why no scripted spec

The Phase-5 plan calls for an `e2e/playtest-coop-smoke.spec.ts` covering:

1. Host creates a co-op campaign; guest accepts the invite
2. Guest proposes a contract; host approves → state mutates on both clients
3. Guest proposes another contract; host rejects → no mutation
4. Co-op mission launch; alternating turns; salvage / XP / damage propagation

Verifying any of those steps end-to-end requires:

- Two browser contexts with **vault-authenticated identities** on each
- A working `useCoopSession` hook wired into a routable campaign page
- The host-as-GM proposal queue surfaced via a top-level route

### Gap #1 — No `/coop-campaigns/*` route exists

Grep across `src/pages/` returns zero matches for `coop` or `co.?op`. The
co-op components live at:

- `src/components/campaign/coop/CoopParticipationPicker.tsx`
- `src/components/campaign/coop/GuestProposalSurface.tsx`
- `src/components/campaign/coop/HostGmReviewSurface.tsx`

Each ships with a Storybook story (validated by the `Build Storybook` CI
gate on every PR). They render in isolation, but are not yet wired into
the campaign page tree — there is no URL a guest can navigate to in
order to participate.

### Gap #2 — Vault auth is the entire bottleneck

Same constraint as Phase 4: the scripted spec cannot authenticate two
distinct identities without compromising the vault auth boundary. The
manual UAT operator drives the two windows.

### Gap #3 — Host-review proposal timeout (already known)

`post-roadmap-followups` already lists "Host-review proposal timeout —
unanswered guest proposals stay `pending` forever; no auto-veto" as a
deferred follow-up. Phase 5's manual UAT will exercise the path; the
existing follow-up entry covers it.

## What Phase 5 still covers

- **Manual UAT**: `playtest/checklists/coop-uat.md` is the authoritative
  Phase-5 walkthrough. The host operator runs through proposal approve /
  reject / timeout / mission-launch.

- **CI gate**: `Build Storybook` already validates that the 3 co-op
  components render in isolation. That covers ~30% of the scripted
  scope — the other 70% is the cross-window behavior that only manual
  UAT can hit today.

- **Existing unit tests** at
  `src/components/campaign/coop/__tests__/*.test.tsx` cover the proposal
  flow and host-review queue logic. These run on every PR via Jest.

## Action for `playtest/CLOSEOUT.md`

Add the following entries to the "Gaps" section:

- **Co-op campaign route surface** — `useCoopSession` hook + co-op
  components exist; no `/coop-campaigns/*` page route mounts them. Wire
  candidate: extend `src/pages/gameplay/campaigns/[id]/index.tsx` to
  render `HostGmReviewSurface` / `GuestProposalSurface` when the active
  campaign is a co-op session.
- **Co-op scripted E2E** — blocked on the route surface above + the
  vault-auth bypass needed for two-identity scripted flows. Track as a
  Wave-6 candidate.

## Phase 5 decision

**Phase 5 closes immediately** with this scope note, no defects filed.
The plan's stated next step is Phase 6 (closeout) — proceeding directly.
