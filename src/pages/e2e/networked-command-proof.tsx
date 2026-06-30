import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ICommandCommitResult } from '@/types/command-screen';
import type {
  IGameEvent,
  IGameIntent,
  IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IMatchSeat } from '@/types/multiplayer/Lobby';

import { NetworkedGameSurface } from '@/components/multiplayer/NetworkedGameSurface';
import { buildPlayerSafeCommandResultEvent } from '@/lib/command-screen';
import { buildMirrorSession } from '@/lib/multiplayer/mirrorMatchSession';
import { GamePhase, GameSide } from '@/types/gameplay/GameSessionInterfaces';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSessionCore';

type ViewerRole = 'host' | 'guest';

interface IStoredProofState {
  readonly role: ViewerRole;
  readonly events: readonly IGameEvent[];
  readonly intentLog: readonly string[];
}

const STORAGE_KEY = 'mekstation:e2e:networked-command-proof';

const SEATS: readonly IMatchSeat[] = [
  {
    slotId: 'alpha-1',
    side: 'Alpha',
    seatNumber: 1,
    occupant: { playerId: 'pid_host', displayName: 'Host GM' },
    kind: 'human',
    ready: true,
  },
  {
    slotId: 'bravo-1',
    side: 'Bravo',
    seatNumber: 1,
    occupant: { playerId: 'pid_guest', displayName: 'Guest Player' },
    kind: 'human',
    ready: true,
  },
];

const isTestEnv =
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'test' ||
  process.env.NEXT_PUBLIC_E2E_MODE === 'true';

export default function NetworkedCommandProofPage(): React.JSX.Element {
  const baseSession = useMemo(() => buildAuthoritativeSession(), []);
  const [role, setRole] = useState<ViewerRole>('host');
  const [events, setEvents] = useState<readonly IGameEvent[]>(
    baseSession.events,
  );
  const [intentLog, setIntentLog] = useState<readonly string[]>([]);
  const [previewText, setPreviewText] = useState('No host preview yet.');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredState();
    if (stored) {
      setRole(stored.role);
      setEvents(stored.events);
      setIntentLog(stored.intentLog);
      setPreviewText(
        stored.events.length > baseSession.events.length
          ? 'Replay restored from persisted event log.'
          : 'No host preview yet.',
      );
    }
    setHydrated(true);
  }, [baseSession.events.length]);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredState({ role, events, intentLog });
  }, [events, hydrated, intentLog, role]);

  const mirrorSession = useMemo(() => buildMirrorSession(events), [events]);
  const playerId = role === 'host' ? 'pid_host' : 'pid_guest';

  const reset = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setRole('host');
    setEvents(baseSession.events);
    setIntentLog([]);
    setPreviewText('No host preview yet.');
  }, [baseSession.events]);

  const recordIntent = useCallback(
    (intent: IGameIntent): boolean => {
      setIntentLog((current) => current.concat(`${playerId}:${intent.type}`));
      return true;
    },
    [playerId],
  );

  const previewGmCorrection = useCallback(() => {
    setPreviewText('Preview ready: Atlas correction will be published.');
  }, []);

  const approveGmCorrection = useCallback(() => {
    setEvents((current) => {
      if (current.some(isProofCommandResultEvent)) return current;
      return current.concat([makeGmCommandResultEvent(current.length)]);
    });
    setPreviewText('Approved: public command result published.');
  }, []);

  if (!isTestEnv) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <h1>Not Available</h1>
        <p>This page is only available in development or E2E mode.</p>
      </main>
    );
  }

  return (
    <main
      data-testid="networked-command-proof-harness"
      className="min-h-screen space-y-4 bg-slate-950 p-4 text-slate-100"
    >
      <header className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 p-3">
        <span className="text-sm font-semibold">
          Networked Command E2E Proof
        </span>
        <button
          type="button"
          data-testid="network-proof-role-host"
          onClick={() => setRole('host')}
          className={roleButtonClass(role === 'host')}
        >
          Host GM
        </button>
        <button
          type="button"
          data-testid="network-proof-role-guest"
          onClick={() => setRole('guest')}
          className={roleButtonClass(role === 'guest')}
        >
          Guest
        </button>
        <button
          type="button"
          data-testid="network-proof-reset"
          onClick={reset}
          className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
        >
          Reset
        </button>
        <span
          data-testid="network-proof-replay-event-count"
          className="ml-auto rounded border border-slate-700 px-2 py-1 text-xs text-slate-300"
        >
          events:{events.length}
        </span>
      </header>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <NetworkedGameSurface
          mirrorSession={mirrorSession}
          mirrorEvents={events}
          seats={SEATS}
          playerId={playerId}
          hostPlayerId="pid_host"
          status="ready"
          pausedInfo={null}
          closedInfo={null}
          intentError={null}
          onClearIntentError={() => {}}
          onSendGameIntent={recordIntent}
          onPreviewHostGmCorrection={previewGmCorrection}
          onApproveHostGmCorrection={approveGmCorrection}
        />

        <aside className="space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm">
          <div>
            <h2 className="font-semibold text-slate-300">GM Preview</h2>
            <p data-testid="network-proof-preview-status">{previewText}</p>
          </div>
          <div>
            <h2 className="font-semibold text-slate-300">Intent Log</h2>
            <ul data-testid="network-proof-intent-log" className="space-y-1">
              {intentLog.length === 0 ? (
                <li>No intents submitted.</li>
              ) : (
                intentLog.map((entry, index) => (
                  <li key={`${entry}-${index}`}>{entry}</li>
                ))
              )}
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}

function roleButtonClass(active: boolean): string {
  return active
    ? 'rounded border border-sky-500 bg-sky-600/30 px-3 py-1.5 text-sm text-sky-100'
    : 'rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800';
}

function buildAuthoritativeSession(): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 6,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    [
      {
        id: 'player-1',
        name: 'Atlas',
        side: GameSide.Player,
        unitRef: 'atlas-as7-d',
        pilotRef: 'pilot-1',
        gunnery: 4,
        piloting: 5,
      },
      {
        id: 'opponent-1',
        name: 'Marauder',
        side: GameSide.Opponent,
        unitRef: 'marauder-mad-3r',
        pilotRef: 'pilot-2',
        gunnery: 4,
        piloting: 5,
      },
    ],
    { id: 'networked-command-proof', createdAt: '2026-06-30T00:00:00.000Z' },
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player);
  return advancePhase(session);
}

function makeGmCommandResultEvent(sequence: number): IGameEvent {
  const result: ICommandCommitResult<
    { summary: string; changedStateRefs: readonly string[] },
    { reason: string; hiddenNotes: string }
  > = {
    commandId: 'gm.tactical.correct-damage',
    previewId: `preview-damage-${sequence}`,
    domain: 'combat',
    status: 'committed',
    authority: 'host-gm',
    subjectRefs: [{ id: 'player-1', type: 'unit', label: 'Atlas' }],
    publicEffect: {
      summary: 'Atlas armor corrected by the host GM.',
      changedStateRefs: ['unit:player-1:armor'],
    },
    privateMetadata: {
      reason: 'Hidden GM adjudication reason.',
      hiddenNotes: 'Secret objective branch remains private.',
    },
    diagnosticEvent: 'command_gm_intervention_committed',
    committedAt: '2026-06-30T12:00:00.000Z',
  };

  return buildPlayerSafeCommandResultEvent({
    gameId: 'networked-command-proof',
    sequence,
    turn: 3,
    phase: GamePhase.Movement,
    actorId: 'pid_host',
    source: 'host-gm-intervention',
    result,
    timestamp: '2026-06-30T12:00:01.000Z',
  });
}

function isProofCommandResultEvent(event: IGameEvent): boolean {
  const payload = event.payload as { result?: { commandId?: string } };
  return payload.result?.commandId === 'gm.tactical.correct-damage';
}

function readStoredState(): IStoredProofState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<IStoredProofState>;
    if (parsed.role !== 'host' && parsed.role !== 'guest') return null;
    if (!Array.isArray(parsed.events) || !Array.isArray(parsed.intentLog)) {
      return null;
    }
    return {
      role: parsed.role,
      events: parsed.events as readonly IGameEvent[],
      intentLog: parsed.intentLog.filter(
        (entry): entry is string => typeof entry === 'string',
      ),
    };
  } catch {
    return null;
  }
}

function writeStoredState(state: IStoredProofState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
