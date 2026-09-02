import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import type { IViewerHistoryLineage } from '@/lib/multiplayer/server/history/ViewerHistoryLineage';

import { MatchHistoryLineage } from '../MatchHistoryLineage';

const FIRST_TRANSITION = {
  fromBranchId: 'root',
  toBranchId: 'candidate-1',
  baseRevision: 2,
  actorRole: 'gm' as const,
  supersededAt: '2026-09-02T00:00:00.000Z',
  invalidatedArtifacts: [
    { artifactKind: 'checkpoint' as const, artifactId: 'ckpt-3' },
  ],
};

const BASE_LINEAGE: IViewerHistoryLineage = {
  effectiveHead: { branchId: 'candidate-1', revision: 2, generation: 2 },
  transitions: [
    FIRST_TRANSITION,
    {
      fromBranchId: 'candidate-1',
      toBranchId: 'candidate-2',
      baseRevision: 3,
      actorRole: 'gm',
      supersededAt: '2026-09-02T01:00:00.000Z',
      invalidatedArtifacts: [],
    },
  ],
};

describe('MatchHistoryLineage', () => {
  it('renders a transition line per transition', () => {
    render(<MatchHistoryLineage lineage={BASE_LINEAGE} />);
    const lines = screen.getAllByTestId('match-history-lineage-transition');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toHaveTextContent('root → candidate-1');
    expect(lines[0]).toHaveTextContent('cutoff 2');
    expect(lines[0]).toHaveTextContent('1 artifacts');
    expect(lines[1]).toHaveTextContent('candidate-1 → candidate-2');
  });

  it('renders the reason only when present', () => {
    const { rerender } = render(<MatchHistoryLineage lineage={BASE_LINEAGE} />);
    expect(screen.queryByTestId('match-history-lineage-reason')).toBeNull();

    rerender(
      <MatchHistoryLineage
        lineage={{
          ...BASE_LINEAGE,
          transitions: [
            {
              ...FIRST_TRANSITION,
              reason: 'authorized rewind to turn 2',
              createdBy: 'host-1',
            },
          ],
        }}
      />,
    );
    expect(
      screen.getByTestId('match-history-lineage-reason'),
    ).toHaveTextContent('authorized rewind to turn 2');
  });
});
