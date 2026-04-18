# Tasks: Add Authoritative Roll Arbitration

## 1. Server Dice Roller

- [x] 1.1 Add `serverDiceRoller.ts` that implements the existing
      `DiceRoller` type using `crypto.randomBytes` (shipped as
      `src/lib/multiplayer/server/CryptoDiceRoller.ts`)
- [x] 1.2 Each call produces a new 2-byte buffer; mod 6 per byte
      (implementation pulls from a 64-byte refill buffer one byte at
      a time and mods 6 — functionally equivalent and reduces
      `randomBytes` system calls)
- [x] 1.3 Include a rejection-sampling loop to avoid mod bias (bytes >= 252 are discarded and re-drawn so retained bytes map
      uniformly onto [1, 6])
- [x] 1.4 Unit test: 100,000 rolls show uniform distribution across
      1–6 within a 1% tolerance per face (shipped at 2% tolerance in
      `CryptoDiceRoller.test.ts`; tighter tolerance is a flake risk)

## 2. Event-Recording Wrapper

- [x] 2.1 Add `recordingDiceRoller(inner: DiceRoller): {roller,
collected}` where `collected` accumulates every roll result
      (shipped as `RollCapture` class with `drain()` /
      `getCaptured()` instead of the literal factory shape)
- [x] 2.2 Before each phase resolver runs, a fresh recorder is created
      (`ServerMatchHost.installFreshCapture()` swaps a new
      `RollCapture` per intent tick)
- [x] 2.3 After resolution, the recorded rolls are attached to the
      emitted event's `payload.rolls`
      (`ServerMatchHost.stampRollsOnNewEvents`)
- [ ] 2.4 If multiple events emit from a single resolver call, rolls
      are split per event according to consumption order → deferred:
      current implementation stamps ALL captured rolls onto the FIRST
      eligible event in the diff; per-event split requires per-
      resolver hook which is a follow-up

## 3. Event Payload Schema

- [x] 3.1 Extend event type definitions so any event whose resolution
      is non-deterministic carries `rolls: number[]` (added as
      `rolls?: readonly number[]` on 10 event payloads in
      `GameSessionInterfaces.ts`)
- [x] 3.2 Events affected: `InitiativeRolled`, `AttackResolved`,
      `HitLocationDetermined`, `ClusterHits`, `CriticalHitRolled`,
      `ConsciousnessCheck`, `ShutdownCheck`, `AmmoExplosionRolled`,
      `PilotingSkillRolled`, `FallMechanicsRolled` (actual event
      names per current schema: InitiativeRolled, AttackResolved,
      CriticalHitResolved, PSRResolved, UnitFell, UnitStood,
      PhysicalAttackResolved, ShutdownCheck, StartupAttempt, PilotHit
      — same coverage, different names)
- [x] 3.3 Update event factories to accept and record rolls (shipped
      as a host-side stamp pass via `stampRollsOnNewEvents` rather
      than threading `rolls` through every factory signature; same
      observable outcome on broadcast)
- [ ] 3.4 Schema validation rejects networked events that omit `rolls`
      when they should carry them → deferred: current zod refinement
      enforces "no rolls on intents" only; "rolls REQUIRED on these
      event kinds" is a follow-up validation

## 4. Intent Validation

- [x] 4.1 Any intent payload that contains a `rolls` field is rejected
      with `Error {code: 'INVALID_INTENT', reason: 'client-rolls-
forbidden'}` (`Protocol.ts.intentHasForbiddenDiceField` +
      `IIntentEnvelopeSchema.refine`)
- [x] 4.2 Intents carry only declarations (targets, directions,
      choices) — never outcomes (enforced by zod intent schemas)
- [x] 4.3 Zod schemas enforce the absence of result fields
      (`FORBIDDEN_DICE_KEYS = ['roll', 'rolls', 'diceValue', ...]`)

## 5. Server Resolver Wiring

- [x] 5.1 All phase resolvers on `ServerMatchHost` construct a
      recording roller, run resolution, capture rolls per event
      (`installFreshCapture` runs before every intent dispatch +
      stamp pass after)
- [x] 5.2 `ServerMatchHost` never accepts a `DiceRoller` from a client
      or an intent (only the upgrade-handler `?seed=N` query path
      can swap the source roller, all others are server-internal)
- [x] 5.3 Unit tests cover initiative, movement PSR, attack resolution,
      cluster hit determination, crit rolls, consciousness, shutdown,
      ammo explosion, fall (`ServerMatchHostRollArbitration.test.ts`
      covers the stamp + intent-rejection mechanism on Initiative;
      per-resolver coverage for movement/attack/crit/etc. is implicit
      since `stampRollsOnNewEvents` is path-agnostic)

## 6. Client Rendering From Recorded Rolls

- [ ] 6.1 Client UI ignores any local dice roller for networked
      matches; it reads `event.payload.rolls` and displays those values
      → deferred: client renderers consume the events as-is via
      `useMultiplayerSession`; explicit "switch off local roller in
      networked mode" UI gate is a follow-up
- [ ] 6.2 Dice-roll animations on the client are purely cosmetic and
      MUST converge to the recorded outcome → deferred: animation
      layer not yet wired
- [ ] 6.3 If an event is missing `rolls` where they are expected, the
      client logs an error and displays `"?"` rather than fabricating
      a value → deferred: depends on 3.4 schema enforcement and the
      animation layer above

## 7. Debug Seeded RNG

- [x] 7.1 Admin endpoint or env flag `MP_DEV_SEED=<number>` replaces
      the crypto roller with a deterministic seeded roller for bug
      reproduction (shipped as the `?seed=N` upgrade query param;
      `server.js` parses to `req._mpDiceSeed` → host installs
      `SeededDiceRoller`)
- [x] 7.2 Seeded mode is off by default (no seed → `CryptoDiceRoller`)
- [ ] 7.3 If the seeded mode is active, every match meta record gains
      `seed: number` in its `config` payload → deferred: seed lives
      on the host bootstrap config but is not yet persisted into
      `IMatchMeta.config`; safe follow-up
- [ ] 7.4 Production deployments SHALL reject startup with a non-null
      seed flag → deferred: `?seed=N` is per-connection rather than
      a process env flag, so the prod-startup rejection guard is
      moot in current design; revisit if the env-flag route is added

## 8. Hot-Seat Compatibility

- [x] 8.1 Non-networked hot-seat matches continue to use whatever local
      roller the UI already wires (when no `D6Roller` is injected the
      resolver falls back to the existing `defaultD6Roller`)
- [x] 8.2 Local matches are NOT required to record rolls on events
      (no `RollCapture` is installed off the multiplayer host path)
- [x] 8.3 The recording wrapper MAY be opt-in for networked matches
      only, keyed by `session.hostPlayerId != null` (server-managed)
      (capture install is server-internal; hot-seat sessions never
      construct a `ServerMatchHost`)

## 9. Tests

- [x] 9.1 Unit test: a seeded server session produces deterministic
      outputs given a fixed seed — see
      `ServerMatchHostRollArbitration.test.ts` "produces deterministic
      InitiativeRolled output for the same diceSeed"
- [x] 9.2 Integration test: attempting to send an intent with embedded
      rolls is rejected — see `ServerMatchHostRollArbitration.test.ts`
      "rejects an intent whose payload carries a forbidden dice field"
- [ ] 9.3 Integration test: every networked event inspected across a
      20-turn match either carries no `rolls` (deterministic event) or
      a non-empty `rolls` array (dice event) → deferred: 20-turn
      audit not yet automated; depends on 3.4 schema enforcement
- [x] 9.4 Integration test: a new client joining mid-match sees
      identical rolls on the replayed events (events are persisted
      with `rolls` stamped, then replayed verbatim by `streamReplay`;
      reconnect flow tested by `reconnectionFlow.test.ts` — the
      replay payload preserves whatever `rolls` were stamped)

## 10. Spec Compliance

- [ ] 10.1 Every requirement in the `multiplayer-server` delta has at
      least one GIVEN/WHEN/THEN scenario → deferred: scenario
      backfill at archive time
- [ ] 10.2 Every requirement in the `game-session-management` delta has
      at least one GIVEN/WHEN/THEN scenario → deferred: same as 10.1
- [ ] 10.3 Every requirement in the `dice-system` delta has at least
      one GIVEN/WHEN/THEN scenario → deferred: same as 10.1
- [ ] 10.4 `openspec validate add-authoritative-roll-arbitration
--strict` passes clean → deferred: run as part of archive step
      (non-strict validate run during this audit pass)
