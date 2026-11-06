# Quirk-only regeneration

This owner updates only top-level `quirks` and `weaponQuirks` on existing
canonical unit files. It preserves paths, IDs, all construction bytes, manifests
and indices. It does not replace the full family converters.

Source metadata comes from the existing MTF parser and shared BLK field owner.
Extracted source bytes, normalized only from CRLF to LF, must match immutable
mm-data `50f7efef0c9f775b0258f8283525ed4f906e1985` Git inventory hashes. Existing
source exclusions remain authoritative. Exact chassis/model and source filename
disambiguate repeated identities; conflicting unmatched identities fail closed.
Native weapon keys retain `LOCATION:SLOT:WEAPON_NAME`, source IDs and repeats.

Generate into **two new directories from the same untouched baseline**, under
the shared heavy queue. Each invocation is bounded to 10 minutes:

```text
python scripts/megameklab-conversion/quirk_regeneration.py generate
  --repo <mm-data-git-repo> --extracted <pinned-data/mekfiles>
  --baseline public/data/units --family <family>
  --output <new-run-directory> --report <external-report.json>
```

Reports include per-family source/output counts and source provenance. Check
these counts against the independent pinned-source inventory, including the
fixed-wing support sources stored under vehicles but shipped as aerospace.

Gate and apply only after both independent runs have completed:

```text
python scripts/megameklab-conversion/quirk_regeneration.py verify
  --before <first-run> --after <second-run> --identical
python scripts/megameklab-conversion/quirk_regeneration.py apply
  --baseline public/data/units/<family> --first <first-run> --second <second-run>
```

The apply command validates every file before writing. `verify` requires an
identical file set. Non-unit files must match exactly; unit files must match
raw bytes after removing only the two top-level quirk members. Nested quirk
fields, equivalent numeric spellings, escapes and construction whitespace are
not exempt. `--identical` exempts nothing. No-op runs produce no data PR.

Keep one family per PR based on current main. Record double-run identity,
the raw-byte gate, source/output counts, required catalog contracts and the
full 9,815-row strict BV proof. The comparator exercises the source conversion
and runtime calculation paths; raw-byte identity separately proves that
canonical numerical inputs did not change. Never describe one as the other.
