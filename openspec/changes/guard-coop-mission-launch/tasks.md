## 1. Refactor

- [ ] 1.1 Separate encounter configuration from launch while preserving errors, ids and side effects; run regression tests.

## 2. Implement and verify

- [ ] 2.1 Record failing concurrency, day-advance, retry, checkpoint, navigation and guest tests before implementing.
- [ ] 2.2 Implement the synchronous mission guard and retained launch progress.
- [ ] 2.3 Checkpoint the host mission once; expose conflict resync without relaunch.
- [ ] 2.4 Preserve guest participation and join routing without guest writes.
- [ ] 2.5 Prove one durable mission encounter id for double click, lost remote response and checkpoint retry.
- [ ] 2.6 Kill both approved mutants and record the killing tests.
- [ ] 2.7 Run all LANE-BRIEF gates, document limits, and open one draft PR without merging.
