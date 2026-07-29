import { act } from '@testing-library/react';

import { clearAllStores, getUnitStore } from '@/stores/unitStoreRegistry';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

const TAB_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('useTabManagerStore persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    clearAllStores(true);
    useTabManagerStore.setState({
      tabs: [],
      activeTabId: null,
      isLoading: false,
      isNewTabModalOpen: false,
    });
  });

  afterEach(() => {
    clearAllStores(true);
    localStorage.clear();
  });

  it('canonicalizes a legacy IS tech base before hydrating the active unit', async () => {
    localStorage.setItem(
      'megamek-tab-manager',
      JSON.stringify({
        state: {
          tabs: [
            {
              id: TAB_ID,
              name: 'Legacy Mek',
              tonnage: 50,
              techBase: 'IS',
              unitType: UnitType.BATTLEMECH,
            },
          ],
          activeTabId: TAB_ID,
        },
        version: 0,
      }),
    );

    await act(async () => {
      await useTabManagerStore.persist.rehydrate();
    });

    expect(useTabManagerStore.getState().tabs[0].techBase).toBe(
      TechBase.INNER_SPHERE,
    );
    expect(getUnitStore(TAB_ID)?.getState().techBase).toBe(
      TechBase.INNER_SPHERE,
    );
  });
});
