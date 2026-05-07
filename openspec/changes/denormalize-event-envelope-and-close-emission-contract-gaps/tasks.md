# Tasks

## 1. Authoring

- [x] 1.1 Author proposal.md with motivation + scope
- [x] 1.2 Author game-event-system spec delta (Side Denormalization + Turn Lifecycle + Initiative emission contracts)
- [x] 1.3 Author combat-resolution spec delta (AttackResolved Side-Effect Chain Ordering)
- [x] 1.4 Author damage-system spec delta (DamageApplied + Transfer/LocationDestroyed Contracts)
- [x] 1.5 Author piloting-skill-rolls spec delta (PSRTriggered Base Skill + UnitFell Location & Reason)

## 2. Type extensions

- [ ] 2.1 Add `readonly side?: GameSide` to `IGameEventBase` in `src/types/gameplay/GameSessionInterfaces.ts:320`
- [ ] 2.2 Add `readonly basePilotingSkill?: number` to `IPSRTriggeredPayload` (line 849)
- [ ] 2.3 Add `readonly location?: string` and `readonly reason?: string` to `IUnitFellPayload` (line 870)
- [ ] 2.4 Add `readonly turns?: number` to `IGameEndedPayload` (line 362)

## 3. Single-chokepoint side derivation

- [ ] 3.1 Extend `createGameEvent` in `src/simulation/runner/phases/utils.ts:10` to derive `side` from `actorId` (`'player-'` prefix → `GameSide.Player`, `'opponent-'` prefix → `GameSide.Opponent`, else omit field)
- [ ] 3.2 Update existing `MetricsCollector.sideFromUnitId` to remain a fallback (do NOT remove — needed for legacy event-stream replay), but add a comment noting the envelope is the canonical source going forward

## 4. Schema-gap propagation

- [ ] 4.1 Update PSR-trigger emit sites in `src/simulation/runner/phases/postCombat.ts` and any other PSR sites to pass `basePilotingSkill: unit.pilot.piloting` into the payload
- [ ] 4.2 Update `unit_fell` emit site (`postCombat.ts:106`) to pass `location` and `reason` derived from the PSR context (the trigger that caused the fall)
- [ ] 4.3 Update the `game_ended` emit site to populate `turns` with the runner's final turn counter

## 5. Tests

- [ ] 5.1 Update or add unit tests verifying `createGameEvent` populates `side` from `actorId` for all three branches (player, opponent, system-no-actor)
- [ ] 5.2 Add scenario test verifying a player-1 attack produces events all carrying `side: 'player'`
- [ ] 5.3 Update / extend the existing PSR-resolved scenario test to also assert `psr_triggered.basePilotingSkill` populates
- [ ] 5.4 Update / extend an existing fall scenario test (or add one) to assert `unit_fell.location` and `unit_fell.reason` populate
- [ ] 5.5 Update / extend the existing game-end scenario test to assert `game_ended.turns` matches the final turn count
- [ ] 5.6 Run the full test suite — green

## 6. Validation

- [ ] 6.1 `npm run typecheck` clean
- [ ] 6.2 `npm run lint` clean
- [ ] 6.3 `npm test` green
- [ ] 6.4 `npx openspec validate denormalize-event-envelope-and-close-emission-contract-gaps --strict` clean

## 7. PR

- [ ] 7.1 Commit on branch `event-log/pr-b-envelope-and-emission-contracts`
- [ ] 7.2 Open PR against `main` with title `feat(event-log): denormalize side onto envelope + backfill schema gaps + 4 emission-contract spec extensions`
- [ ] 7.3 Wait for CI green
- [ ] 7.4 Merge with `--squash --delete-branch`

## 8. Archive

- [ ] 8.1 After merge, run `npx openspec archive denormalize-event-envelope-and-close-emission-contract-gaps --yes` — clean
- [ ] 8.2 Open archive PR; merge
