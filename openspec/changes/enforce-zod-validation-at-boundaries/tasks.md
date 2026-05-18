# Tasks — Enforce Zod Validation at I/O Boundaries

## 1. Boundary audit

- [ ] 1.1 Enumerate every I/O boundary where untrusted data enters typed domain
  code (filesystem, localStorage, network, user import). Record the inventory
  and current validation posture in `design.md`'s boundary table.
- [ ] 1.2 Confirm which boundaries already have a generated Zod schema
  (`src/types/contracts/generated/*.zod.ts`) and which need a hand-authored one.

## 2. Persisted store hydration (priority 1)

- [ ] 2.1 Author a Zod schema for each per-type store's persisted state shape;
  infer the boundary type from the schema (`z.infer`).
- [ ] 2.2 Add a `merge` / migration step to each store's `persist` config that
  `safeParse`s the rehydrated payload.
- [ ] 2.3 On `safeParse` failure, discard the payload and use the store's
  default state; log the failure. Never throw on hydration.

## 3. Unit JSON loading (priority 2)

- [ ] 3.1 Parse unit JSON through the existing generated `unit.zod.ts` at the
  loader boundary.
- [ ] 3.2 On failure, throw a precise error naming the offending field path.
- [ ] 3.3 Run the loader against the full `public/data/units` corpus; widen the
  schema (not the data) for any false-positive rejection.

## 4. API route bodies (priority 3)

- [ ] 4.1 Author Zod schemas for the request bodies of the Next.js API routes
  that accept input (e.g. the replay-library routes).
- [ ] 4.2 `safeParse` each body at the route entry; on failure return `400`
  with the flattened schema error.

## 5. Tests

- [ ] 5.1 Per-boundary failure tests: malformed persisted payload → default
  state; malformed unit JSON → precise load error; malformed API body → `400`.
- [ ] 5.2 Per-boundary happy-path round-trip tests.
- [ ] 5.3 Full-corpus test: every shipped unit JSON parses cleanly through
  `unit.zod.ts`.

## 6. Final Verification Wave

- [ ] 6.1 Merge the `validation-patterns` ADDED delta into the source-of-truth
  spec.
- [ ] 6.2 Archive this change.
