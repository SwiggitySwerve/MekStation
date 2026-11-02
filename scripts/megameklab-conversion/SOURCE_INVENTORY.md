# Source and Java load accounting

`source_inventory.py` owns immutable source accounting. Without `--loads`, it
inventories only; with `--loads <external.jsonl>`, it joins Java load rows by
source-root-relative path and exact SHA-256. No oracle is bundled.

```sh
python -B scripts/megameklab-conversion/source_inventory.py --repo <mm-data> --repository https://github.com/MegaMek/mm-data --commit 50f7efef0c9f775b0258f8283525ed4f906e1985 --loads <UL-16b/full.jsonl> --exclusions scripts/megameklab-conversion/source-load-exclusions.json > <evidence.json>
```

Missing and extra rows require recorded exclusions; hashes must always match.
Rules select an exact `path`, a directory `prefix`, or a `format` (combined
selectors intersect). Each rule needs a reason and `excluded` or `pending`
status. Unused and overlapping rules fail. Excluded classes come from the rule
when no Java row exists; they are declarations, not observed loads.

Families are source folders; the six BFS files are owner-excluded (ruling
2026-11-02 item 4) and stay in their own folders. A `pending` rule would move its
rows into `battlefield-support-pending`. Class counts retain concrete Java class names.
Unique designs count loaded `[entityClass, chassis, model]` tuples exactly,
including blank models, matching the corpus duplicate-identity definition.
Every source stays in `rows`; `duplicateDesigns` lists collisions without
claiming semantic equivalence. Excluded/pending rows without loads have no
observed design identity and do not contribute to unique designs.

ZIP source members are expanded from immutable blob bytes in reconciliation
mode, hashed individually and addressed as `container.zip!/member.mtf`.
Unreadable archives fail. Archive containers and metadata stay inventoried.
Java load failures retain their reasons; later `stageFailure` diagnostics stay
separate. These results prove Java loading only, not editor loading or parity.
