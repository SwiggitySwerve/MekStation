import type { IIntent } from '@/types/multiplayer/Protocol';

import { formatEvent } from '@/components/gameplay/EventLogDisplay.formatters';
import { buildMirrorSessionGated } from '@/lib/multiplayer/mirrorMatchSession';
import { getCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { GameSide, MovementType } from '@/types/gameplay';
import { canAdvancePhase } from '@/utils/gameplay/gameSession';
import { getActivePhaseUnitId } from '@/utils/gameplay/gameSessionActivation';
import { generateGameLog } from '@/utils/gameplay/gameSessionReplay';

import type { IMatchMeta } from '../IMatchStore';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { _setCombatJournalAuthorityModeForTests } from '../matchJournalAuthority';
import {
  buildDefaultMatchUnitBootstrap,
  buildMatchHostBootstrapFromMeta,
} from '../matchUnitBootstrap';
import { ServerMatchHost } from '../ServerMatchHost';
import { digestCommandPostState } from '../ServerMatchHostDecision';
import { createPersistedHost } from './matchHostPersistence.test-helpers';

it('exposes the raw pre-existing stamp residue while actual display, activation and command digests agree', async () => {
  _setCombatJournalAuthorityModeForTests('off');
  const disk = getNodeCanonicalUnitService();
  jest
    .spyOn(getCanonicalUnitService(), 'getById')
    .mockImplementation((id, options) => disk.getById(id, options));
  const matchId = 'stamp-observability';
  const at = '2026-11-11T00:00:00.000Z';
  const store = new InMemoryMatchStore({ quiet: true });
  const meta: IMatchMeta = {
    matchId,
    hostPlayerId: 'p1',
    playerIds: ['p1', 'p2'],
    sideAssignments: [
      { playerId: 'p1', side: 'player' },
      { playerId: 'p2', side: 'opponent' },
    ],
    status: 'active',
    createdAt: at,
    updatedAt: at,
    config: { mapRadius: 7, turnLimit: 5 },
    unitBootstrap: buildDefaultMatchUnitBootstrap('1v1', 7),
  };
  await store.createMatch(meta);
  const bootstrap = await buildMatchHostBootstrapFromMeta(meta, {
    diceSeed: 42,
  });
  const host = await createPersistedHost(() =>
    ServerMatchHost.create(matchId, store, bootstrap),
  );
  try {
    let ordinal = 0;
    const send = async (intent: IIntent['intent'], side = GameSide.Player) => {
      const frames = await host.handleIntent({
        kind: 'Intent',
        matchId,
        playerId: side === GameSide.Player ? 'p1' : 'p2',
        ts: at,
        intentId: `finite-${++ordinal}`,
        intent,
      });
      expect(frames.filter((frame) => frame.kind === 'Error')).toEqual([]);
    };
    await send({ kind: 'AdvancePhase' });
    for (let index = 0; index < 2; index++) {
      const unitId = getActivePhaseUnitId(host.getSessionForTests())!;
      const unit = host.getSessionForTests().currentState.units[unitId];
      await send(
        {
          kind: 'Move',
          unitId,
          movementType: MovementType.Stationary,
          to: unit.position,
          facing: unit.facing,
        },
        unit.side,
      );
    }
    await send({ kind: 'AdvancePhase' });
    const live = host.getSessionForTests();
    const mirror = buildMirrorSessionGated(await store.getEvents(matchId));
    expect(mirror.kind).toBe('session');
    if (mirror.kind !== 'session')
      throw new Error('Finite production history was blocked');
    const replay = mirror.session;
    // Keep the divergence visible. No stamp split or stamp normalisation is
    // applied to either state, including the retained turnEvents payloads.
    expect(
      replay.currentState.turnEvents.some(
        (event) =>
          (event.payload as { intentId?: string }).intentId !== undefined,
      ),
    ).toBe(true);
    expect(
      live.currentState.turnEvents.some(
        (event) =>
          (event.payload as { intentId?: string }).intentId !== undefined,
      ),
    ).toBe(false);
    expect(JSON.parse(JSON.stringify(replay.currentState))).not.toEqual(
      JSON.parse(JSON.stringify(live.currentState)),
    );
    expect(replay.events.map((event) => formatEvent(event))).toEqual(
      live.events.map((event) => formatEvent(event)),
    );
    expect(generateGameLog(replay)).toBe(generateGameLog(live));
    expect(getActivePhaseUnitId(replay)).toBe(getActivePhaseUnitId(live));
    expect(canAdvancePhase(replay)).toBe(canAdvancePhase(live));
    expect(digestCommandPostState(replay)).toBe(digestCommandPostState(live));
  } finally {
    await host.closeMatch();
    _setCombatJournalAuthorityModeForTests(null);
    jest.restoreAllMocks();
  }
});
