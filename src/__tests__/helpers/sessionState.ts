/**
 * Test-setup edits of a game session's state that never mutate the folded
 * state in place (Jest deep-freezes it, see gameState/foldRevision.ts). The
 * replaced state carries no fold stamp, so the next append refolds from the
 * log and drops the edit, exactly as an in-place edit was dropped before P1.
 */
import type { InteractiveSession } from '@/engine/InteractiveSession';
import type {
  IGameSession,
  IGameState,
  IUnitGameState,
} from '@/types/gameplay';

export function withGameState(
  session: IGameSession,
  update: (state: IGameState) => IGameState,
): IGameSession {
  return { ...session, currentState: update(session.currentState) };
}

export function withUnitState(
  session: IGameSession,
  unitId: string,
  unit: IUnitGameState,
): IGameSession {
  return withGameState(session, (state) => ({
    ...state,
    units: { ...state.units, [unitId]: unit },
  }));
}

/** A session whose unit lacks the named own fields (e.g. a recovered unit with no side). */
export function withUnitFieldsRemoved(
  session: IGameSession,
  unitId: string,
  fields: readonly (keyof IUnitGameState)[],
): IGameSession {
  const unit: Record<string, unknown> = {
    ...session.currentState.units[unitId],
  };
  for (const field of fields) delete unit[field];
  return withUnitState(session, unitId, unit as unknown as IUnitGameState);
}

/** Replace an InteractiveSession's held state; returns the new session. */
export function replaceInteractiveState(
  interactive: InteractiveSession,
  update: (state: IGameState) => IGameState,
): IGameSession {
  const context = Reflect.get(interactive, 'runtimeContext') as {
    setSession: (session: IGameSession) => void;
  };
  context.setSession(withGameState(interactive.getSession(), update));
  return interactive.getSession();
}
