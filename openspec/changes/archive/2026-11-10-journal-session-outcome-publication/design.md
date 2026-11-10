## Context

GameEnded records completion, not notification. Multiplayer journal authority already owns its durable outbox. Browser single-player recovery needs a separate receipt without adding gameplay events or changing deterministic replay.

## Decisions

- The engine owns publication transitions. Pending, dispatching and acknowledged are explicit local journal states; dispatching prevents reentrant delivery and is never persisted.
- IndexedDB version 3 adds outcomePublications keyed by matchId and terminalEventId. The engine explicitly supplies pending publication intent for a new completion; its GameEnded and pending record share one transaction. P2P mirrors and replay imports append without publication intent. Storage validates the intent's binding to the event. Acknowledgement is monotonic and a duplicate append cannot reset it.
- Migration creates the store without inventing pending records for old events. Re-appending an already stored terminal event also preserves an absent historical receipt. A completed recovered log with no record is conservatively acknowledged. This policy intentionally favors avoiding historical duplicate campaign application over retrying an unknown historical delivery.
- Production cold recovery retries completed pending entries through the engine wrapper, forwarding the same storage backend for receipt reads and acknowledgement. Direct adoption remains passive until resume or outcome access. A successful synchronous bus consumption records local acknowledgement immediately and queues durable acknowledgement after the terminal write settles. No-listener and all-listener-failure attempts stay pending.
- Keep the existing bus consumption contract: at least one nonthrowing subscriber counts as consumed. The receipt does not prove every subscriber or asynchronous campaign consequence succeeded.
- Outcome notification is at least once across a crash between delivery and acknowledgement. Campaign queue containment and processedBattleIds deduplicate normal campaign consumers; co-op inbox receipts deduplicate accepted consequence batches.
- Purging a completed local match also removes its sidecar records. Extract existing retention orchestration into the match-log helper module before extending its transaction to keep the storage facade below its lint ceiling.

## Validation

Test pre-migration completed recovery without publication, pending recovery and acknowledgement round trips, no-consumer retry, reentrancy, transaction rollback, duplicate append monotonicity and retention. Preserve deterministic output before and after; stop on any required committed fixture or digest change.
