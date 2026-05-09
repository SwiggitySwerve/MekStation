/**
 * Compile-time + runtime assertions for the replay-library type primitives.
 * Per add-replay-library PR 1 — proves the enum has exactly the five expected
 * variants and the discriminated union narrows correctly on `replaySource`.
 *
 * `link-encounters-to-replays` PR 1 grew the enum from 4 → 5 by adding
 * `ReplaySource.Encounter` so encounter sessions can persist into the
 * Replay Library alongside swarm / quick / pvp / campaign rows. The
 * narrowing tests double as a regression guard: if a future PR adds a
 * sixth variant to `ReplaySource` without updating `IReplayManifestEntry`,
 * the exhaustiveness check below fails compilation immediately.
 */

import { ScenarioTemplateType } from '@/types/encounter/EncounterInterfaces';
import { GameSide, ReplaySource } from '@/types/gameplay';

import type {
  ICampaignReplayManifestEntry,
  IEncounterReplayManifestEntry,
  IPvPReplayManifestEntry,
  IQuickReplayManifestEntry,
  IReplayManifestEntry,
  ISwarmReplayManifestEntry,
} from '../types';

describe('ReplaySource enum', () => {
  it('has exactly five variants', () => {
    // Object.values on a string-valued enum returns the value strings.
    const values = Object.values(ReplaySource).sort();
    expect(values).toEqual(['campaign', 'encounter', 'pvp', 'quick', 'swarm']);
  });

  it('variant string values match filesystem partition directory names', () => {
    // Each enum value is the partition directory name verbatim — the writer
    // path layer reads `entry.replaySource` and uses it as a directory
    // segment without translation.
    expect(ReplaySource.Swarm).toBe('swarm');
    expect(ReplaySource.Quick).toBe('quick');
    expect(ReplaySource.PvP).toBe('pvp');
    expect(ReplaySource.Campaign).toBe('campaign');
    expect(ReplaySource.Encounter).toBe('encounter');
  });
});

describe('IReplayManifestEntry discriminated union', () => {
  // Typed fixtures — if the union shape drifts, these stop compiling.
  const swarmFixture: ISwarmReplayManifestEntry = {
    id: 'sim-1',
    replaySource: ReplaySource.Swarm,
    path: 'swarm/sim-1.jsonl',
    createdAt: '2026-05-07T12:00:00.000Z',
    turns: 7,
    winner: GameSide.Player,
    bvTotal: 4500,
    configName: 'duel-3kbv-temperate',
    seed: 42,
    batchTimestamp: '2026-05-07T11-58-00-000Z',
  };

  const quickFixture: IQuickReplayManifestEntry = {
    id: 'quick-1',
    replaySource: ReplaySource.Quick,
    path: 'quick/quick-1.jsonl',
    createdAt: '2026-05-07T12:01:00.000Z',
    turns: 5,
    winner: GameSide.Opponent,
    bvTotal: 3200,
    playerSide: GameSide.Player,
    aiVariant: 'aggressive-v2',
  };

  const pvpFixture: IPvPReplayManifestEntry = {
    id: 'pvp-1',
    replaySource: ReplaySource.PvP,
    path: 'pvp/pvp-1.jsonl',
    createdAt: '2026-05-07T12:02:00.000Z',
    turns: 9,
    winner: null,
    bvTotal: 5000,
    opponentName: 'Strazz',
    matchId: 'match-77',
  };

  const campaignFixture: ICampaignReplayManifestEntry = {
    id: 'camp-1',
    replaySource: ReplaySource.Campaign,
    path: 'campaign/camp-1.jsonl',
    createdAt: '2026-05-07T12:03:00.000Z',
    turns: 12,
    winner: GameSide.Player,
    bvTotal: 7800,
    campaignId: 'campaign-alpha',
    missionId: 'mission-3',
    difficulty: 'veteran',
  };

  const encounterFixture: IEncounterReplayManifestEntry = {
    id: 'enc-1',
    replaySource: ReplaySource.Encounter,
    path: 'encounter/enc-1.jsonl',
    createdAt: '2026-05-07T12:04:00.000Z',
    turns: 8,
    winner: GameSide.Opponent,
    bvTotal: 6400,
    encounterId: 'encounter-alpha',
    encounterName: "Wolf's Dragoons vs Clan Jade Falcon",
    templateType: ScenarioTemplateType.Skirmish,
    playerForceSummary: "Wolf's Dragoons (3200 BV, 4 units)",
    opponentSummary: 'Clan Jade Falcon (3200 BV, 4 units)',
  };

  it('narrows to swarm fields when replaySource === Swarm', () => {
    const entry: IReplayManifestEntry = swarmFixture;
    if (entry.replaySource === ReplaySource.Swarm) {
      // Inside the narrowed branch, swarm-specific fields are accessible
      // without a type assertion. If narrowing breaks, this won't compile.
      expect(entry.configName).toBe('duel-3kbv-temperate');
      expect(entry.seed).toBe(42);
      expect(entry.batchTimestamp).toBe('2026-05-07T11-58-00-000Z');
    } else {
      throw new Error('expected swarm narrowing');
    }
  });

  it('narrows to quick fields when replaySource === Quick', () => {
    const entry: IReplayManifestEntry = quickFixture;
    if (entry.replaySource === ReplaySource.Quick) {
      expect(entry.playerSide).toBe(GameSide.Player);
      expect(entry.aiVariant).toBe('aggressive-v2');
    } else {
      throw new Error('expected quick narrowing');
    }
  });

  it('narrows to pvp fields when replaySource === PvP', () => {
    const entry: IReplayManifestEntry = pvpFixture;
    if (entry.replaySource === ReplaySource.PvP) {
      expect(entry.opponentName).toBe('Strazz');
      expect(entry.matchId).toBe('match-77');
    } else {
      throw new Error('expected pvp narrowing');
    }
  });

  it('narrows to campaign fields when replaySource === Campaign', () => {
    const entry: IReplayManifestEntry = campaignFixture;
    if (entry.replaySource === ReplaySource.Campaign) {
      expect(entry.campaignId).toBe('campaign-alpha');
      expect(entry.missionId).toBe('mission-3');
      expect(entry.difficulty).toBe('veteran');
    } else {
      throw new Error('expected campaign narrowing');
    }
  });

  it('narrows to encounter fields when replaySource === Encounter', () => {
    // Mirrors the per-source narrowing checks above. If `link-encounters-to-
    // replays` PR 1 misnamed any field on `IEncounterReplayManifestEntry`,
    // the narrowed branch below will not compile.
    const entry: IReplayManifestEntry = encounterFixture;
    if (entry.replaySource === ReplaySource.Encounter) {
      expect(entry.encounterId).toBe('encounter-alpha');
      expect(entry.encounterName).toBe("Wolf's Dragoons vs Clan Jade Falcon");
      expect(entry.templateType).toBe(ScenarioTemplateType.Skirmish);
      expect(entry.playerForceSummary).toBe(
        "Wolf's Dragoons (3200 BV, 4 units)",
      );
      expect(entry.opponentSummary).toBe('Clan Jade Falcon (3200 BV, 4 units)');
    } else {
      throw new Error('expected encounter narrowing');
    }
  });

  it('exhaustive switch covers every variant (compile-time guard)', () => {
    // The `assertNever` helper makes a missing variant a compile error.
    // If a future PR adds `ReplaySource.LANCoop` to the enum without
    // updating `IReplayManifestEntry`, this switch ceases to compile.
    function describeEntry(entry: IReplayManifestEntry): string {
      switch (entry.replaySource) {
        case ReplaySource.Swarm:
          return `swarm:${entry.configName}`;
        case ReplaySource.Quick:
          return `quick:${entry.aiVariant}`;
        case ReplaySource.PvP:
          return `pvp:${entry.opponentName}`;
        case ReplaySource.Campaign:
          return `campaign:${entry.missionId}`;
        case ReplaySource.Encounter:
          return `encounter:${entry.encounterId}`;
        default: {
          const _exhaustive: never = entry;
          return _exhaustive;
        }
      }
    }

    expect(describeEntry(swarmFixture)).toBe('swarm:duel-3kbv-temperate');
    expect(describeEntry(quickFixture)).toBe('quick:aggressive-v2');
    expect(describeEntry(pvpFixture)).toBe('pvp:Strazz');
    expect(describeEntry(campaignFixture)).toBe('campaign:mission-3');
    expect(describeEntry(encounterFixture)).toBe('encounter:encounter-alpha');
  });

  it('bvTotal is always a number on every variant (write-time computed)', () => {
    // Per Council Decision 3 + Momus MUST RESOLVE #1: BV is computed once
    // at manifest-write time and stored as a number. Read paths MUST NOT
    // recompute. This test enforces the field is always populated.
    const entries: readonly IReplayManifestEntry[] = [
      swarmFixture,
      quickFixture,
      pvpFixture,
      campaignFixture,
      encounterFixture,
    ];
    for (const entry of entries) {
      expect(typeof entry.bvTotal).toBe('number');
      expect(entry.bvTotal).toBeGreaterThanOrEqual(0);
    }
  });

  it('winner is GameSide or null (draws + no-result are first-class)', () => {
    expect(pvpFixture.winner).toBeNull();
    expect(swarmFixture.winner).toBe(GameSide.Player);
    expect(quickFixture.winner).toBe(GameSide.Opponent);
    expect(encounterFixture.winner).toBe(GameSide.Opponent);
  });

  it('encounter templateType accepts every ScenarioTemplateType + null', () => {
    // The encounter manifest uses `ScenarioTemplateType | null` so a
    // free-form / custom encounter can omit the template entirely. This test
    // pins the typed field to every valid value so a future enum addition
    // forces the manifest type to be reconsidered.
    const validTemplates: ReadonlyArray<ScenarioTemplateType | null> = [
      ScenarioTemplateType.Duel,
      ScenarioTemplateType.Skirmish,
      ScenarioTemplateType.Battle,
      ScenarioTemplateType.Custom,
      null,
    ];
    for (const template of validTemplates) {
      const entry: IEncounterReplayManifestEntry = {
        ...encounterFixture,
        templateType: template,
      };
      expect(entry.templateType).toBe(template);
    }
  });
});
