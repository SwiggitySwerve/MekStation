## 1. Root-cause investigation (D1 — no edits until pinned)

- [x] 1.1 Trace host day-advance end-to-end in co-op mode: store action → local write → PUT /api/campaigns payload+version → server response → coopRuntimeSession intent handling. Reproduce the silent failure (expect swallowed 409 or skipped PUT). Findings with file:line to notes/root-cause.md.
- [x] 1.2 Determine whether a guest-facing push path for campaign mutations exists in bindCampaignSyncConnection (wired vs absent) — one paragraph in notes/.

## 2. Fix persistence floor + surface failures (D2, D3)

- [x] 2.1 Fix the write path so host mutations persist to the shared record (resolve the version conflict correctly — refresh-and-retry once with host-authoritative state, or carry the correct version token through co-op init). Shared write path, not day-advance special-case.
- [x] 2.2 Surface persistence failure: toast + local store does not present unpersisted state as committed (rollback or pending marker). Test the 409-unresolved path.
- [x] 2.3 Tests: integration — co-op session, host day advance → server record has new date → guest fetch returns it; control mutation (GM ledger correction) through the same path; 409-retry-success path.

## 3. Push (ceiling, if wiring exists per 1.2)

- [x] 3.1 If the campaign sync channel already carries mutation events: emit/handle the day-advance (and generic mutation) push so a connected guest updates without refetch; test with the two-context pattern. If wiring is absent: document as follow-up in notes/ and skip (do NOT build a new channel).

## 4. Verification

- [x] 4.1 `npm run typecheck && npm run lint` clean; touched suites; full `npm run test:stable` once; validate:multiplayer:dev-socket unregressed.
- [x] 4.2 Live two-browser smoke (orchestrator): host creates co-op, guest joins, host Advance Day → guest sees new date (refetch, and live if 3.1 landed); GM-correction control mutation same; screenshots to evidence. (Skipped by worker.)
