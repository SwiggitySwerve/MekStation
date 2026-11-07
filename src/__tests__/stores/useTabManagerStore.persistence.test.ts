import { act } from '@testing-library/react';

import { clearAllStores, getUnitStore } from '@/stores/unitStoreRegistry';
import {
  UNIT_TEMPLATES,
  useTabManagerStore,
} from '@/stores/useTabManagerStore';
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
      isLoading: true,
      isNewTabModalOpen: false,
    });
  });

  afterEach(() => {
    clearAllStores(true);
    localStorage.clear();
  });

  it('recovers corrupt JSON, removes only the bad key, and allows a new tab', async () => {
    useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0]);
    localStorage.setItem('megamek-tab-manager', '{broken');
    localStorage.setItem('unrelated-cache', 'keep');

    await useTabManagerStore.persist.rehydrate();

    expect(useTabManagerStore.getState()).toMatchObject({
      tabs: [],
      activeTabId: null,
      isLoading: false,
    });
    expect(localStorage.getItem('megamek-tab-manager')).toBeNull();
    expect(localStorage.getItem('unrelated-cache')).toBe('keep');

    const id = useTabManagerStore.getState().createTab(UNIT_TEMPLATES[1]);
    expect(useTabManagerStore.getState().activeTabId).toBe(id);
    expect(getUnitStore(id)).toBeDefined();
    await useTabManagerStore.persist.rehydrate();
    expect(useTabManagerStore.getState().tabs.map((tab) => tab.id)).toEqual([
      id,
    ]);
  });

  it('discards null tabs and clears the active selection when none remain', async () => {
    localStorage.setItem(
      'megamek-tab-manager',
      JSON.stringify({
        state: { tabs: [null], activeTabId: TAB_ID },
        version: 0,
      }),
    );

    await useTabManagerStore.persist.rehydrate();

    expect(useTabManagerStore.getState()).toMatchObject({
      tabs: [],
      activeTabId: null,
      isLoading: false,
    });
    await useTabManagerStore.persist.rehydrate();
    expect(useTabManagerStore.getState().tabs).toEqual([]);
  });

  it('preserves valid tabs and their active unit alongside null entries', async () => {
    localStorage.setItem(
      'megamek-tab-manager',
      JSON.stringify({
        state: {
          tabs: [
            null,
            {
              id: TAB_ID,
              name: 'Surviving Mek',
              tonnage: 50,
              techBase: TechBase.INNER_SPHERE,
              unitType: UnitType.BATTLEMECH,
              lastSubTab: 'armor',
            },
            null,
          ],
          activeTabId: TAB_ID,
        },
        version: 0,
      }),
    );

    await useTabManagerStore.persist.rehydrate();

    expect(useTabManagerStore.getState()).toMatchObject({
      tabs: [{ id: TAB_ID, name: 'Surviving Mek', lastSubTab: 'armor' }],
      activeTabId: TAB_ID,
      isLoading: false,
    });
    expect(getUnitStore(TAB_ID)?.getState().name).toBe('Surviving Mek');
  });

  it('finishes hydration when there is no saved entry', async () => {
    localStorage.removeItem('megamek-tab-manager');

    await useTabManagerStore.persist.rehydrate();

    expect(useTabManagerStore.getState()).toMatchObject({
      tabs: [],
      activeTabId: null,
      isLoading: false,
    });
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
