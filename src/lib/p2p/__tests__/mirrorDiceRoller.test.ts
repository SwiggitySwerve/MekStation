/**
 * The guest mirror never rolls dice (C-1c PR 0, Option A).
 *
 * A guest applies the host's events; the host is the only roller. A
 * guest session that is handed a roller which rolls anyway would draw
 * from `Math.random` and quietly disagree with the host. This roller
 * makes that a loud, named failure instead.
 */

import {
  createMirrorDiceRoller,
  MIRROR_SESSION_ROLLED_DICE_MESSAGE,
  MirrorSessionRolledDiceError,
} from '../mirrorDiceRoller';

describe('createMirrorDiceRoller', () => {
  it('throws the named error instead of returning a die', () => {
    const roller = createMirrorDiceRoller();
    expect(() => roller()).toThrow(MirrorSessionRolledDiceError);
  });

  it('is a real Error with a stable name a handler can match', () => {
    let caught: unknown;
    try {
      createMirrorDiceRoller()();
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).name).toBe('MirrorSessionRolledDiceError');
    expect((caught as Error).message).toBe(MIRROR_SESSION_ROLLED_DICE_MESSAGE);
  });

  it('never reads Math.random', () => {
    const random = jest.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Math.random reached');
    });
    try {
      expect(() => createMirrorDiceRoller()()).toThrow(
        MirrorSessionRolledDiceError,
      );
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});
