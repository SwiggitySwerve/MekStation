# Gameplay event append rules

`gameSessionEvents.ts` owns append admission. `gameSession.ts` and
`gameSessionCore.ts` expose the same boundary; InteractiveSession delegates to it.

- An existing id with the same canonical JSON content returns the original
  session. No log entry, state fold, update timestamp or persistence suffix is
  produced. Object key order and omitted optional `undefined` fields do not
  distinguish JSON events; array order and all serialized envelope/payload values do.
- An existing id with different serialized content throws
  `GameEventIdCollisionError`, including changes to sequence or timestamp.
- A new id must have a safe-integer sequence strictly above the held tail;
  otherwise `GameEventSequenceError` is thrown before derivation. Increasing
  gaps remain allowed because transport and redacted logs can omit entries.
- Admission does not repair preexisting corrupt histories. Full reconnect
  baselines replace the session through persistence, hydration and adoption.

An identical retry is safe to ignore. Silently dropping a conflicting identity
or an out-of-order new event would hide divergent history; appending it would
allow delta reducers and log consumers to observe it twice. Errors preserve the
caller-owned session for explicit recovery. Reducers remain pure folds and do
not each duplicate transport admission rules.

P2P reconnect tails use `assertGameEventBatchAdmissible` before applying any
received event. It runs this same pure append boundary against a scratch value,
so a refused tail leaves the entire live session and its durable suffix unchanged.
The reconnect flow catches the rejection and uses the existing error toast to
name the error and state that the current session was kept. Startup and
host-pending hydration failures use that same visible surface.

Hosted client mirrors and stored-log recovery hydrate/fold event histories
directly; they do not submit received events to `appendEvent`. Recovery
constructors append only their own throwaway factory events before adopting the
hydrated session. Server recovery logs refusals through `utils/logger` and skips
the failed match while continuing the sweep; existing corruption quarantine
prevents a refused match from being recreated as a fresh one.

## Recording serialization

`gameEvents/serialization.ts` owns the stored-image guard: what is written
must be readable. It forms the same JSON image as the reader, applies the
reader format's existing transport-stamp split, and runs the strict event
schema and resolved-input check. The schema decides validity; there is no
numeric allowlist. PR-18 automatic shutdown images (`targetNumber: null`)
are valid; the old PSR null target is invalid.

An unreadable image throws `UnreadableStoredEventError` in `NODE_ENV=test`.
For the single-player journal in production/development its recording copy gains
`replayIntegrity: {status: 'unverifiable', reason: 'unreadable-stored-event',
formatId: ...}`. The library and object-backed recovery block marked histories.
The guard preserves the engine input. Valid finite event objects and their
JSON key order stay unchanged. Supported non-finite values use their accepted
JSON image so generic journal canonicalization can store that same image.

The same function runs at session/IndexedDB journal writes, host initial
history, host command commit/publication, journal-authority decisions, and
resumed/delayed-reveal publication. The host validates its match-broadcast
image with the existing host-stamp extraction. Replay-library writers validate
the canonical NDJSON format; IndexedDB writes use match-log-idb. Invalid
publication batches are refused before any append or publication in every
environment. The existing sender-only INTERNAL_ERROR refusal logs the diagnostic;
it does not close the match. Initial-history rejection throws directly.

The legacy host stages commands with InteractiveSession.withValidatedCommand:
the complete stamped batch must validate before retaining session or terrain
changes, persisting browser events, or touching outcome publication. Refusal
keeps the publication cursor and accepted-intent tracker unchanged. Journal
authority already decides on a scratch session and refuses before append.

A resolved PSR stores either a finite `targetNumber` or
`automaticFailure: true` without a target and with `passed: false`. Destroyed
gyros and impossible stand-up attempts use the latter. No legacy adapter is
installed in the current writer change. The existing PR-18 read-side imaging
and its acceptance behavior remain unchanged.
