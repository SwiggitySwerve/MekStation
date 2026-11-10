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
