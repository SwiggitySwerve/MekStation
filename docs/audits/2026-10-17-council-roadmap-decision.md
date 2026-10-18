# Council decision: roadmap and cadence, 2026-10-17

Members: A (Astra high, TS7 path), B (Fable high, product layers), C (Opus high, cadence). All three were read-only and ran no heavy commands.
Reports (sha256): A `3e2389682a9d1d43fc966159af315cb8dc14d7857c132387800fe7f5ee54d7d0`, B `a5796dcff6c7950cb7ecb9fd37cd12b6a1c5acd613635ad2401baf584a7a8152`, C `8e5a8744c1f1df7d4132fab441bc70d7cf325bd3d1bf72db830e2118e1dd9ebd`.

## Agreed

1. **TS7 first, all seven remaining units kept separate.** Combining S4A+S4B or S5B+S5C breaks caps or predecessor rules (A). Closure stays a separate PR, because its records bind the merge SHA (A, C).
2. **Duplicate proof removed.** Local `test:stable` repeats CI's shards; the closure's local roadmap-suite replays don't test what the unit changed (A, C). Exact-Main proof stays focused on the changed behaviour. S5B keeps the single integrated sweep on the final implementation merge (A).
3. **Owner ruling only where the tooling requires it**, i.e. sensitive review classes. All TS7 units are routine (C).
4. **OD-scripts-tsconfig: option (a)**, including correcting the BV spec's compiler command (A). The owner rules.
5. **After TS7, publish an installable release before resuming P3** (B). The release path has had no successful build since v1.4.225. Tags need `workflow_dispatch`, because merge commits never carry bump markers.
6. **P3 delivered in two layers:** L1 is the minimum chain to a first shared mission (needs a docs-only ledger amendment checked against `units.json`); L2 is the rest of P3 (B).

## Disagreements resolved

- A preferred one local stable run per source unit; C preferred CI-only. **Decision:** CI exact-head shards count as the stable run for routine units; any unit that changes test infrastructure (S4B) also runs the affected suite locally once.
- C ranked letting closure records ride in the next PR as low value and needing owner approval. **Not adopted.**

## Expected effect

Routine units go from about 115 to 45-55 minutes, and the rest of TS7 from 13-15 h to roughly 5-9 h.
