# Tasks

## 1. Authoring

- [x] 1.1 Author proposal.md (motivation, decomposition fields, step union, MegaMek `MoveStepType` cross-reference)
- [x] 1.2 Author movement-system spec delta (Movement Phase Step Chain Emission + Movement Decomposition Fields + Hex Coordinate Board Label Utility)
- [x] 1.3 Author piloting-skill-rolls spec delta (Movement-Step PSR Trigger-Source Stamping)

## 2. Type extensions (`src/types/gameplay/GameSessionInterfaces.ts`)

- [x] 2.1 Add five optional fields to `IMovementDeclaredPayload` (line 447): `hexesMoved?`, `straightHexes?`, `turningMpCost?`, `netDisplacement?`, `steps?: readonly IMovementStep[]`
- [x] 2.2 Add `IMovementStep` discriminated union covering 9 kinds: `forward`, `turn`, `lateral`, `jump`, `standUp`, `goProne`, `chargeDeclared`, `dfaDeclared`, `shakeOffSwarm`
- [x] 2.3 Add per-kind interfaces (`IForwardStep`, `ITurnStep`, etc.) — each carries `index`, kind discriminator, plus kind-specific fields (`from`/`to`/`at`/`mpCost`/`terrainEntered`/`fromFacing`/`toFacing`/etc.)
- [x] 2.4 Export `IMovementStep` and the per-kind interfaces from the gameplay types barrel (auto-exported via `export * from './GameSessionInterfaces'` in `src/types/gameplay/index.ts`)

## 3. Hex utility (`src/utils/gameplay/hexMath.ts`)

- [x] 3.1 Add `coordToBoardLabel(coord: IHexCoordinate): string` — axial `(q,r)` → MegaMek 4-digit `NNNN` (1-indexed col + row, zero-padded)
- [x] 3.2 Verify the inverse round-trip with `convertOffsetToAxial` from `src/lib/parsers/megaMekBoard.ts:30`
- [x] 3.3 Add unit test at `src/utils/gameplay/__tests__/coordToBoardLabel.test.ts` — origin, typical hex, round-trip sweep over a 16×17 standard board, modulo-100 wrap on out-of-range columns

## 4. Runner movement-step decomposition (`src/simulation/runner/phases/movement.ts` + `src/utils/gameplay/movement/eventPath.ts`)

- [x] 4.1 Extend the move-resolution path walker to emit a step array — `decomposeMovementSteps` synthesizes the chain from `(from, fromFacing, to, toFacing, movementType, mpUsed, path)` since the bot's `IMove` shape today doesn't expose a true `MoveStep[]`. Forward-compatible with the future runner that walks a real `MoveStep[]`.
- [x] 4.2 Compute `hexesMoved`, `straightHexes`, `turningMpCost`, `netDisplacement` deterministically from the steps array
- [x] 4.3 Populate `payload.steps` and the four decomposition fields on every `movement_declared` event (runner movement.ts emit site updated)
- [x] 4.4 Verify the conservation invariant in a runtime assertion (test-only) via `assertMovementStepConservation`: `straightHexes + turningMpCost + jumpMp === mpUsed` (special-step MP rolls into `turningMpCost` in this implementation)

## 5. Movement-step PSR trigger-source stamping

- [x] 5.1 Extend `createStandingUpPSR`, `createSkiddingPSR`, `createIcePSR`, `createRubblePSR`, `createRunningRoughTerrainPSR`, `createEnteringWaterPSR`, `createExitingWaterPSR`, and `createStandUpAttempt` to accept an optional `stepIndex` parameter. When provided, the factory overrides `triggerSource` to `'movement-step:<index>'`. `createSkiddingPSR` (skid resolution), `createStandingUpPSR` (AttemptStand), and the four mid-move terrain PSRs are the canonical movement-step PSR call sites; the runner-side wiring lands when the runner gains true mid-move PSR resolution (documented as a `TODO PR-C follow-on` in `src/simulation/runner/phases/movement.ts`).
- [x] 5.2 Existing damage / heat / gyro-destroyed PSR sites retain their free-string `triggerSource` values (no migration). The `stepIndex` parameter is OPTIONAL on every factory — every existing call site that doesn't yet thread step context falls through to its legacy `PSRTrigger.*` enum value, preserving current behavior.

## 6. Tests

- [x] 6.1 Add `src/__tests__/unit/utils/gameplay/movement-decomposition.test.ts` — assert decomposition for a 5-MP F+F+TR+F+F+TR+F chain produces 7 steps with correct ordinals (5 forwards + 2 turns) and `mpCost` sum equals 7
- [x] 6.2 Scenario test for a 4-MP jump producing exactly 1 `'jump'` step
- [x] 6.3 Scenario test for AttemptStand: prone unit (`startedProne: true`), `steps[0].kind === 'standUp'`, `psrTriggered: true`, MP cost 2
- [x] 6.4 Scenario test for charge declaration: `IChargeDeclaredStep` type-guard discrimination on `step.kind === 'chargeDeclared'` with correct `targetId` + `straightLineHexes` (asserts the read-side discriminated-union contract — the runner does not yet emit chargeDeclared, that lands when the future physical-attack handoff wiring exists)
- [x] 6.5 Scenario test for movement-induced PSR `triggerSource: 'movement-step:<index>'` — three assertions covering the AttemptStand factory's optional `stepIndex` parameter (movement-step:0, movement-step:2, and the legacy fallback when stepIndex is omitted)
- [x] 6.6 Run the full test suite — green (1950 simulation tests + 255 movement / PSR / coord tests)

## 7. Validation

- [x] 7.1 `npm run typecheck` clean
- [x] 7.2 `npm run lint` clean (0 errors, 42 pre-existing warnings — none in files touched by this change)
- [x] 7.3 `npm test` green (related test pattern: 255/255 movement/PSR/coord; full simulation suite: 1950/1950)
- [x] 7.4 `npx openspec validate enrich-movement-declared-with-chain-and-displacement --strict` clean

## 8. PR

- [ ] 8.1 Commit on branch `event-log/pr-c-movement-enrichment`
- [ ] 8.2 Open PR against `main` with title `feat(event-log): enrich movement_declared with step chain + displacement decomposition`
- [ ] 8.3 Wait for CI green
- [ ] 8.4 Merge with `--squash --delete-branch`

## 9. Archive

- [ ] 9.1 After merge, run `npx openspec archive enrich-movement-declared-with-chain-and-displacement --yes` — clean
- [ ] 9.2 Open archive PR; merge
