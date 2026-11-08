## Ownership
EncounterLifecycle.ts owns the transition table, classification and guards. The repository owns atomic persistence; the service exposes session link and completion operations. Browser callers use API transport, never SQLite imports.

## Transitions
Draft <-> Ready; Draft/Ready -> Launched with a session ID; Launched -> Completed for the matching terminal game. Completed is terminal. The only Launched -> Draft exception is force deletion leaving both slots empty, and it clears game_session_id. Same-session retries are idempotent. A separate explicit pre-battle restart intent permits Launched-to-Launched link replacement atomically; ordinary service/store links still refuse reassignment. Completed remains terminal. All completion and replay validation checks the currently linked game, never an abandoned session.

## Completion evidence
A completed log must start with GameCreated, name the requested encounter in config.encounterId, contain only events for the requested game and finish with GameEnded. Both replay persistence branches call the same completion operation. New unlinked legacy games are not silently adopted. Local auto-resolve links its actual session before completion; interactive sessions complete through replay persistence. Rejected link/completion must be surfaced, not treated as success.

## Compatibility
Existing rows are trusted on read and are not rewritten. Unknown statuses and inconsistent linkage are rejected on lifecycle writes. Completed rows remain deletable and uneditable. Existing configuration readiness arithmetic is preserved, avoiding K6 readiness changes. S1b owns fast-forward and multiplayer; do not import persistence into engine or simulation code.
