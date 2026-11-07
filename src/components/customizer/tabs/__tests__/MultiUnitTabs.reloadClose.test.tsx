import { act, fireEvent, render, screen, within } from '@testing-library/react';

import {
  clearAllStores,
  createAndRegisterUnit,
  getAllUnitIds,
  getUnitStore,
} from '@/stores/unitStoreRegistry';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { MultiUnitTabs } from '../MultiUnitTabs';

const router = { push: jest.fn(), query: {} };
jest.mock('next/router', () => ({ useRouter: () => router }));
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => null,
}));
jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));
jest.mock('@/hooks/useUnitValidation', () => ({
  useUnitValidation: () => ({ isValid: true }),
}));
jest.mock('@/components/customizer/dialogs/SaveUnitDialog', () => ({
  SaveUnitDialog: () => null,
}));
jest.mock('@/components/customizer/dialogs/UnitLoadDialog', () => ({
  UnitLoadDialog: () => null,
}));
jest.mock('../NewTabModal', () => ({ NewTabModal: () => null }));
jest.mock('../SavedHistoryDialog', () => ({ SavedHistoryDialog: () => null }));

beforeEach(() => {
  localStorage.clear();
  clearAllStores();
  useTabManagerStore.setState({
    tabs: [],
    activeTabId: null,
    isLoading: false,
  });
});
afterEach(() => {
  clearAllStores();
  localStorage.clear();
});

it('asks before closing either dirty background tab after reloading three dirty tabs', async () => {
  const tabs = [1, 2, 3].map((index) => {
    const id = `00000000-0000-4000-8000-00000000000${index}`;
    const store = createAndRegisterUnit({
      id,
      name: `Dirty ${index}`,
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
    });
    store.setState({ isModified: true, year: 3040 + index });
    return {
      id,
      name: store.getState().name,
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
      unitType: UnitType.BATTLEMECH,
    };
  });
  useTabManagerStore.setState({ tabs, activeTabId: tabs[0].id });
  const persistedTabs = localStorage.getItem('megamek-tab-manager')!;
  // A page reload loses the registries. Tab rehydration restores only the active store.
  clearAllStores();
  useTabManagerStore.setState({ tabs: [], activeTabId: null, isLoading: true });
  localStorage.setItem('megamek-tab-manager', persistedTabs);
  await act(async () => {
    await useTabManagerStore.persist.rehydrate();
  });
  expect(getAllUnitIds()).toEqual([tabs[0].id]);
  render(
    <MultiUnitTabs>
      <div>Editor</div>
    </MultiUnitTabs>,
  );

  for (const tab of tabs.slice(1)) {
    expect(getUnitStore(tab.id)).toBeUndefined();
    const key = `megamek-unit-${tab.id}`;
    const draft = localStorage.getItem(key);
    expect(draft).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: `Close ${tab.name}` }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText('Save Unit Before Proceeding?'),
    ).toBeVisible();
    expect(within(dialog).getByText(`Unit: ${tab.name}`)).toBeVisible();
    expect(useTabManagerStore.getState().tabs).toHaveLength(3);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(key)).toBe(draft);
    expect(getUnitStore(tab.id)).toBeUndefined();
  }
});
