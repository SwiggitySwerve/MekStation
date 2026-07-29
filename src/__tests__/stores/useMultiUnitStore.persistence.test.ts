import { UNIT_TEMPLATES, useMultiUnitStore } from '@/stores/useMultiUnitStore';
import { TechBase } from '@/types/enums/TechBase';

describe('useMultiUnitStore persistence', () => {
  beforeEach(() => {
    useMultiUnitStore.setState({
      tabs: [],
      activeTabId: null,
      isLoading: false,
      isNewTabModalOpen: false,
    });
  });

  it('canonicalizes a legacy IS tech base when a complete tab rehydrates', () => {
    // Given
    useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
    const currentState = useMultiUnitStore.getState();
    const canonicalTab = currentState.tabs[0];
    const legacyTab = { ...canonicalTab, techBase: 'IS' };
    const merge = useMultiUnitStore.persist.getOptions().merge;
    if (!merge) {
      throw new Error(
        'Expected the persisted store to define a merge function',
      );
    }

    // When
    const rehydrated = merge(
      { tabs: [legacyTab], activeTabId: legacyTab.id },
      currentState,
    );

    // Then
    expect(rehydrated.tabs[0].techBase).toBe(TechBase.INNER_SPHERE);
  });
});
