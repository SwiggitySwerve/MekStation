import { GameState } from '../useGameStatePersistence';

export const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

const originalLocalStorage = window.localStorage;

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

export const mockBeforeUnload = jest.fn();
Object.defineProperty(window, 'addEventListener', {
  value: jest.fn((event: string, callback: (e: Event) => void) => {
    if (event === 'beforeunload') {
      mockBeforeUnload.mockImplementation(() =>
        callback(new Event('beforeunload')),
      );
    }
  }),
});

Object.defineProperty(window, 'removeEventListener', {
  value: jest.fn(),
});

export const mockStorageKey = 'test-game-state';
export const mockState: GameState = {
  recentUnitIds: ['unit-1', 'unit-2'],
  editorState: {
    activeTab: 'structure',
    selectedLocation: 'Center Torso',
    panelState: { armor: true, equipment: false },
  },
};

export const originalSetItem = localStorageMock.setItem;

export const setupGameStatePersistenceTest = () => {
  localStorage.clear();
  jest.clearAllMocks();
  localStorageMock.setItem = originalSetItem;
};

export const restoreGameStatePersistenceTest = () => {
  Object.defineProperty(window, 'localStorage', {
    value: originalLocalStorage,
    writable: true,
  });
};
