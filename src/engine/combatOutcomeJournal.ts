import { z } from 'zod';

import {
  GameEventType,
  GameStatus,
  type IGameEvent,
  type IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';

const identitySchema = z.object({
  matchId: z.string().min(1),
  terminalEventId: z.string().min(1),
  terminalSequence: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
});

export const pendingOutcomePublicationSchema = identitySchema
  .extend({ state: z.literal('pending') })
  .strict();

export const outcomePublicationRecordSchema = z.discriminatedUnion('state', [
  pendingOutcomePublicationSchema,
  identitySchema
    .extend({
      state: z.literal('acknowledged'),
      acknowledgedAt: z.iso.datetime(),
    })
    .strict(),
]);

export type IOutcomePublicationRecord = z.infer<
  typeof outcomePublicationRecordSchema
>;
export type IPendingOutcomePublication = Extract<
  IOutcomePublicationRecord,
  { state: 'pending' }
>;
export type IAcknowledgedOutcomePublication = Extract<
  IOutcomePublicationRecord,
  { state: 'acknowledged' }
>;

export interface IOutcomePublicationStorage {
  getOutcomePublication(
    matchId: string,
    terminalEventId: string,
  ): Promise<IOutcomePublicationRecord | undefined>;
  acknowledgeOutcomePublication?(
    matchId: string,
    terminalEventId: string,
  ): Promise<void>;
}
type JournalEntry =
  | IOutcomePublicationRecord
  | (Omit<IPendingOutcomePublication, 'state'> & {
      readonly state: 'dispatching';
    });

export function getSessionTerminalEvent(
  session: IGameSession,
): IGameEvent | undefined {
  if (session.currentState.status !== GameStatus.Completed) return undefined;
  return session.events.find((event) => event.type === GameEventType.GameEnded);
}

export function createPendingOutcomePublication(
  matchId: string,
  event: IGameEvent,
): IPendingOutcomePublication {
  return {
    matchId,
    terminalEventId: event.id,
    terminalSequence: event.sequence,
    createdAt: event.timestamp,
    state: 'pending',
  };
}

function entryKey(
  entry: Pick<IPendingOutcomePublication, 'matchId' | 'terminalEventId'>,
): string {
  return JSON.stringify([entry.matchId, entry.terminalEventId]);
}

/** Publication transitions are separate from the deterministic gameplay log. */
export class CombatOutcomeJournal {
  private readonly entries = new Map<string, JournalEntry>();

  adopt(session: IGameSession, record?: IOutcomePublicationRecord): void {
    const terminal = getSessionTerminalEvent(session);
    if (!terminal) return;
    const pending = createPendingOutcomePublication(
      session.matchId ?? session.id,
      terminal,
    );
    if (
      record &&
      (entryKey(record) !== entryKey(pending) ||
        record.terminalSequence !== terminal.sequence)
    ) {
      throw new Error(
        'Outcome publication receipt does not match the terminal event',
      );
    }
    // No receipt means historical completion. Never replay unknown old delivery.
    this.entries.set(
      entryKey(pending),
      record ?? {
        ...pending,
        state: 'acknowledged',
        acknowledgedAt: terminal.timestamp,
      },
    );
  }

  hasAcknowledged(session: IGameSession): boolean {
    const terminal = getSessionTerminalEvent(session);
    if (!terminal) return false;
    return (
      this.entries.get(
        entryKey(
          createPendingOutcomePublication(
            session.matchId ?? session.id,
            terminal,
          ),
        ),
      )?.state === 'acknowledged'
    );
  }

  begin(session: IGameSession): IPendingOutcomePublication | null {
    const terminal = getSessionTerminalEvent(session);
    if (!terminal) return null;
    const pending = createPendingOutcomePublication(
      session.matchId ?? session.id,
      terminal,
    );
    const key = entryKey(pending);
    const existing = this.entries.get(key);
    if (existing && existing.state !== 'pending') return null;
    this.entries.set(key, { ...pending, state: 'dispatching' });
    return pending;
  }

  acknowledge(
    pending: IPendingOutcomePublication,
  ): IAcknowledgedOutcomePublication {
    if (this.entries.get(entryKey(pending))?.state !== 'dispatching') {
      throw new Error('Outcome publication is not being dispatched');
    }
    const entry: IAcknowledgedOutcomePublication = {
      ...pending,
      state: 'acknowledged',
      acknowledgedAt: new Date().toISOString(),
    };
    this.entries.set(entryKey(pending), entry);
    return entry;
  }

  retry(pending: IPendingOutcomePublication): void {
    this.entries.set(entryKey(pending), pending);
  }
}
