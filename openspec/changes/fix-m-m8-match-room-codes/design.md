# Decisions

The match store owns room-code lifecycle and uniqueness. Presentation and routes
consume that rule. Explicit null clears a patch; absent patch preserves a lobby
code. Non-lobby metadata has undefined/absent roomCode; SQL uses NULL.

The match file is separate from SQLiteService's capability file. A named
SQLiteService.matchRoomCodes.migration.ts module exports an idempotent up(db)
operation invoked synchronously by DurableMatchStore after SCHEMA_SQL and before
its constructor returns. It is not registered against the unrelated capability
database. A constructor/reopen test asserts the first boot reads are repaired.

Backfill is one transaction: clear non-lobby codes, normalize lobby codes with
the existing normalizer, retain the earliest created_at/match_id owner, clear
losers, then create the partial UNIQUE index. Only room_code and meta_json's
roomCode change. Return the number of codes cleared for diagnostics and tests;
do not import the environment-reading logger into the migration test graph.

Retry only RoomCodeCollisionError, at most five insert attempts. Keep the match
identity and metadata stable except for the generated code. Database uniqueness
is authoritative across connections; translate only the matching constraint.

A losing legacy lobby stays accessible by its match id without a join code.
Do not mint or reroute invitations during migration. Reapplication preserves
state and returns zero cleared codes. Malformed metadata fails initialization
rather than being silently replaced.
