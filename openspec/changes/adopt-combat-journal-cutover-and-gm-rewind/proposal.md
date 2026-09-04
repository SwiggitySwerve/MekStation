# Adopt the combat journal cutover and ship GM combat rewind

## Why

`harden-gm-two-player-campaign-sessions` promised GM-only combat rewind: finalized correction commits, replacement-branch activation, stale-branch rejection, and fog rebuild. The code for the preview and commit routes, the commit module, the branch admission consult, and the live-host rebuild exists, but on a live match none of it can run: the combat match stream is never written to the event journal in production (`COMBAT_JOURNAL_AUTHORITY_MODE` is a hardcoded `'off'`, and the `'enabled'` path writes `mp_journal_authority_started` rather than `event_journal_events` / `event_journal_stream_heads`; the only writer of `event_history_effective_heads` is a one-shot migration backfill with no production caller). Both rewind routes answer `404 no-authoritative-history`, both `STALE_BRANCH` arms are structurally dead, and there is nothing for activation to activate (umbrella audit finding #48).

The 2026-09-03 inventory-and-sync council found that archiving the umbrella with those SHALLs in its delta would merge requirements the shipped code violates into the canonical spec. The owner ruled on 2026-09-04: combat rewind moves to this successor, verbatim, and the umbrella re-gates boxes 14.1, 14.2, 14.4 and 14.5 behind the named blocker `journal-cutover`.

## What Changes

- Fund the production match-stream journal writer as the six cutover seams the council sized: S1 mirror each committed batch into the journal and install genesis and head; S2 route reads of the effective head through the journal; S3 retire the `mp_journal_authority_started` marker path; S4 recovery and restart from the journal head; S5 expected revision from the journal head with the sequence-versus-revision offset resolved and the four suites that pin it re-pinned; S6 the flag becomes a reviewed cutover with shadow parity and rollback, in the shape the campaign cutover already shipped.
- Ship the moved requirements: distinct preview and commit phases with deterministic replacement data and authorized player projections; replacement-branch creation from a trusted checkpoint; activation only after deterministic replay and viewer-projection verification; `STALE_BRANCH` rejection of superseded-branch commands; fog, sealed choices, private GM records and owned-unit visibility rebuilt per viewer.
- Close umbrella boxes 14.1, 14.2, 14.4 and 14.5 by receipt here, and un-gate rows E2E-40, E2E-41, E2E-42, E2E-43, E2E-44 and E2E-76 (strict expected failures tagged `@until-journal-cutover` in the umbrella's `rewind-pack` group).
- Deliver first the 80-scenario reconcile the umbrella's box 25.4 names, so the successor starts from an honest count of the reachable acceptance surface (34 of 80 at the time of the split).

## Non-goals

- Changing combat reducers, command legality, RNG rules, or initiative.
- Campaign-time rewind and the coordinated post-receipt correction saga (umbrella 16.x and 17.x; they stay there).
- Player-committed rewind (remains refused; the umbrella keeps that clause).

## Relationship to archived and active changes

- `2026-08-29-adopt-combat-event-journal-authority` (archived complete at 24/24) built the batch-append, revision and recovery contract for one match stream behind a flag. This change is its production cutover: it turns the flag into a reviewed default and adds the writer paths that archived change left unwired. Nothing from that archive is re-litigated.
- `harden-gm-two-player-campaign-sessions` keeps the GM-only / player-request clauses, the `PROJECTION_REBUILDING` refusal (its box 14.3 is closed), and the coordinated-correction boundary. Its delta spec carries a split notice naming this change.
- `add-authoritative-history-branches` owns the branch/supersession port this change activates through; it is a dependency, not a duplicate.

## Capabilities

- `gm-combat-interventions`: the moved requirements above. The two split requirements are carried as MODIFIED with their full final text so the archive of this change replaces the reduced headers the umbrella installs.

## Impact

- Match store, event journal writer, `ServerMatchHost` admission and rebuild, rewind preview/commit routes, fog rebuild, and the six e2e rows.
- Rollback is additive and history-preserving: revert the cutover flag; never erase journal, branch, receipt or audit rows.
