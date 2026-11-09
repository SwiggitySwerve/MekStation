/**
 * The successful host day action carries pipeline money into the co-op journal
 * through its full-save checkpoint. The clock-only intent is not the whole
 * operation: a later spend must use the balance adopted from that checkpoint.
 *
 * Real authority/session, item route, SQLite, mounted host consumer and shared
 * guest projection; transport/fetch are in-process adapters, not TCP/browser
 * proof. The closure row uses the existing synthetic fulfillment seam and does
 * not launch a co-op mission.
 *
 * @spec openspec/specs/coop-campaign-sync/spec.md
 */
import { renderHook, waitFor } from '@testing-library/react';

import type { ICampaignAuthoritativeFold } from '@/lib/campaign/coop/campaignAuthoritativeFold';
import type {
  CampaignAppliedOutcome,
  CampaignSyncFrameHandler,
  ICampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { useCampaignApplicationConsumer } from '@/components/campaign/coop/useCampaignApplicationConsumer';
import { authoritativeStateFromSerializedCampaign } from '@/lib/campaign/authority/campaignSourceGenesis';
import { projectAuthoritativeStateOntoCampaign } from '@/lib/campaign/coop/campaignMirrorProjection';
import { registerCampaignSyncTransport } from '@/lib/campaign/coop/campaignSyncTransport';
import { storeCoopCampaignToken } from '@/lib/campaign/coop/coopCampaignAuthTokenStore';
import { JournalCampaignEventStore } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { campaignEventWireFrame } from '@/lib/multiplayer/server/campaignEventWireFrame';
import {
  _resetCampaignHostRegistry,
  getCampaignHostRegistry,
} from '@/lib/multiplayer/server/CampaignHostRegistry';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
import { readCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import {
  __resetCampaignPersistenceCoordinationForTests,
  useCampaignPersistenceStore,
} from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import {
  createGuestCoopSession,
  createHostCoopSession,
} from '@/types/campaign/CoopSession';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { createContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import { createPaymentTerms } from '@/types/campaign/PaymentTerms';
import { PilotStatus, PilotType } from '@/types/pilot/PilotInterfaces';

import {
  bearerOf,
  callId,
  eventTypes,
  intentOf,
  journal,
  mintIdentity,
  replayed,
  useTempCampaignDatabase,
} from '../api/campaigns/campaignJournalEffectsFixture';

const MATCH_ID = 'match-day-ledger';
const ROOM_CODE = 'ABC234';
const DAY = '3025-07-08T00:00:00.000Z';
const START_BALANCE = 1_000_000;
const SPEND = 100_000;

function savedRecord(id: string): SerializedCampaign {
  const result = readCampaign(id);
  if (result.kind !== 'ok') throw new Error('Campaign record is missing');
  return result.record;
}

function activeCampaign(): ICampaign {
  const campaign = useCampaignStore().getState().campaign;
  if (!campaign) throw new Error('Active campaign is missing');
  return campaign;
}

function browserBalance(key: string): number {
  const raw = localStorage.getItem(key);
  if (!raw) throw new Error(`Browser record ${key} is missing`);
  const value = JSON.parse(raw) as {
    state: {
      campaign?: { finances: { balance: number } };
      finances?: { balance: number };
    };
  };
  const finances = value.state.campaign?.finances ?? value.state.finances;
  if (!finances) throw new Error(`Browser record ${key} has no finances`);
  return finances.balance;
}

function seedSalary(id: string): void {
  const entry: ICampaignRosterEntry = {
    pilotId: 'salary-pilot',
    pilotName: 'Salary Pilot',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    hireDate: new Date('3020-01-01T00:00:00.000Z'),
    injuries: [],
  };
  useCampaignRosterStore.setState({ campaignId: id, pilots: [entry] });
  usePilotStore.setState({
    pilots: [
      {
        id: entry.pilotId,
        name: entry.pilotName,
        type: PilotType.Persistent,
        status: PilotStatus.Active,
        skills: { gunnery: 4, piloting: 5 },
        wounds: 0,
        abilities: [],
        awards: [],
        createdAt: DAY,
        updatedAt: DAY,
      },
    ],
  });
}

describe('successful co-op host day advance and full-save financial checkpoint', () => {
  const dispose: Array<() => void> = [];
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetCampaignStore();
    useCampaignPersistenceStore.getState().reset();
    __resetCampaignPersistenceCoordinationForTests();
    useCampaignMirrorStore.getState().reset();
    useCampaignRosterStore.setState({
      campaignId: null,
      units: [],
      pilots: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    });
    usePilotStore.setState({ pilots: [] });
  });
  afterEach(() => {
    dispose
      .splice(0)
      .reverse()
      .forEach((off) => off());
    _resetCampaignHostRegistry();
    useCampaignMirrorStore.getState().reset();
    useCampaignPersistenceStore.getState().reset();
    resetCampaignStore();
  });
  useTempCampaignDatabase('coop-day-ledger-');

  it.each([
    { kind: 'daily salary', expected: 999_950, transactionAmount: 50 },
    {
      kind: 'synthetic contract closure',
      expected: 1_500_000,
      transactionAmount: 500_000,
    },
  ])(
    'preserves $kind through delivery, the next spend and reload',
    async ({ kind, expected, transactionAmount }) => {
      const bearer = await bearerOf(await mintIdentity('day-ledger-host'));
      const store = useCampaignStore();
      const id = store.getState().createCampaign(
        'Day ledger',
        'mercenary',
        {
          startingFunds: START_BALANCE,
          useRoleBasedSalaries: false,
          payForMaintenance: false,
        },
        { coopSession: createHostCoopSession(ROOM_CODE, MATCH_ID) },
      );
      const contract = createContract({
        id: 'closure-contract',
        name: 'Closure seam',
        employerId: 'house-davion',
        targetId: 'house-liao',
        status: MissionStatus.SUCCESS,
        paymentTerms: createPaymentTerms({
          basePayment: new Money(500_000),
          successPayment: Money.ZERO,
        }),
      });
      const closure = kind === 'synthetic contract closure';
      const campaign = {
        ...activeCampaign(),
        currentDate: new Date(DAY),
        campaignStartDate: new Date('3025-07-01T00:00:00.000Z'),
        personnelMarket: [],
        ...(closure
          ? {
              missions: new Map([[contract.id, contract]]),
              pendingFulfilledContractIds: [contract.id],
            }
          : {}),
      };
      store.setState({ campaign });
      if (closure)
        store.getState().missionsStore?.getState().addMission(contract);
      else seedSalary(id);
      storeCoopCampaignToken({
        matchId: MATCH_ID,
        playerId: bearer.playerId,
        wireToken: bearer.wire,
        displayName: 'Host',
      });
      jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
        if (String(input) !== `/api/campaigns/${id}`)
          throw new Error(`Unexpected fetch ${String(input)}`);
        const answer = await callId(
          init?.method === 'PUT' ? 'PUT' : 'GET',
          id,
          init?.body ? JSON.parse(String(init.body)) : undefined,
          bearer.wire,
        );
        return {
          ok: answer.status === 200,
          status: answer.status,
          json: async () => answer.json,
        } as Response;
      });
      const initial = await useCampaignPersistenceStore
        .getState()
        .saveCampaign();
      if (initial.status !== 'saved') throw new Error('Initial save failed');
      const entry = await getCampaignHostRegistry().register(MATCH_ID, {
        campaignId: id,
        hostPlayerId: bearer.playerId,
        roomCode: ROOM_CODE,
        state: authoritativeStateFromSerializedCampaign(initial.record),
      });
      const events = await new JournalCampaignEventStore(journal()).getEvents(
        id,
        0,
      );
      const baseline = events.at(-1);
      if (!baseline) throw new Error('Initial journal snapshot is missing');
      const fold = {
        current: {
          state: entry.host.getState(),
          lastSequence: baseline.sequence,
          launchFacts: [],
        } satisfies ICampaignAuthoritativeFold,
      };
      const mirror = useCampaignMirrorStore.getState();
      mirror.beginMirror(
        { hostPeerId: bearer.playerId, guestPeerId: 'guest' },
        'guest',
      );
      mirror.applySnapshot(baseline);
      let guest: ICampaign = {
        ...campaign,
        coopSession: createGuestCoopSession(MATCH_ID, ROOM_CODE),
      };
      const delivered: ICampaignEvent[] = [];
      const applied: CampaignAppliedOutcome[] = [];
      const handlers = new Set<CampaignSyncFrameHandler>();
      const errors = new Set<(error: unknown) => void>();
      const pending: Array<Promise<void>> = [];
      const transport: ICampaignSyncTransport = {
        campaignId: id,
        matchId: MATCH_ID,
        playerId: bearer.playerId,
        role: 'host',
        sendHostIntent: (intent) => {
          if (intent.kind === 'ReconcileBattle')
            throw new Error('No co-op mission in this fixture');
          pending.push(
            entry.host
              .applyHostIntent(intent)
              .then((result) => {
                if (!result.ok) throw new Error(result.reason);
              })
              .catch((error: unknown) => {
                errors.forEach((handler) => handler(error));
              }),
          );
        },
        sendProposal: jest.fn(),
        sendDecision: jest.fn(),
        sendParticipation: jest.fn(),
        onFrame: (handler) => {
          handlers.add(handler);
          return () => handlers.delete(handler);
        },
        onError: (handler) => {
          errors.add(handler);
          return () => errors.delete(handler);
        },
        close: jest.fn(),
        lastSeq: () => fold.current.lastSequence,
        confirmApplied: (_offer, outcome) => {
          applied.push(outcome);
          return { status: 'ack-sent' };
        },
      };
      dispose.push(registerCampaignSyncTransport(transport));
      const mounted = renderHook(() => useCampaignApplicationConsumer());
      const consumer = mounted.result.current.bind({
        transport,
        campaignId: id,
        store,
        role: 'host',
        fold,
      });
      dispose.push(() => {
        consumer.dispose();
        mounted.unmount();
      });
      dispose.push(
        entry.syncSession.attachLiveParticipant((event) => {
          delivered.push(event);
          const frame = campaignEventWireFrame(MATCH_ID, event);
          consumer.consume({
            ...frame,
            appliedView: {
              viewId: 'host-view',
              receiptId: `receipt-${event.sequence}`,
              previousReceiptId: `receipt-${event.sequence - 1}`,
            },
          });
          handlers.forEach((handler) => handler(frame));
        }, bearer.playerId),
      );
      dispose.push(
        entry.syncSession.attachLiveParticipant((event) => {
          const next =
            event.type === 'CampaignSnapshotPublished'
              ? useCampaignMirrorStore.getState().applySnapshot(event)
              : useCampaignMirrorStore.getState().applyEvent(event);
          const projected = projectAuthoritativeStateOntoCampaign(
            guest,
            id,
            next?.state,
          );
          if (projected) guest = projected;
        }, 'guest'),
      );
      // The queue is a synthetic compatibility seam, restored before the real
      // action captures its pre-day campaign. No mission is played here.
      store.setState({ campaign });
      const report = await store.getState().advanceDay();
      await Promise.all(pending);
      await waitFor(() => expect(applied).toHaveLength(delivered.length));
      expect(report?.campaign.finances.balance.amount).toBe(expected);
      expect(entry.host.getState().balance).toBe(expected);
      expect(activeCampaign().finances.balance.amount).toBe(expected);
      expect(guest.finances.balance.amount).toBe(expected);
      expect(useCampaignMirrorStore.getState().campaign?.balance).toBe(
        expected,
      );
      expect(savedRecord(id).body.finances.balance).toBe(expected);
      expect((await replayed(id)).balance).toBe(expected);
      expect(browserBalance('campaign-store')).toBe(expected);
      expect(browserBalance(`campaign-${id}`)).toBe(expected);
      expect(
        activeCampaign().finances.transactions.map((tx) => tx.amount.amount),
      ).toEqual([transactionAmount]);
      expect(eventTypes(id)).toEqual([
        'CampaignSnapshotPublished',
        'CampaignDayAdvanced',
        'CampaignSnapshotPublished',
      ]);
      expect(applied.every((outcome) => outcome.status === 'applied')).toBe(
        true,
      );

      const spend = await entry.host.applyHostIntent(
        intentOf(id, 'spend-after-day', 'SpendFunds', {
          amount: SPEND,
          reason: 'Checkpoint regression',
        }),
      );
      await waitFor(() => expect(applied).toHaveLength(delivered.length));
      expect(spend.ok).toBe(true);
      expect(entry.host.getState().balance).toBe(expected - SPEND);
      expect(activeCampaign().finances.balance.amount).toBe(expected - SPEND);
      expect(guest.finances.balance.amount).toBe(expected - SPEND);
      expect(savedRecord(id).body.finances.balance).toBe(expected - SPEND);
      expect((await replayed(id)).balance).toBe(expected - SPEND);
      resetCampaignStore();
      expect(activeCampaign().finances.balance.amount).toBe(expected - SPEND);
      expect(
        await useCampaignPersistenceStore.getState().loadCampaign(id),
      ).toBe(true);
      expect(activeCampaign().finances.balance.amount).toBe(expected - SPEND);
      const reopened = new CampaignMatchHost({
        campaignId: id,
        hostPlayerId: bearer.playerId,
        eventStore: new JournalCampaignEventStore(journal()),
        initialState: authoritativeStateFromSerializedCampaign(savedRecord(id)),
      });
      await reopened.open();
      expect(reopened.getState().balance).toBe(expected - SPEND);
      reopened.close();
    },
  );
});
