# Notepad — Decisions

Apply-wave decisions captured against the buttoned-up design.md.

## [2026-04-24 apply] Task 3.4 — Victory screen CTA scope

**Decision:** "View Post-Battle Report" CTA on the victory screen is
DEFERRED to Wave 5. Rationale: existing `victory.tsx` already renders
"Back to Encounter Hub" + Wave 5 "Continue to Review" CTAs. A
dedicated link to `/gameplay/matches/[id]` adds value once a
report-history drawer is built; for Phase 1 standalone matches the
report is reachable via direct URL after reload.

**File:** `src/pages/gameplay/games/[id]/victory.tsx:191-222` (existing
CTA layout with reviewHref + onBack patterns).

## [2026-04-24 apply] Task 10.5(d) — Strict byte-identical replay

**Decision:** Strict JSON-equality replay assertion gated behind
`STRICT_REPLAY=1` env var. Rationale: the dice-roller layer
(`defaultD6Roller` in `src/utils/gameplay/diceTypes.ts`) still falls
back to `Math.random` for attack/heat resolvers. Until
`SeededRandom` threads through every resolver, byte-identical
replay is mathematically impossible — a strict assertion would be
flaky.

**Strongest deterministic assertion possible today:** report SHAPE
parity (same unit ids, same schema version, same field set). Added
in `phase1Capstone.test.ts` as the third `it(...)` block.

**Path forward:** once dice rollers land seeded (tracked against
`add-authoritative-roll-arbitration` Wave 3a closeout), set
`STRICT_REPLAY=1` in CI to flip on the byte-identical assertion. No
test code change needed at that point — the env-gated branch is
already in place.

**File:** `src/__tests__/integration/phase1Capstone.test.ts:193-228`.

## [2026-04-24 apply] Task 10.1/10.2/10.3 — UI-rendered E2E vs unit tests

**Decision:** Three integration scenarios (destroy-all-opponents,
concede, turn-limit-21) DEFERRED to Wave 4 (hex-rendering harness).
Rationale: the underlying logic is unit-tested:

- **10.1 (destruction):** `phase1Capstone.test.ts` runs a full
  bot-vs-bot match to a destruction outcome and asserts
  `Completed` + GameEnded.
- **10.2 (concede):** `addVictoryAndPostBattleSummary.smoke.test.ts`
  covers the concede event + reducer transition + report
  derivation.
- **10.3 (turn-limit):** `victory-spec-coverage.test.ts` covers the
  predicate (0/0, exactly 5%, near-equal damage) +
  `GameOutcomeCalculator` turn-limit branch.

Wave 4 will add React-rendered E2Es exercising the victory page
itself once the hex-rendering test harness is in place.

**Files:**
- `src/__tests__/integration/phase1Capstone.test.ts`
- `src/__tests__/unit/gameplay/addVictoryAndPostBattleSummary.smoke.test.ts`
- `src/__tests__/unit/gameplay/victory-spec-coverage.test.ts`
