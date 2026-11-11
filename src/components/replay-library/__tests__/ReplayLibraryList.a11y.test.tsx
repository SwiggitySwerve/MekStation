import { render, screen, cleanup } from '@testing-library/react';
import { axe } from 'jest-axe';

import { GameSide, ReplaySource } from '@/types/gameplay';

import { ReplayRow } from '../ReplayLibraryList';

afterEach(cleanup);
it.each([null, 0, 1197])(
  'announces BV %s without accessibility violations',
  async (bvTotal) => {
    const entry = {
      id: 'bv-row',
      replaySource: ReplaySource.Encounter as const,
      path: 'encounter/bv-row.jsonl',
      createdAt: '2026-11-11',
      turns: 1,
      winner: GameSide.Player,
      bvTotal,
      encounterId: 'encounter',
      encounterName: 'Battle',
      templateType: null,
      playerForceSummary: 'Player',
      opponentSummary: 'Opponent',
    };
    const { container } = render(
      <ReplayRow entry={entry} onWatch={() => undefined} />,
    );
    expect(screen.getByTestId('replay-bv-total')).toHaveTextContent(
      bvTotal === null ? 'not recorded' : String(bvTotal),
    );
    expect((await axe(container)).violations).toEqual([]);
  },
);
