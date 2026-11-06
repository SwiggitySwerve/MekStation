# CI report noise replay ? 2026-11-06

This is an offline policy replay against frozen GitHub data, not a hosted performance benchmark or a reconstruction of live historical label state. Both evaluators receive the same source run/head/attempt, job census, source-specific workflow DAG, earlier main candidates, actual file telemetry and pinned current job budgets. No historical comment or label was rewritten; no hosted rerun or wait was requested.

Collection started 2026-11-06T08:59:03.478Z; last fixed slice ended 2026-11-06T09:17:26.326Z. Main was pinned to `dc5b2af008d885ece4022dbaf76fa3ea6a584886`. The initial code snapshot is `18a92e78e25c0d5d36185261871798d841ef3f6f`.

The bounded, read-only collection used 221 unique GET routes and zero repeated GETs. It retained forty main candidates and the literal latest ten PR runs, including in-flight data. A cached supplemental listing selected ten terminal PR runs whose creation and update timestamps preceded the initial cutoff; earlier selection snapshots are preserved. Raw responses, failed/cancelled attempts, immutable workflow blobs, artifact ZIPs and validation diagnostics remain in the manifest. One producer artifact was excluded because fresh Guard normalization did not match its producer identity; it was not reread or accepted.

## Label eligibility replay

`unavailable` means missing evidence prevents a safe complete label decision. It does not mean a label was absent. Aggregate and job breaches may still produce a known positive signal with missing informational file data. The publisher also checks fresh head/attempt attribution before any real mutation; that mutation path is not executed by this replay.

| Completed PR run                                                                                | Exact source head                          | Attempt | Conclusion | Before      | After       | Source jobs | Measured files |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------ | ------: | ---------- | ----------- | ----------- | ----------: | -------------: |
| [42189876207](https://github.com/SwiggitySwerve/MekStation/actions/runs/42189876207/attempts/1) | `eb393f345ba292c38314343335eb2bf4b19cad5b` |       1 | success    | unavailable | true        |          10 |    unavailable |
| [42189847465](https://github.com/SwiggitySwerve/MekStation/actions/runs/42189847465/attempts/1) | `31f2865c3b748385812985084a64c5790b875e61` |       1 | success    | unavailable | unavailable |          10 |            195 |
| [42189417929](https://github.com/SwiggitySwerve/MekStation/actions/runs/42189417929/attempts/1) | `57647a299fb9008d3c7c9eeeeeff86f397c53e7b` |       1 | cancelled  | true        | false       |          10 |            415 |
| [42189172981](https://github.com/SwiggitySwerve/MekStation/actions/runs/42189172981/attempts/1) | `9c2dc497a50727654d707bf67d3bfb0fe6a3ac79` |       1 | cancelled  | unavailable | false       |          10 |    unavailable |
| [42188813658](https://github.com/SwiggitySwerve/MekStation/actions/runs/42188813658/attempts/1) | `13db075c312e96630bb63b0ef4fffc0bc75314f2` |       1 | success    | true        | true        |          10 |           1431 |
| [42188623953](https://github.com/SwiggitySwerve/MekStation/actions/runs/42188623953/attempts/1) | `b970b084b17a4fe31ddf191a225455f5ba31beb3` |       1 | success    | true        | true        |          10 |            411 |
| [42188452927](https://github.com/SwiggitySwerve/MekStation/actions/runs/42188452927/attempts/1) | `022e3b26465f6544a0547ef4dbdde52d1a0bfe2e` |       1 | success    | true        | false       |          10 |            654 |
| [42188366833](https://github.com/SwiggitySwerve/MekStation/actions/runs/42188366833/attempts/1) | `29c55ab1a6cd417ae7f02fac80906b1e0efa10e4` |       1 | success    | true        | true        |          10 |            338 |
| [42188365873](https://github.com/SwiggitySwerve/MekStation/actions/runs/42188365873/attempts/1) | `eb393f345ba292c38314343335eb2bf4b19cad5b` |       1 | success    | true        | true        |          10 |            242 |
| [42188197667](https://github.com/SwiggitySwerve/MekStation/actions/runs/42188197667/attempts/1) | `92792039a8b206bfdb90d3b7c282a8c50ccc188b` |       1 | success    | unavailable | true        |          10 |    unavailable |

The literal latest-ten census and complete per-run before/after evaluations, included/excluded baselines, raw job identities and missing-data reasons are retained in `replay.json` and `REPLAY.md`. Positive labels remaining after the change come from configured per-job breaches or aggregate timing more than 20% above comparable main p75; test-file changes are informational only.

For run 42188366833, the replay retains the 634s Simulation/Linux Pack observation within its 840s job budget. Its 666s critical path exceeds the replay cohort's 536s p75 by more than 20%, so the review label remains justified by the requested aggregate rule. The earlier deployed comment used a different captured cohort; this replay does not substitute its median for that historical comment.

## Candidate aggregate display caps, evidence only

The production reporter uses ten main candidates. From the latest ten in the frozen main snapshot, five complete comparable successful main observations qualify; cancelled/running candidates stay excluded. R7 uses rank `(n-1)*p` and linear interpolation. The full forty-run capture supports historical per-PR windows, not a silent expansion of the current cap window.

| Source main run | Exact head                                 | Attempt |        Job-minutes | Execution critical path ms |
| --------------- | ------------------------------------------ | ------: | -----------------: | -------------------------: |
| 42183955227     | `0b8ea746c6f6494233f7cb94516d851948ee6e0c` |       1 |              49.35 |                     625000 |
| 42181448077     | `d9beb1df1a5bb3f018fea9259f9f47c8e2bd01cf` |       1 | 46.233333333333334 |                     536000 |
| 42174245994     | `fa570f804abafaace2ade2a7ce30daacd9343a00` |       1 |  45.56666666666667 |                     502000 |
| 42172955898     | `392607068c04441b455bd6f32f52330c13473c3b` |       1 |  41.71666666666667 |                     529000 |
| 42171496788     | `6d30a8af854751bc9bad6961e31f3ba117ffa3ce` |       1 |  44.28333333333333 |                     478000 |

Measured p75: job-minutes `46.233333333333334`, critical path `536000` ms. Exact p75 ? 1.15 candidate caps: `jobMinutes:53.16833333333333`, `criticalPathMs:616400`. No approximation or rounding substitute was used.

**PR-A leaves `config/ci/budgets.json` unchanged.** The deployed old validator rejects a populated reporting fixture with `budget: missing or unknown fields`; the compatible optional schema accepts it. PR-B is authorized only after Root routes PR-A merge and a main push running the new Guard. First finite reporting constraints are scoped bootstrap additions; later increases/removals retain owner-label and exact-head approval. Automatic timing ratchets remain disabled.

## Noise and garden policy

- Per-file growth requires strictly more than 20% over main p75, an increase of at least 3 seconds, and at least five valid main samples. Other valid comparisons say `within noise`; absent or invalid evidence remains unavailable. Per-file signals cannot label.
- Labels use actual per-job budget breaches or aggregate timings strictly more than 20% over main p75. Crossing a configured aggregate display cap alone cannot label. Missing informational files cannot hold an obsolete label when all label-defining timings are known.
- The unexpanded skipped matrix row is omitted from presentation while raw census and dependency accounting remain intact.
- Garden collection remains main-push-only. Upward main job trends are investigations, with explicit within-budget status and no causal regression claim. A synthetic 634s / 403s / 840s fixture proves presentation only; it does not ingest a PR outlier into garden evidence.

## Reproducibility and limits

Local proof covers shared quantiles and median compatibility, all threshold/sample boundaries, informational labels, missing evidence, optional/fractional schema, bootstrap/raise/removal/lowering, disabled timing ratchets, unchanged hard projections and garden main-trend presentation. Platform-dependent skips remain recorded. No speed/stability gain or seven-day ratchet eligibility is claimed.

Frozen dataset SHA-256: `61a61894a54041131984cdf9aa57eb386617d7881bc09929b0fc0f44468577b4`.
Measured-cap evidence SHA-256: `604c37295a81c280325f1b6f1fe9672f5972bad9d3e81fc4ecd925132665472c`.

Raw evidence is retained at `E:/Projects/Personal/MekStation-wt/_reports/2026-10-30/claude-coordinator/normal-work/CI-report-noise/`: collection manifests, all three frozen selection snapshots, `before/` code, `raw/`, `replay.json`, `replay-runs/`, `schema-before-config.json`, red/green test logs and exact-head receipts.
