# Design

This change inherits the umbrella's design wholesale and adds only what the cutover needs. Decisions D1 (one authoritative journal plus transactional outbox), D3 (stable identity and sequences), D4 (fail-closed viewer projection) and D5 (rewind is append-only branch supersession, with the `ISessionBranch` / `ISupersessionRecord` shapes) in `openspec/changes/harden-gm-two-player-campaign-sessions/design.md` remain the source of truth and are not restated here.

## S1 to S6: the cutover seams

The council sized the production match-stream writer as six seams. Each is one PR; S5 is the only one that is not PR-sized on its own and is split in tasks.

- **S1 mirror and genesis.** Every committed combat batch is appended to `event_journal_events` at the expected stream revision and the stream head installed in `event_journal_stream_heads`; a match's first batch installs its genesis and its `event_history_effective_heads` row. This alone flips both rewind routes from `404 no-authoritative-history` to a real answer, but it discharges no SHALL by itself (a 200 computed off an unread shadow is not a receipt).
- **S2 head reads.** `readEffectiveHead` and the branch admission consult read the journal head, so the `STALE_BRANCH` arms become reachable.
- **S3 marker retirement.** The `mp_journal_authority_started` marker path is removed once S1 is the writer; no second source of "started".
- **S4 recovery.** Restart recovery rebuilds the live host from the journal head and the effective branch, not from the legacy event table alone.
- **S5 revision offset.** The expected revision comes from the journal head. The legacy sequence and the journal revision differ by one (sequence N lives at revision N+1); every site that derives one from the other is made explicit and the four suites that pin the relationship are re-pinned. Hardest seam; carries its own mutant matrix.
- **S6 reviewed cutover.** The flag becomes a reviewed cutover with shadow parity, migration states and a rollback law, in the shape `design-campaign-authority-and-sync` shipped for the campaign journal (marker store, honest baseline import, shadow-parity block). New matches admit through the journal; legacy completed matches keep their reads.

## Fog rebuild per viewer

Rebuild after activation restores, per viewer, fog-of-war, sealed choices, private GM records, owned-unit visibility and public facts as of the selected checkpoint, then applies the replacement events through the same per-viewer projection the live path uses. The umbrella's preview route currently refuses fog (`fog-preview-unsupported`); this change lifts that refusal by computing the per-viewer rebuild rather than waiving the SHALL.

## Activation

One branch-activation fact makes the replacement branch effective only after deterministic replay, state validation, fog and hidden-state checks, and viewer-projection verification pass. A failed check leaves the candidate blocked and the previous branch authoritative. Commands during rebuild keep receiving the umbrella's `PROJECTION_REBUILDING`.

## Alternatives considered

- Funding the cutover inside the umbrella: rejected by the council as a storage-authority migration inside a 107-box change, and by the owner on 2026-09-04.
- Re-gating the rows and archiving the umbrella with the SHALLs in place: rejected because the delta merges wholesale on archive and would install requirements the code violates.
- Waiving the fog SHALL in a receipt: rejected; fog cannot be waived, it must move with the requirement.
