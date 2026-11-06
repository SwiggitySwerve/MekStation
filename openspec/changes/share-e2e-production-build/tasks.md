## 1. Producer and consumers

- [ ] 1.1 Prove archive transport, rejection of missing/corrupt/mismatched inputs,
  release separation, first-build ordering and unchanged two-shard selection.
- [ ] 1.2 Integrate current main; place the producer in the existing simulation
  job and preserve step gates, strict aggregation and deterministic budgets.
- [ ] 1.3 Pass local workflow contracts, typechecks, lint, format and OpenSpec.

## 2. Hosted acceptance

- [ ] 2.1 Archive exact-head hosted full 136-test census and artifact proof.
- [ ] 2.2 Prove a deliberate required failure still fails the aggregator.
- [ ] 2.3 Archive five matched captures per arm, including all failures, unit
  shard times, build/upload/download, dependency/queue delay and runner/cache.
- [ ] 2.4 Apply Root's critical-path/job-minute rule; keep draft or close if the
  experiment has no acceptable gain. Root alone merges green work.
