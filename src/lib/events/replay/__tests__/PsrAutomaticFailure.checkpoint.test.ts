import { createHash } from 'node:crypto';

import { GameEventType, GamePhase, GameSide } from '@/types/gameplay';
import { createGameCreatedEvent } from '@/utils/gameplay/gameEvents/lifecycle';
import {
  createPSRResolvedEvent,
  createPSRTriggeredEvent,
} from '@/utils/gameplay/gameEvents/statusChecksPsr';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';

import { REPLAY_BASELINE_DOMAIN_SCHEMA_PACK } from '../ReplayBaselineDomainRegistry';
import {
  createReplayCheckpointMetadata,
  digestReplayCheckpointState,
  evaluateReplayCheckpointCompatibility,
  selectReplayRecoveryBase,
} from '../ReplayCheckpointCompatibility';
import { REPLAY_SURFACE_REGISTRY } from '../ReplayEventAcceptance';
import { loadReplayLibraryNdjson } from '../ReplayLibraryLoadPipeline';
import { ReplaySchemaRegistry } from '../ReplaySchemaRegistry';

it('rejects the pre-automatic-failure checkpoint and rebuilds exactly the same state from unchanged events', () => {
  const oldRegistry = new ReplaySchemaRegistry({
    events: REPLAY_BASELINE_DOMAIN_SCHEMA_PACK.map((entry) => ({
      ...entry,
      schemas: entry.schemas.map((schema) => ({
        ...schema,
        schemaId:
          entry.eventType === GameEventType.PSRTriggered ||
          entry.eventType === GameEventType.PSRResolved
            ? `combat.${entry.eventType}.v1.swamp-unstuck-1`
            : schema.schemaId,
      })),
    })),
  });
  const gameId = 'psr-checkpoint-identity';
  const events = [
    createGameCreatedEvent({
      gameId,
      config: {
        mapRadius: 4,
        turnLimit: 3,
        victoryConditions: [],
        optionalRules: [],
      },
      units: [
        {
          id: 'mek',
          name: 'Atlas',
          side: GameSide.Player,
          unitRef: 'atlas-as7-d',
          pilotRef: 'Regular',
          gunnery: 4,
          piloting: 5,
        },
      ],
    }),
    createPSRTriggeredEvent({
      gameId,
      sequence: 1,
      turn: 1,
      phase: GamePhase.End,
      unitId: 'mek',
      reason: 'Damage',
      additionalModifier: 0,
      triggerSource: 'damage',
      basePilotingSkill: 5,
    }),
    createPSRResolvedEvent({
      gameId,
      sequence: 2,
      turn: 1,
      phase: GamePhase.End,
      unitId: 'mek',
      targetNumber: 5,
      roll: 7,
      modifiers: 0,
      passed: true,
      reason: 'Damage',
    }),
  ];
  const bytes = events.map((event) => JSON.stringify(event)).join('\n');
  const stored = JSON.parse(JSON.stringify(events)) as typeof events;
  for (const event of stored) oldRegistry.upcast(event.type, 1, event.payload);
  const before = hydrateGameSessionFromEvents(gameId, stored);
  const versions = stored.map((event) => ({
    eventType: event.type,
    schemaVersion: 1,
  }));
  const common = {
    streamId: gameId,
    branchId: 'root',
    projectorId: 'combat.reducer',
    projectorVersion: 1,
  };
  const checkpoint = createReplayCheckpointMetadata({
    ...common,
    revision: events.length,
    schemaPipelineFingerprint: oldRegistry.fingerprintPipeline(versions),
    sourceTailDigest: digestReplayCheckpointState(stored),
    stateDigest: digestReplayCheckpointState(
      JSON.parse(JSON.stringify(before)),
    ),
  });
  const expectation = {
    ...common,
    schemaPipelineFingerprint:
      REPLAY_SURFACE_REGISTRY.fingerprintPipeline(versions),
  };
  expect(
    evaluateReplayCheckpointCompatibility(checkpoint, expectation),
  ).toEqual({ compatible: false, mismatches: ['schemaPipelineFingerprint'] });
  const recovery = selectReplayRecoveryBase([checkpoint], expectation);
  expect(recovery).toEqual({ kind: 'full-replay' });
  const loaded = loadReplayLibraryNdjson(bytes, gameId);
  expect(loaded.kind).toBe('loaded');
  if (loaded.kind !== 'loaded')
    throw new Error('Unchanged finite history was blocked');
  const rebuilt = hydrateGameSessionFromEvents(gameId, loaded.events);
  expect(rebuilt).toStrictEqual(before);
  expect(loaded.sourceDigest).toBe(
    createHash('sha256').update(bytes).digest('hex'),
  );
  expect(events.map((event) => JSON.stringify(event)).join('\n')).toBe(bytes);
});

it('keeps the triggered and resolved automatic-failure arms strict', () => {
  const triggered = {
    unitId: 'mek',
    reason: 'Avoid bogging down',
    additionalModifier: 0,
    triggerSource: 'swamp_bog_down',
    automaticFailure: true,
  };
  expect(
    REPLAY_SURFACE_REGISTRY.upcast(GameEventType.PSRTriggered, 1, triggered)
      .payload,
  ).toEqual(triggered);
  for (const invalid of [
    { ...triggered, fixedTargetNumber: 5 },
    { ...triggered, fixedTargetNumber: null },
    { ...triggered, automaticFailure: false },
  ])
    expect(() =>
      REPLAY_SURFACE_REGISTRY.upcast(GameEventType.PSRTriggered, 1, invalid),
    ).toThrow();
  const resolved = {
    unitId: 'mek',
    reason: 'Avoid bogging down',
    modifiers: 0,
    roll: 7,
    passed: false,
    automaticFailure: true,
  };
  expect(
    REPLAY_SURFACE_REGISTRY.upcast(GameEventType.PSRResolved, 1, resolved)
      .payload,
  ).toEqual(resolved);
  expect(() =>
    REPLAY_SURFACE_REGISTRY.upcast(GameEventType.PSRResolved, 1, {
      ...resolved,
      targetNumber: 5,
    }),
  ).toThrow();
});
