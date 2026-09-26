/**
 * deployPlacementsFor: the one GameCreated deploy rule shared by the
 * engine reducer (applyGameCreated) and the replay hex-map projection.
 *
 * @spec openspec/specs/game-state-management/spec.md (GameCreated Event Handler)
 */

import { Facing, GameSide } from '@/types/gameplay';

import { deployPlacementsFor } from '../initialization';

describe('deployPlacementsFor', () => {
  it('places three Player units at q=-2,-1,0 on r=5 facing North', () => {
    const placements = deployPlacementsFor([
      { side: GameSide.Player },
      { side: GameSide.Player },
      { side: GameSide.Player },
    ]);

    expect(placements).toEqual([
      { position: { q: -2, r: 5 }, facing: Facing.North },
      { position: { q: -1, r: 5 }, facing: Facing.North },
      { position: { q: 0, r: 5 }, facing: Facing.North },
    ]);
  });

  it('counts q per side when the sides interleave', () => {
    const placements = deployPlacementsFor([
      { side: GameSide.Opponent },
      { side: GameSide.Player },
      { side: GameSide.Opponent },
      { side: GameSide.Player },
    ]);

    expect(placements).toEqual([
      { position: { q: -2, r: -5 }, facing: Facing.South },
      { position: { q: -2, r: 5 }, facing: Facing.North },
      { position: { q: -1, r: -5 }, facing: Facing.South },
      { position: { q: -1, r: 5 }, facing: Facing.North },
    ]);
  });

  it('returns no placements for no units', () => {
    expect(deployPlacementsFor([])).toEqual([]);
  });
});
