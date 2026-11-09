import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ToastProvider } from '@/components/shared/Toast';
import LibraryPage from '@/pages/units';
import fixtures from '@/services/units/unitLoaderService/__tests__/fixtures/vehicles.pinned.json';
import { loadUnitDefinition } from '@/services/units/unitLoaderService/loadUnitDefinition';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { createVehicleStore } from '@/stores/useVehicleStore';
import {
  clearAllVehicleStores,
  hydrateOrCreateVehicle,
} from '@/stores/vehicleStoreRegistry';

jest.mock('next/router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

afterEach(() => {
  jest.restoreAllMocks();
  clearAllVehicleStores();
  localStorage.clear();
});

it.each([
  [
    503,
    { error: 'Unit database is unavailable' },
    'Unit database is unavailable',
  ],
  [
    200,
    { error: 'Unit database is unavailable' },
    'Unit database is unavailable',
  ],
  [503, {}, 'Failed to load units'],
  [200, {}, 'Failed to load units'],
])(
  'shows the list response error for HTTP %s and leaves loading',
  async (status, body, message) => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: status < 400,
      status,
      statusText: 'Service Unavailable',
      json: async () => body,
    } as Response);
    render(<LibraryPage />);
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByText('Error Loading Units')).toBeInTheDocument();
    expect(
      screen.queryByText('Loading custom units...'),
    ).not.toBeInTheDocument();
  },
);

it('shows the connection failure and leaves loading when the list request rejects', async () => {
  jest
    .spyOn(global, 'fetch')
    .mockRejectedValueOnce(new TypeError('Failed to fetch'));
  render(<LibraryPage />);
  expect(
    await screen.findByText('Failed to connect to server'),
  ).toBeInTheDocument();
  expect(screen.queryByText('Loading custom units...')).not.toBeInTheDocument();
});

it('imports from the mounted library through the real client, refreshes, and hydrates a real persisted vehicle store', async () => {
  const row = fixtures.rows[0];
  const id = 'custom-browser-import';
  let saved = false;
  jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    let body: unknown;
    if (url === '/api/units/import') {
      expect(JSON.parse(String(init?.body))).toEqual({
        sourceFormat: 'blk',
        sourceText: row.content,
      });
      saved = true;
      body = { success: true, data: { unitId: id } };
    } else if (url === `/api/units/custom/${id}`) {
      body = {
        id,
        chassis: row.definition.chassis,
        variant: row.definition.model,
        currentVersion: 1,
        parsedData: { ...row.definition, family: 'vehicles' },
      };
    } else {
      expect(url).toBe('/api/units/custom');
      body = {
        units: saved
          ? [
              {
                id,
                chassis: row.definition.chassis,
                variant: row.definition.model,
                tonnage: row.definition.tonnage,
                techBase: 'Inner Sphere',
                era: 'Jihad',
                rulesLevel: 'STANDARD',
                unitType: 'Vehicle',
                weightClass: 'Light',
              },
            ]
          : [],
      };
    }
    return { ok: true, status: 201, json: async () => body } as Response;
  });
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <LibraryPage />
    </ToastProvider>,
  );
  await user.click(await screen.findByRole('button', { name: 'Import Unit' }));
  const dialog = screen.getByRole('dialog', { name: 'Import Unit' });
  await user.upload(
    within(dialog).getByLabelText('Unit file'),
    new File([row.content], 'vehicle.blk'),
  );
  await user.click(within(dialog).getByRole('button', { name: /^Import$/ }));
  await waitFor(() =>
    expect(within(dialog).getByRole('status')).toHaveTextContent('Imported'),
  );
  await user.click(within(dialog).getByRole('button', { name: 'Done' }));
  expect(
    await screen.findByRole('row', {
      name: new RegExp(row.definition.chassis),
    }),
  ).toHaveTextContent(row.definition.model);
  const loaded = await loadUnitDefinition('vehicles', id, 'custom');
  if (!loaded.success) throw new Error(loaded.error);
  expect(loaded.reference).toMatchObject({
    id,
    source: 'custom',
    family: 'vehicles',
    version: 1,
  });
  const state = mapToVehicleState(loaded.definition);
  const store = createVehicleStore(state);
  expect(store.getState()).toMatchObject({
    chassis: row.definition.chassis,
    model: row.definition.model,
    tonnage: row.definition.tonnage,
  });
  store.getState().setName('Imported and edited');
  const reopened = hydrateOrCreateVehicle(state.id, {
    name: 'Fallback',
    tonnage: state.tonnage,
    techBase: state.techBase,
  });
  expect(reopened.getState().name).toBe('Imported and edited');
  expect(reopened.getState().equipment).toHaveLength(
    row.definition.equipment.length,
  );
});
