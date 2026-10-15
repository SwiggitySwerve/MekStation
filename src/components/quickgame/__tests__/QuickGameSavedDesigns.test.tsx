import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import type {
  IQuickGameInstance,
  IQuickGameUnitRequest,
} from '@/types/quickgame';

import {
  listQuickGameSavedDesigns,
  loadQuickGameSavedDesign,
} from '@/services/units/quickGameSavedDesigns';
import {
  createQuickGameInstance,
  createQuickGameUnit,
  QuickGameStep,
} from '@/types/quickgame';

import { UnitSelectionStep } from '../QuickGameSetupUnitSelection';

jest.mock('@/services/units/quickGameSavedDesigns');
const mockAddUnit = jest.fn();
const mockState = {
  game: null as IQuickGameInstance | null,
  addUnit: mockAddUnit,
  removeUnit: jest.fn(),
  updateUnitSkills: jest.fn(),
  nextStep: jest.fn(),
};
jest.mock('@/stores/useQuickGameStore', () => ({
  useQuickGameSelector: (select: (state: typeof mockState) => unknown) =>
    select(mockState),
  useQuickGameStore: { getState: () => mockState },
}));

const list = jest.mocked(listQuickGameSavedDesigns);
const load = jest.mocked(loadQuickGameSavedDesign);
const saved = {
  id: 'custom-warhammer',
  name: 'Warhammer Test',
  tonnage: 70,
  unitType: 'BattleMech',
  currentVersion: 2,
};
const request = {
  sourceUnitId: saved.id,
  name: saved.name,
  tonnage: 70,
  chassis: 'Warhammer',
  variant: 'Test',
  bv: 1334,
  maxArmor: { left_arm: 20 },
  maxStructure: { left_arm: 11 },
};

beforeEach(() => {
  jest.clearAllMocks();
  list.mockReset();
  load.mockReset();
  mockState.game = createQuickGameInstance();
  list.mockResolvedValue([saved]);
  load.mockResolvedValue(request);
});

function deferredLoad() {
  let resolve!: (value: IQuickGameUnitRequest) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<IQuickGameUnitRequest>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  load.mockReturnValueOnce(promise);
  return { resolve, reject };
}

async function startSavedLoad() {
  const button = await screen.findByRole('button', {
    name: 'Add saved design Warhammer Test',
  });
  await act(async () => fireEvent.click(button));
}

it('blocks progression with an existing stock unit while a saved design loads', async () => {
  const game = mockState.game!;
  mockState.game = {
    ...game,
    playerForce: { ...game.playerForce, units: [createQuickGameUnit(request)] },
  };
  const pending = deferredLoad();
  render(<UnitSelectionStep />);
  await startSavedLoad();
  const next = screen.getByRole('button', {
    name: 'Continue to Configuration',
  });
  expect(next).toBeDisabled();
  fireEvent.click(next);
  await startSavedLoad();
  expect(mockState.nextStep).not.toHaveBeenCalled();
  expect(load).toHaveBeenCalledTimes(1);
  await act(async () => pending.resolve(request));
  expect(mockAddUnit).toHaveBeenCalledTimes(1);
  expect(next).toBeEnabled();
});

it('discards a saved load that completes after unmount', async () => {
  const pending = deferredLoad();
  const view = render(<UnitSelectionStep />);
  await startSavedLoad();
  view.unmount();
  await act(async () => pending.resolve(request));
  expect(mockAddUnit).not.toHaveBeenCalled();
});

it('discards completion after navigation even before the selection view unmounts', async () => {
  const pending = deferredLoad();
  render(<UnitSelectionStep />);
  await startSavedLoad();
  mockState.game = {
    ...mockState.game!,
    step: QuickGameStep.ConfigureScenario,
  };
  await act(async () => pending.resolve(request));
  expect(mockAddUnit).not.toHaveBeenCalled();
});

it('discards completion when the active game is cleared', async () => {
  const pending = deferredLoad();
  render(<UnitSelectionStep />);
  await startSavedLoad();
  mockState.game = null;
  await act(async () => pending.resolve(request));
  expect(mockAddUnit).not.toHaveBeenCalled();
});

it('discards a replaced game load without disturbing a new pending selection', async () => {
  const previous = deferredLoad();
  const view = render(<UnitSelectionStep />);
  await startSavedLoad();
  mockState.game = createQuickGameInstance();
  view.rerender(<UnitSelectionStep />);
  const current = deferredLoad();
  await startSavedLoad();
  await act(async () => previous.resolve(request));
  expect(mockAddUnit).not.toHaveBeenCalled();
  expect(screen.getByText('Loading saved construction…')).toBeVisible();
  await act(async () => current.resolve(request));
  expect(mockAddUnit).toHaveBeenCalledTimes(1);
});

it('discards rejection from a replaced game and permits retry after a current failure', async () => {
  const previous = deferredLoad();
  const view = render(<UnitSelectionStep />);
  await startSavedLoad();
  mockState.game = createQuickGameInstance();
  view.rerender(<UnitSelectionStep />);
  await act(async () => previous.reject(new Error('old game failure')));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  const current = deferredLoad();
  await startSavedLoad();
  await act(async () => current.reject(new Error('current failure')));
  expect(screen.getByRole('alert')).toHaveTextContent('current failure');
  await startSavedLoad();
  await waitFor(() => expect(mockAddUnit).toHaveBeenCalledWith(request));
});

it('adds an eligible saved construction by its exact custom reference and retains stock choices', async () => {
  render(<UnitSelectionStep />);
  expect(screen.getByRole('button', { name: /Atlas AS7-D/ })).toBeVisible();
  fireEvent.click(
    await screen.findByRole('button', {
      name: 'Add saved design Warhammer Test',
    }),
  );
  await waitFor(() => expect(mockAddUnit).toHaveBeenCalledWith(request));
  expect(load).toHaveBeenCalledWith(saved.id);
});

it('shows pending catalog state without blocking stock choices', () => {
  list.mockReturnValue(new Promise(() => {}));
  render(<UnitSelectionStep />);
  expect(screen.getByText('Loading saved designs')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /Atlas AS7-D/ }));
  expect(mockAddUnit).toHaveBeenCalledWith(
    expect.objectContaining({ sourceUnitId: 'atlas-as7-d' }),
  );
});

it('retries a failed catalog and shows no saved choices when none qualify', async () => {
  list.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
  render(<UnitSelectionStep />);
  expect(await screen.findByText('Saved designs unavailable')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Retry saved designs' }));
  expect(await screen.findByText('No saved designs')).toBeVisible();
  expect(
    screen.queryByRole('button', { name: /Add saved design/ }),
  ).not.toBeInTheDocument();
});

it('surfaces a stale or invalid saved construction without adding a substitute', async () => {
  load.mockRejectedValueOnce(
    new Error('Saved construction no longer qualifies'),
  );
  render(<UnitSelectionStep />);
  fireEvent.click(
    await screen.findByRole('button', {
      name: 'Add saved design Warhammer Test',
    }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'no longer qualifies',
  );
  expect(mockAddUnit).not.toHaveBeenCalled();
});
