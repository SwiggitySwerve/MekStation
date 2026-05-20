# Smoke matrix configs — Phase 1 of the Waves 1-5 playtest

These are the swarm configs driven by Phase 1 of the playtest (see [playtest/baseline.md](../../../playtest/baseline.md)). Each config exercises one representative cell in the axes the runner actually supports:

| Axis       | Values                                                              |
| ---------- | ------------------------------------------------------------------- |
| BV budget  | 3000, 6000, 10000                                                   |
| aiVariant  | default, aggressive, defensive, skirmisher (mirrored or asymmetric) |
| pilotSkill | regular, elite                                                      |
| mapRadius  | 8, 12, 20                                                           |

Biome and AI-tier are **not** in the matrix — `terrainBiome` only supports `"none"` today (other values warn-and-fall-back per swarmConfigSchema.ts), and `aiVariant` is the legacy 4-name enum, not the Wave-2 AITierRegistry. Both are logged as gaps for a future Phase-7-style wave.

## Running the whole matrix

```bash
for cfg in scripts/swarm-configs/smoke/*.json; do
  name=$(basename "$cfg" .json)
  npm run simulate -- \
    --config="$cfg" \
    --runs=10 \
    --seed=20260520 \
    --output="playtest/swarm-runs/smoke/${name}/swarm-output.json"
done
```

Or via the driver script:

```bash
node scripts/swarm-configs/smoke/run-matrix.js
```

## Triage

After running, sweep the JSONL outputs through `src/simulation/invariants/checkers.ts` + `src/simulation/detectors/`. Cross-reference findings against `openspec/specs/simulation-system/known-limitations.md` and the **known-limitations exclusion list** in [snappy-sprouting-giraffe.md](../../../../Users/wroll/.claude/plans/snappy-sprouting-giraffe.md). Anything not on either list → file in `playtest/ISSUES.md` as a Phase-1 defect.
