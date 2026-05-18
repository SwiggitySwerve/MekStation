# Design — Enforce Zod Validation at I/O Boundaries

## Context

One boundary (equipment catalogs) is rigorously schema-validated via the
schema-bridge; the rest are not. This change extends Zod parsing to the
remaining boundaries. Two questions: **which boundaries, in what order** and
**how to fail** at each.

## Decision 1 — Boundary inventory and priority

Boundaries where untrusted data enters typed domain code:

| Boundary | Vector | Existing schema | Priority |
|---|---|---|---|
| Persisted store hydration | `localStorage` via `persist` | none | **1 — highest** |
| Unit JSON loading | `public/data/units/**` | `unit.zod.ts` (generated) | **2** |
| API route bodies | network | none | **3** |
| Equipment catalogs | filesystem | `*.zod.ts` + CI gate | done |
| BLK/MTF import | offline ETL | `schema_gate.py` | out of scope |

**Priority rationale.** Persisted hydration is first: a corrupt localStorage
payload silently becomes live state and corrupts the whole app — the worst
failure mode and the hardest to diagnose. Unit JSON is second: a generated
schema already exists, so it is the cheapest to wire. API routes are third:
network input is untrusted but the blast radius is one request.

## Decision 2 — Failure mode per boundary

The right failure differs by boundary; a single policy would be wrong.

- **Persisted store hydration → fall back to default state.** A user must never
  be locked out by a stale localStorage payload. The `persist` `merge` step
  `safeParse`s the rehydrated value; on failure it discards the payload and
  uses the store's default state. The failure is logged, not thrown.
- **Unit JSON loading → fail loud with a precise error.** Unit data ships with
  the app; a schema violation is a build/data bug, not a user condition. The
  loader throws a `ZodError`-derived message naming the offending path.
- **API route bodies → return `400`.** `safeParse` the body; on failure return
  `400` with the flattened schema error. Never let malformed input reach
  domain code.

## Decision 3 — Schema source and type inference

- **Reuse generated schemas where they exist.** Unit JSON uses the existing
  `unit.zod.ts` from the schema-bridge — no second source of truth.
- **Hand-author schemas where none exist** (store-state shapes, API bodies),
  colocated with the boundary. Per project convention, the TypeScript type at
  the boundary is `z.infer<typeof schema>` — not a parallel hand-written
  interface — so schema and type cannot drift.
- New backward-compatible fields use `.optional()`, never `.default()`:
  `.default()` makes a field required in the inferred *input* type, breaking
  older payloads. This is a standing project correction.

## Risk

- **Store-schema drift.** A store's Zod schema must track its state interface.
  Mitigation: infer the boundary type from the schema (Decision 3) so a
  divergence is a compile error.
- **Over-strict unit schema rejecting valid catalog data.** The generated
  `unit.zod.ts` may be stricter than the real corpus. Mitigation: run the
  loader against the full `public/data/units` corpus in a test before shipping;
  widen the schema (not the data) on any false positive.
- **Performance.** `safeParse` on every store hydration / unit load is a
  one-time cost per load, not per render — negligible.
