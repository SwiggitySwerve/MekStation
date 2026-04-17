# Tasks: Add Authoritative Roll Arbitration

## 1. Server Dice Roller

- [ ] 1.1 Add `serverDiceRoller.ts` that implements the existing
      `DiceRoller` type using `crypto.randomBytes`
- [ ] 1.2 Each call produces a new 2-byte buffer; mod 6 per byte
- [ ] 1.3 Include a rejection-sampling loop to avoid mod bias
- [ ] 1.4 Unit test: 100,000 rolls show uniform distribution across
      1–6 within a 1% tolerance per face

## 2. Event-Recording Wrapper

- [ ] 2.1 Add `recordingDiceRoller(inner: DiceRoller): {roller,
collected}` where `collected` accumulates every roll result
- [ ] 2.2 Before each phase resolver runs, a fresh recorder is created
- [ ] 2.3 After resolution, the recorded rolls are attached to the
      emitted event's `payload.rolls`
- [ ] 2.4 If multiple events emit from a single resolver call, rolls
      are split per event according to consumption order

## 3. Event Payload Schema

- [ ] 3.1 Extend event type definitions so any event whose resolution
      is non-deterministic carries `rolls: number[]`
- [ ] 3.2 Events affected: `InitiativeRolled`, `AttackResolved`,
      `HitLocationDetermined`, `ClusterHits`, `CriticalHitRolled`,
      `ConsciousnessCheck`, `ShutdownCheck`, `AmmoExplosionRolled`,
      `PilotingSkillRolled`, `FallMechanicsRolled`
- [ ] 3.3 Update event factories to accept and record rolls
- [ ] 3.4 Schema validation rejects networked events that omit `rolls`
      when they should carry them

## 4. Intent Validation

- [ ] 4.1 Any intent payload that contains a `rolls` field is rejected
      with `Error {code: 'INVALID_INTENT', reason: 'client-rolls-
forbidden'}`
- [ ] 4.2 Intents carry only declarations (targets, directions,
      choices) — never outcomes
- [ ] 4.3 Zod schemas enforce the absence of result fields

## 5. Server Resolver Wiring

- [ ] 5.1 All phase resolvers on `ServerMatchHost` construct a
      recording roller, run resolution, capture rolls per event
- [ ] 5.2 `ServerMatchHost` never accepts a `DiceRoller` from a client
      or an intent
- [ ] 5.3 Unit tests cover initiative, movement PSR, attack resolution,
      cluster hit determination, crit rolls, consciousness, shutdown,
      ammo explosion, fall

## 6. Client Rendering From Recorded Rolls

- [ ] 6.1 Client UI ignores any local dice roller for networked
      matches; it reads `event.payload.rolls` and displays those values
- [ ] 6.2 Dice-roll animations on the client are purely cosmetic and
      MUST converge to the recorded outcome
- [ ] 6.3 If an event is missing `rolls` where they are expected, the
      client logs an error and displays `"?"` rather than fabricating
      a value

## 7. Debug Seeded RNG

- [ ] 7.1 Admin endpoint or env flag `MP_DEV_SEED=<number>` replaces
      the crypto roller with a deterministic seeded roller for bug
      reproduction
- [ ] 7.2 Seeded mode is off by default
- [ ] 7.3 If the seeded mode is active, every match meta record gains
      `seed: number` in its `config` payload
- [ ] 7.4 Production deployments SHALL reject startup with a non-null
      seed flag

## 8. Hot-Seat Compatibility

- [ ] 8.1 Non-networked hot-seat matches continue to use whatever local
      roller the UI already wires
- [ ] 8.2 Local matches are NOT required to record rolls on events
      (backwards-compatible with Phase 1 MVP changes)
- [ ] 8.3 The recording wrapper MAY be opt-in for networked matches
      only, keyed by `session.hostPlayerId != null` (server-managed)

## 9. Tests

- [ ] 9.1 Unit test: a seeded server session produces deterministic
      outputs given a fixed seed
- [ ] 9.2 Integration test: attempting to send an intent with embedded
      rolls is rejected
- [ ] 9.3 Integration test: every networked event inspected across a
      20-turn match either carries no `rolls` (deterministic event) or
      a non-empty `rolls` array (dice event)
- [ ] 9.4 Integration test: a new client joining mid-match sees
      identical rolls on the replayed events

## 10. Spec Compliance

- [ ] 10.1 Every requirement in the `multiplayer-server` delta has at
      least one GIVEN/WHEN/THEN scenario
- [ ] 10.2 Every requirement in the `game-session-management` delta has
      at least one GIVEN/WHEN/THEN scenario
- [ ] 10.3 Every requirement in the `dice-system` delta has at least
      one GIVEN/WHEN/THEN scenario
- [ ] 10.4 `openspec validate add-authoritative-roll-arbitration
--strict` passes clean
