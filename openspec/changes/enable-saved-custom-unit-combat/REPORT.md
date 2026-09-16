# Saved custom-unit combat implementation report

Exact server-saved biped BattleMech references now flow through campaign admission, combat adaptation and immutable recorded construction. Roster instance IDs remain distinct from saved source references. New launches reject missing, malformed, unsupported or mismatched custom definitions.

GameCreated records a strict detached construction snapshot. Recovery and rewind use that snapshot after library mutation or deletion; a present corrupt snapshot refuses recovery without a live-library fallback. Server launch/recovery paths resolve the authoritative custom library. Fog projections remove nonowner construction from live delivery, reconnect and replay while preserving the server record.

## Parent integration and verification

- Shared construction schema, server reader, combat catalog and campaign picker/admission are integrated.
- Replay validation includes strict recorded construction and identity checks, with a distinct schema identity.
- Private construction is covered by owner, opponent and spectator transport tests.
- A real SQLite match store closes and reopens after both library editing and deletion. Non-stock armor, full weapon data, movement and event identities remain stable; new launches of the deleted design refuse.
- All 21 final browser scenarios pass, including saved-design campaign persistence and reload with server readback.
- All 88 focused assertions pass; the strengthened durable-recovery suite also passes. Full type checking, lint, production build/standalone hydration and strict change validation pass.

The [follow-up audit](../../../docs/audits/2026-09-10-non-3d-followups.md) records the complete stable-suite result and unrelated shared-tree verification limitations. Original worker reports and execution evidence remain in the local `../../../docs/audits/2026-09-16-evidence-distilled/grok-followups-20260909.md` (formerly `.sisyphus/grok-followups-20260909`) directory.

## Boundaries

Only server-persisted biped BattleMechs gain combat eligibility in this change. Local-only and unsupported constructions remain blocked. Canonical compatibility is preserved, and fast-forward combat remains canonical-only. Task checkboxes remain unchanged; archival is deferred until integration. The [PR verification audit](../../../docs/audits/2026-09-10-customizer-pr-verification.md) records the final isolated-branch checks.
