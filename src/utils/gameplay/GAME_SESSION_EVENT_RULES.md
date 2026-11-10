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
