import assert from 'node:assert/strict';
import { once } from 'node:events';

import type { ICampaignEventMessage } from '@/types/multiplayer/Protocol';

import { getSQLiteService } from '@/services/persistence/SQLiteService';

import { bindCampaignSyncConnection } from '../bindCampaignSyncConnection';
import { getCampaignHostRegistry } from '../CampaignHostRegistry';
import { createCampaignSessionMembershipPort } from '../campaignSessionMembershipPort';
import {
  MockWireSocket,
  framesOf,
  quietLogger,
} from './campaignGrantChannel.test-helpers';
import {
  MissionReplySchema,
  openRouteFixture,
  post,
} from './coopMissionCreate.harness';

export const LAUNCH = 'CampaignMissionLaunched';
export class ObservedSocket extends MockWireSocket {
  override send(data: string): void {
    super.send(data);
    const frame = this.sent.at(-1)!;
    this.emit(frame.kind, frame);
    if (frame.kind === 'CampaignEvent') this.emit(frame.event.type, frame);
  }
}
export const launches = (socket: MockWireSocket): ICampaignEventMessage[] =>
  framesOf(socket, 'CampaignEvent').filter(
    (frame) => frame.event.type === LAUNCH,
  );

// Subscribe before triggering; the timeout bounds failure, not scheduling.
export const nextFrame = (
  socket: ObservedSocket,
  kind = LAUNCH,
): Promise<unknown[]> =>
  once(socket, kind, { signal: AbortSignal.timeout(2000) });

type RouteFixture = Awaited<ReturnType<typeof openRouteFixture>>;
export async function openAnnouncementFixture(): Promise<
  Omit<RouteFixture, 'census'> & {
    join: (
      registry?: ReturnType<typeof getCampaignHostRegistry>,
      player?: RouteFixture['guest'],
    ) => Promise<ObservedSocket>;
    create: (request?: RouteFixture['request']) => Promise<string>;
    census: (matchId: string) => Promise<ReturnType<RouteFixture['census']>>;
  }
> {
  const fixture = await openRouteFixture();
  const sockets: ObservedSocket[] = [];
  async function join(
    registry = getCampaignHostRegistry(),
    player = fixture.guest,
  ) {
    const socket = new ObservedSocket();
    sockets.push(socket);
    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: fixture.entry.matchId,
      verifiedPlayerId: player.playerId,
      logger: quietLogger,
      membership: createCampaignSessionMembershipPort(),
    });
    const ready = nextFrame(socket, 'CampaignSnapshot');
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: fixture.entry.matchId,
      ts: new Date().toISOString(),
      playerId: player.playerId,
      role: player === fixture.host ? 'host' : 'guest',
      roomCode: fixture.entry.roomCode ?? undefined,
    });
    await ready;
    return socket;
  }
  async function census(matchId: string) {
    const events = (
      await fixture.entry.host.getEventLog().getCampaignEvents(0)
    ).filter((event) => event.type === LAUNCH);
    const commandId = `campaign-mission-launched:${fixture.entry.campaignId}:${matchId}`;
    const receipts = getSQLiteService()
      .getDatabase()
      .prepare(
        'SELECT command_id FROM event_journal_batches WHERE command_id = ?',
      )
      .all(commandId);
    const result = {
      matches: fixture.census().matches,
      events: events.length,
      receipts: receipts.length,
    };
    process.stdout.write(
      JSON.stringify({ ...result, journal: events, commandId }) + '\n',
    );
    return result;
  }
  async function create(request = fixture.request) {
    const response = await post(request, fixture.host);
    assert.equal(response.status, 201, JSON.stringify(response.body));
    return MissionReplySchema.parse(response.body).missionMatchId;
  }
  return {
    ...fixture,
    join,
    create,
    census,
    close: async (): Promise<void> => {
      sockets.splice(0).forEach((socket) => socket.close());
      await fixture.close();
      process.stdout.write(`P1B2 cleanup removed ${fixture.root}\n`);
    },
  };
}
