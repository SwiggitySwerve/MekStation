# Playtest Working Tree

End-to-end playtest of the Waves 1-5 system. Plan lives at `~/.claude/plans/snappy-sprouting-giraffe.md` (transient — the canonical version is the approved plan attached to the playtest baseline PR).

## Layout

| Path                                      | Purpose                                                      |
| ----------------------------------------- | ------------------------------------------------------------ |
| `ISSUES.md`                               | Append-only defect ledger; one row per bug                   |
| `baseline.md`                             | Phase 0 green/red snapshot of `main`                         |
| `CLOSEOUT.md`                             | Phase 6 summary + "logged gaps" (feature-gaps, not defects)  |
| `checklists/{sp,campaign,mp,coop}-uat.md` | Manual walkthroughs per UI surface                           |
| `session-notes/<YYYY-MM-DD-phase-N>.md`   | Per-session free-form notes                                  |
| `swarm-runs/<config>/`                    | JSONL output from `npm run simulate` per smoke-matrix config |

## Phase legend

0. Baseline — pin the starting state
1. Headless smoke sweep — `scripts/swarm-configs/smoke/*.json` × ~10 seeds each (~200 battles)
2. Single-player browser UAT
3. Campaign browser UAT (largest surface — Wave 4 was 5 changes)
4. Multiplayer
5. Co-op campaign
6. Closeout

## Operating principles

- **Smoke-first, then deepen** — full matrix only where bugs cluster
- **Defects only; log gaps** — feature-gaps go to `CLOSEOUT.md`, not `ISSUES.md`
- **PR-by-PR fixes** — never push to `main`; never bypass husky; no AI attribution
- **Reuse infra** — `scripts/run-simulation.ts`, `src/simulation/invariants/checkers.ts`, `src/simulation/detectors/`, the 26 specs under `e2e/`
