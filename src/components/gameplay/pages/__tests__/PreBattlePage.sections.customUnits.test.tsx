import { render, screen, waitFor } from '@testing-library/react';

import type { IForceReference } from '@/types/encounter';
import type { IForce } from '@/types/force';

import { ForceCard } from '@/components/gameplay/pages/PreBattlePage.sections';

const mockInitialize = jest.fn();
const mockGetUnitById = jest.fn();
const mockGetCanonicalUnitIndex = jest.fn();

jest.mock('@/services/units/UnitSearchService', () => ({
  unitSearchService: {
    initialize: mockInitialize,
    getUnitById: mockGetUnitById,
  },
}));

jest.mock('@/services/units/CanonicalUnitService', () => ({
  getCanonicalUnitService: () => ({
    getIndex: mockGetCanonicalUnitIndex,
  }),
}));

describe('pre-battle ForceCard custom-unit names', () => {
  beforeEach(() => {
    mockInitialize.mockReset();
    mockGetUnitById.mockReset();
    mockGetCanonicalUnitIndex.mockReset();
    mockInitialize.mockResolvedValue(undefined);
    mockGetCanonicalUnitIndex.mockResolvedValue([]);
  });

  it('resolves an assigned custom unit through the merged unit lookup', async () => {
    mockGetUnitById.mockReturnValue({
      id: 'custom-1',
      name: 'Custom Catapult C-1',
    });

    render(
      <ForceCard
        title="Player Force"
        forceRef={
          {
            forceId: 'force-player',
            forceName: 'Alpha Lance',
            totalBV: 1_000,
            unitCount: 1,
          } as IForceReference
        }
        force={
          {
            assignments: [
              {
                id: 'assignment-1',
                unitId: 'custom-1',
                pilotId: null,
                position: 'lead',
                slot: 1,
              },
            ],
          } as unknown as IForce
        }
        side="player"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Custom Catapult C-1')).toBeInTheDocument();
    });
    expect(screen.queryByText('Slot 1')).not.toBeInTheDocument();
    expect(mockInitialize).toHaveBeenCalled();
    expect(mockGetUnitById).toHaveBeenCalledWith('custom-1');
  });
});
