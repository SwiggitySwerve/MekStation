import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { existsSync } from 'node:fs';
import path from 'node:path';
import React from 'react';

type SeatId = 'local-seat-1' | 'local-seat-2';
interface ISeat {
  seatId: SeatId;
  status: 'unprovisioned' | 'active' | 'revoked';
  label: string | null;
  playerId: string | null;
  generation: number;
  lockedUntil: string | null;
}
interface IOutcome {
  generation: number;
  replayed: boolean;
  seats: ISeat[];
}
interface IWrite {
  action: 'provision' | 'revoke';
  seatId: SeatId;
  expectedGeneration: number;
  operatorPassword: string;
  password?: string;
  label?: string;
}
jest.doMock(
  '@/lib/campaign/coop/localSeatCredentialStore',
  () => ({
    listLocalSeats: jest.fn(),
    writeLocalSeat: jest.fn(),
    LocalSeatRequestError: class extends Error {},
  }),
  { virtual: true },
);

const store = require('@/lib/campaign/coop/localSeatCredentialStore') as {
  listLocalSeats: jest.Mock<Promise<ISeat[]>, []>;
  writeLocalSeat: jest.Mock<Promise<IOutcome>, [IWrite]>;
  LocalSeatRequestError: new (message: string) => Error;
};
const componentPath = path.join(__dirname, '..', 'LocalSeatOperatorPanel.tsx');
const LocalSeatOperatorPanel: React.ComponentType = existsSync(componentPath)
  ? require(componentPath).LocalSeatOperatorPanel
  : () => null;

function seats(first = 0, second = 4): ISeat[] {
  return [
    {
      seatId: 'local-seat-1',
      status: first ? 'active' : 'unprovisioned',
      label: first ? 'Scout' : null,
      playerId: first ? 'player-one' : null,
      generation: first,
      lockedUntil: null,
    },
    {
      seatId: 'local-seat-2',
      status: 'active',
      label: 'Gunner',
      playerId: 'player-two',
      generation: second,
      lockedUntil: '2026-10-19T03:00:00.000Z',
    },
  ];
}
function outcome(generation = 1, snapshot = seats(generation)): IOutcome {
  return { generation, replayed: false, seats: snapshot };
}
function failure(
  code: string,
  status: number,
  message: string,
  retryAfter?: number,
) {
  return Object.assign(new store.LocalSeatRequestError(message), {
    code,
    status,
    retryAfter,
  });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const button = (name: string) => screen.getByRole('button', { name });
const input = (name: string) => screen.getByLabelText(name);
function credentials(
  primary = 'primary-secret',
  seat = 'seat-secret',
  confirm = true,
) {
  if (!(input('Seat label') as HTMLInputElement).value)
    fireEvent.change(input('Seat label'), { target: { value: 'Scout' } });
  fireEvent.change(input('Primary vault password'), {
    target: { value: primary },
  });
  fireEvent.change(input('New seat password'), { target: { value: seat } });
  // An active seat shows an explicit re-provision confirmation (LSC-2O).
  const box = screen.queryByRole('checkbox');
  if (confirm && box && !(box as HTMLInputElement).checked)
    fireEvent.click(box);
}
function expectCleared() {
  expect(input('Primary vault password')).toHaveValue('');
  expect(input('New seat password')).toHaveValue('');
}
async function openPanel() {
  render(<LocalSeatOperatorPanel />);
  fireEvent.click(button('Manage local seats'));
  await waitFor(() => expect(button('Provision seat')).toBeEnabled());
}

beforeEach(() => {
  store.listLocalSeats.mockReset().mockResolvedValue(seats());
  store.writeLocalSeat.mockReset().mockResolvedValue(outcome());
});
afterEach(() => jest.restoreAllMocks());

describe('LocalSeatOperatorPanel', () => {
  it('masks unnamed passwords, supplies autofill purposes, and clears them on seat selection', async () => {
    await openPanel();
    const primary = input('Primary vault password');
    const password = input('New seat password');
    for (const field of [primary, password]) {
      expect(field).toHaveAttribute('type', 'password');
      expect(field).not.toHaveAttribute('name');
    }
    expect(primary).toHaveAttribute('autocomplete', 'current-password');
    expect(password).toHaveAttribute('autocomplete', 'new-password');
    credentials();
    fireEvent.change(input('Local seat'), {
      target: { value: 'local-seat-2' },
    });
    expectCleared();
  });

  it.each([
    ['   ', 'password8'],
    ['x'.repeat(65), 'password8'],
    ['Pilot', 'short77'],
  ])(
    'explains invalid provision label %s or password without a request',
    async (label, password) => {
      await openPanel();
      expect(input('Seat label')).toBeRequired();
      expect(input('Seat label')).toHaveAttribute('maxlength', '64');
      expect(input('New seat password')).toHaveAttribute('minlength', '8');
      credentials('primary-secret', password);
      fireEvent.change(input('Seat label'), { target: { value: label } });
      fireEvent.submit(button('Provision seat').closest('form')!);
      expect(store.writeLocalSeat).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Provisioning needs a seat label (1-64 characters) and a new seat password of at least 8 characters.',
      );
      expectCleared();
    },
  );

  it.each(['GENERATION_CONFLICT', 'OPERATION_MISMATCH'])(
    '%s keeps seat 2 selected and targets it after refreshing',
    async (code) => {
      await openPanel();
      fireEvent.change(input('Local seat'), {
        target: { value: 'local-seat-2' },
      });
      store.writeLocalSeat.mockRejectedValueOnce(
        failure(code, 409, 'Refresh required.'),
      );
      store.listLocalSeats.mockResolvedValueOnce(seats(3, 9));
      credentials();
      fireEvent.click(button('Provision seat'));
      await waitFor(() =>
        expect(store.listLocalSeats).toHaveBeenCalledTimes(2),
      );
      await waitFor(() => expect(button('Provision seat')).toBeEnabled());
      expect(input('Local seat')).toHaveValue('local-seat-2');
      credentials();
      fireEvent.click(button('Provision seat'));
      await waitFor(() =>
        expect(store.writeLocalSeat).toHaveBeenCalledTimes(2),
      );
      expect(store.writeLocalSeat.mock.calls[1][0]).toMatchObject({
        seatId: 'local-seat-2',
        expectedGeneration: 9,
      });
    },
  );

  it('enables Revoke only for an active seat', async () => {
    store.listLocalSeats.mockResolvedValueOnce([
      seats()[0],
      { ...seats()[1], status: 'revoked' },
    ]);
    await openPanel();
    expect(button('Revoke seat')).toBeDisabled();
    fireEvent.change(input('Local seat'), {
      target: { value: 'local-seat-2' },
    });
    expect(button('Revoke seat')).toBeDisabled();
    store.listLocalSeats.mockResolvedValueOnce(seats(2));
    fireEvent.click(button('Retry refresh'));
    await waitFor(() => expect(button('Revoke seat')).toBeEnabled());
    credentials('primary-secret', '');
    store.writeLocalSeat.mockResolvedValueOnce(
      outcome(5, [
        seats(2)[0],
        { ...seats()[1], status: 'revoked', generation: 5 },
      ]),
    );
    fireEvent.click(button('Revoke seat'));
    await waitFor(() => expect(button('Provision seat')).toBeEnabled());
    await waitFor(() => expect(button('Revoke seat')).toBeDisabled());
    expect(store.writeLocalSeat).toHaveBeenCalledTimes(1);
  });

  it('loads only on opening, lists both seats, and discloses all trust and revocation limits', async () => {
    store.listLocalSeats.mockResolvedValueOnce([
      seats()[0],
      { ...seats()[1], status: 'revoked' },
    ]);
    render(<LocalSeatOperatorPanel />);
    expect(store.listLocalSeats).not.toHaveBeenCalled();
    expect(
      screen.queryByLabelText('Primary vault password'),
    ).not.toBeInTheDocument();
    fireEvent.click(button('Manage local seats'));
    await waitFor(() => expect(button('Provision seat')).toBeEnabled());
    expect(store.listLocalSeats).toHaveBeenCalledTimes(1);
    const rows = within(
      screen.getByRole('list', { name: 'Local seat states' }),
    ).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('local-seat-1: unprovisioned');
    expect(rows[1]).toHaveTextContent('local-seat-2: revoked');
    expect(rows[1]).toHaveTextContent('Gunner');
    expect(rows[1]).toHaveTextContent('player-two');
    expect(rows[1]).toHaveTextContent('2026-10-19T03:00:00.000Z');
    expect(
      screen.getByText(/operator can impersonate either local seat/i),
    ).toHaveTextContent(/shared OS access is not isolated/i);
    expect(
      screen.getByText(/re-provisioning creates a new playerId/i),
    ).toHaveTextContent(/requires GM readmission/i);
    expect(
      screen.getByText(
        /revocation applies only to the next token mint or renewal/i,
      ),
    ).toHaveTextContent(/existing bearer remains effective until expiry/i);
    expect(
      screen.getByText(
        /prior principal remains a campaign member until explicitly removed/i,
      ),
    ).toBeInTheDocument();
    fireEvent.click(button('Manage local seats'));
    fireEvent.click(button('Manage local seats'));
    await waitFor(() => expect(store.listLocalSeats).toHaveBeenCalledTimes(2));
  });

  it('clears secrets before success and retains the submitted outcome generation even with a newer snapshot', async () => {
    const pending = deferred<IOutcome>();
    store.writeLocalSeat.mockReturnValueOnce(pending.promise);
    await openPanel();
    credentials();
    fireEvent.change(input('Seat label'), { target: { value: 'Scout' } });
    fireEvent.click(button('Provision seat'));
    expectCleared();
    expect(store.writeLocalSeat).toHaveBeenCalledWith({
      action: 'provision',
      seatId: 'local-seat-1',
      expectedGeneration: 0,
      operatorPassword: 'primary-secret',
      password: 'seat-secret',
      label: 'Scout',
    });
    await act(async () =>
      pending.resolve({ ...outcome(1, seats(2)), replayed: true }),
    );
    expectCleared();
    expect(screen.getByRole('list')).toHaveTextContent('generation: 2');
    credentials('primary-again', 'replacement');
    fireEvent.click(button('Provision seat'));
    await waitFor(() => expect(store.writeLocalSeat).toHaveBeenCalledTimes(2));
    expect(store.writeLocalSeat.mock.calls[1][0].expectedGeneration).toBe(1);
  });

  it('uses snapshot generations on selection, including selecting back after a replay', async () => {
    store.writeLocalSeat.mockResolvedValueOnce({
      ...outcome(1, seats(2, 8)),
      replayed: true,
    });
    await openPanel();
    credentials();
    fireEvent.click(button('Provision seat'));
    await waitFor(() => expect(button('Provision seat')).toBeEnabled());
    fireEvent.change(input('Local seat'), {
      target: { value: 'local-seat-2' },
    });
    expect(input('Seat label')).toHaveValue('Gunner');
    credentials();
    store.writeLocalSeat.mockResolvedValueOnce(outcome(9, seats(2, 9)));
    fireEvent.click(button('Revoke seat'));
    await waitFor(() => expect(store.writeLocalSeat).toHaveBeenCalledTimes(2));
    expect(store.writeLocalSeat.mock.calls[1][0]).toMatchObject({
      seatId: 'local-seat-2',
      expectedGeneration: 8,
    });
    await waitFor(() => expect(button('Provision seat')).toBeEnabled());
    fireEvent.change(input('Local seat'), {
      target: { value: 'local-seat-1' },
    });
    credentials();
    fireEvent.click(button('Provision seat'));
    await waitFor(() => expect(store.writeLocalSeat).toHaveBeenCalledTimes(3));
    expect(store.writeLocalSeat.mock.calls[2][0].expectedGeneration).toBe(2);
  });

  it.each([
    [
      'OPERATOR_DENIED',
      401,
      'Primary vault authorization failed (401).',
      undefined,
    ],
    ['THROTTLED', 429, 'Too many requests (429). Retry-After: 17 seconds.', 17],
  ] as const)(
    'shows sanitized %s errors distinctly and clears both secrets',
    async (code, status, message, retryAfter) => {
      const pending = deferred<IOutcome>();
      store.writeLocalSeat.mockReturnValueOnce(pending.promise);
      await openPanel();
      credentials();
      fireEvent.click(button('Provision seat'));
      expectCleared();
      await act(async () =>
        pending.reject(failure(code, status, message, retryAfter)),
      );
      expect(screen.getByRole('alert')).toHaveTextContent(message);
      expectCleared();
      expect(store.listLocalSeats).toHaveBeenCalledTimes(1);
      expect(button('Provision seat')).toBeEnabled();
    },
  );

  it.each(['Provision seat', 'Revoke seat'])(
    'rejects an empty primary password for %s without a write',
    async (action) => {
      await openPanel();
      fireEvent.change(input('Local seat'), {
        target: { value: 'local-seat-2' },
      });
      credentials('', 'seat-secret');
      fireEvent.click(button(action));
      expect(store.writeLocalSeat).not.toHaveBeenCalled();
      expectCleared();
      expect(screen.getByRole('alert')).toHaveTextContent(
        /primary vault password/i,
      );
    },
  );

  it('requires a new seat password to provision and clears the supplied primary password', async () => {
    await openPanel();
    credentials('primary-secret', '');
    fireEvent.click(button('Provision seat'));
    expect(store.writeLocalSeat).not.toHaveBeenCalled();
    expectCleared();
  });

  it.each(['GENERATION_CONFLICT', 'OPERATION_MISMATCH'])(
    '%s refreshes once without retrying either write action',
    async (code) => {
      await openPanel();
      for (const action of ['Provision seat', 'Revoke seat']) {
        const beforeWrite = store.writeLocalSeat.mock.calls.length;
        const beforeList = store.listLocalSeats.mock.calls.length;
        const freshGeneration = beforeList + 6;
        store.writeLocalSeat.mockRejectedValueOnce(
          failure(code, 409, 'Seat changed. Refresh required.'),
        );
        store.listLocalSeats.mockResolvedValueOnce(seats(freshGeneration, 8));
        credentials();
        fireEvent.click(button(action));
        await waitFor(() => expect(button('Provision seat')).toBeEnabled());
        expect(store.listLocalSeats).toHaveBeenCalledTimes(beforeList + 1);
        expect(store.writeLocalSeat).toHaveBeenCalledTimes(beforeWrite + 1);
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Seat changed. Refresh required.',
        );
        expectCleared();
        credentials();
        fireEvent.click(button(action));
        await waitFor(() =>
          expect(store.writeLocalSeat).toHaveBeenCalledTimes(beforeWrite + 2),
        );
        expect(
          store.writeLocalSeat.mock.calls[beforeWrite + 1][0]
            .expectedGeneration,
        ).toBe(freshGeneration);
        await waitFor(() => expect(button('Provision seat')).toBeEnabled());
      }
    },
  );

  it('blocks all writes after conflict refresh fails until explicit successful refresh', async () => {
    await openPanel();
    store.writeLocalSeat.mockRejectedValueOnce(
      failure('GENERATION_CONFLICT', 409, 'Seat changed.'),
    );
    store.listLocalSeats.mockRejectedValueOnce(
      new Error('server-private-detail'),
    );
    credentials();
    fireEvent.click(button('Provision seat'));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/retry refresh/i),
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      'server-private-detail',
    );
    expect(button('Provision seat')).toBeDisabled();
    expect(button('Revoke seat')).toBeDisabled();
    expect(input('Local seat')).toBeDisabled();
    fireEvent.submit(button('Provision seat').closest('form')!);
    expect(store.writeLocalSeat).toHaveBeenCalledTimes(1);
    store.listLocalSeats.mockResolvedValueOnce(seats(7));
    fireEvent.click(button('Retry refresh'));
    await waitFor(() => expect(button('Provision seat')).toBeEnabled());
    credentials();
    fireEvent.click(button('Provision seat'));
    await waitFor(() => expect(store.writeLocalSeat).toHaveBeenCalledTimes(2));
    expect(store.writeLocalSeat.mock.calls[1][0].expectedGeneration).toBe(7);
  });

  it('recovers an initial list failure using explicit refresh', async () => {
    store.listLocalSeats.mockRejectedValueOnce(
      new Error('private list failure'),
    );
    render(<LocalSeatOperatorPanel />);
    fireEvent.click(button('Manage local seats'));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /unable to load local seats/i,
      ),
    );
    expect(button('Provision seat')).toBeDisabled();
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      'private list failure',
    );
    fireEvent.click(button('Retry refresh'));
    await waitFor(() => expect(button('Provision seat')).toBeEnabled());
    expect(store.listLocalSeats).toHaveBeenCalledTimes(2);
  });

  it('revokes using primary authorization only and renders the returned revoked state', async () => {
    store.writeLocalSeat.mockResolvedValueOnce(
      outcome(5, [
        seats()[0],
        { ...seats()[1], generation: 5, status: 'revoked' },
      ]),
    );
    await openPanel();
    fireEvent.change(input('Local seat'), {
      target: { value: 'local-seat-2' },
    });
    credentials('operator-revoke', '');
    fireEvent.click(button('Revoke seat'));
    expectCleared();
    expect(store.writeLocalSeat).toHaveBeenCalledWith({
      action: 'revoke',
      seatId: 'local-seat-2',
      expectedGeneration: 4,
      operatorPassword: 'operator-revoke',
    });
    await waitFor(() =>
      expect(screen.getByRole('list')).toHaveTextContent('generation: 5'),
    );
  });

  it('disables every control while writing and blocks same-tick duplicate form submission', async () => {
    const pending = deferred<IOutcome>();
    store.writeLocalSeat.mockReturnValueOnce(pending.promise);
    await openPanel();
    credentials();
    const form = button('Provision seat').closest('form')!;
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(store.writeLocalSeat).toHaveBeenCalledTimes(1);
    for (const control of Array.from(
      document.querySelectorAll('input, select, button'),
    )) {
      expect(control).toBeDisabled();
    }
    expectCleared();
    await act(async () => pending.resolve(outcome()));
    expect(button('Provision seat')).toBeEnabled();
  });

  it('disables controls during list loading and never writes browser storage', async () => {
    const set = jest.spyOn(Storage.prototype, 'setItem');
    const remove = jest.spyOn(Storage.prototype, 'removeItem');
    const clear = jest.spyOn(Storage.prototype, 'clear');
    const pending = deferred<ISeat[]>();
    store.listLocalSeats.mockReturnValueOnce(pending.promise);
    render(<LocalSeatOperatorPanel />);
    fireEvent.click(button('Manage local seats'));
    for (const control of Array.from(
      document.querySelectorAll('input, select, button'),
    ))
      expect(control).toBeDisabled();
    await act(async () => pending.resolve(seats()));
    credentials();
    fireEvent.click(button('Provision seat'));
    await waitFor(() => expect(button('Provision seat')).toBeEnabled());
    fireEvent.click(button('Manage local seats'));
    expect(set).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
  });
  describe('LSC-2O operator obligations', () => {
    const reprovision = 'Re-provision seat (new identity)';
    const provisionButton = () =>
      screen.getByRole('button', { name: /provision seat/i });
    const confirmation = () =>
      screen.getByRole('checkbox', { name: /new identity/i });

    it('O10 refreshes on NOT_REVOCABLE, keeps the seat target and never resubmits', async () => {
      await openPanel();
      fireEvent.change(input('Local seat'), {
        target: { value: 'local-seat-2' },
      });
      store.writeLocalSeat.mockRejectedValueOnce(
        failure(
          'NOT_REVOCABLE',
          409,
          'That seat is not active, so nothing was revoked.',
        ),
      );
      store.listLocalSeats.mockResolvedValueOnce([
        seats()[0],
        { ...seats()[1], status: 'revoked', generation: 5 },
      ]);
      credentials('primary-secret', '');
      fireEvent.click(button('Revoke seat'));
      await waitFor(() =>
        expect(store.listLocalSeats).toHaveBeenCalledTimes(2),
      );
      await waitFor(() => expect(provisionButton()).toBeEnabled());
      expect(store.writeLocalSeat).toHaveBeenCalledTimes(1);
      expect(input('Local seat')).toHaveValue('local-seat-2');
      expect(button('Revoke seat')).toBeDisabled();
      expect(screen.getByRole('alert')).toHaveTextContent(
        'That seat is not active, so nothing was revoked.',
      );
      expectCleared();
    });

    it('O11 requires explicit confirmation naming the new identity before re-provisioning an active seat', async () => {
      await openPanel();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      credentials('primary-secret', 'seat-secret', false);
      fireEvent.click(button('Provision seat'));
      await waitFor(() =>
        expect(store.writeLocalSeat).toHaveBeenCalledTimes(1),
      );
      await waitFor(() => expect(provisionButton()).toBeEnabled());
      fireEvent.change(input('Local seat'), {
        target: { value: 'local-seat-2' },
      });
      expect(button(reprovision)).toBeEnabled();
      expect(
        screen.getByRole('checkbox', {
          name: /new identity.*GM must admit it again.*old player stays a member until removed/i,
        }),
      ).not.toBeChecked();
      credentials('primary-secret', 'seat-secret', false);
      fireEvent.click(button(reprovision));
      expect(store.writeLocalSeat).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('alert')).toHaveTextContent(
        /confirm the new identity/i,
      );
      fireEvent.click(confirmation());
      credentials('primary-secret', 'seat-secret', false);
      fireEvent.click(button(reprovision));
      await waitFor(() =>
        expect(store.writeLocalSeat).toHaveBeenCalledTimes(2),
      );
      expect(store.writeLocalSeat.mock.calls[1][0]).toMatchObject({
        action: 'provision',
        seatId: 'local-seat-2',
        expectedGeneration: 4,
      });
    });

    it('O12 resets the confirmation on seat change and after every outcome and keeps the password field contracts', async () => {
      await openPanel();
      fireEvent.change(input('Local seat'), {
        target: { value: 'local-seat-2' },
      });
      fireEvent.click(confirmation());
      expect(confirmation()).toBeChecked();
      fireEvent.change(input('Local seat'), {
        target: { value: 'local-seat-1' },
      });
      fireEvent.change(input('Local seat'), {
        target: { value: 'local-seat-2' },
      });
      expect(confirmation()).not.toBeChecked();
      store.writeLocalSeat.mockResolvedValueOnce(outcome(5, seats(0, 5)));
      credentials();
      fireEvent.click(button(reprovision));
      await waitFor(() =>
        expect(store.writeLocalSeat).toHaveBeenCalledTimes(1),
      );
      await waitFor(() => expect(button(reprovision)).toBeEnabled());
      expect(confirmation()).not.toBeChecked();
      store.writeLocalSeat.mockRejectedValueOnce(
        failure('OPERATOR_DENIED', 401, 'Primary vault authorization failed.'),
      );
      credentials();
      fireEvent.click(button(reprovision));
      await waitFor(() =>
        expect(store.writeLocalSeat).toHaveBeenCalledTimes(2),
      );
      await waitFor(() => expect(button(reprovision)).toBeEnabled());
      expect(confirmation()).not.toBeChecked();
      credentials('primary-secret', 'seat-secret', false);
      fireEvent.click(button(reprovision));
      expect(store.writeLocalSeat).toHaveBeenCalledTimes(2);
      expect(input('Primary vault password')).toHaveAttribute(
        'autocomplete',
        'current-password',
      );
      expect(input('New seat password')).toHaveAttribute(
        'autocomplete',
        'new-password',
      );
      expect(input('New seat password')).toHaveAttribute('minlength', '8');
      expect(input('Primary vault password')).not.toHaveAttribute('name');
    });

    it.each([
      ['O13', 0],
      ['O14', 503],
    ] as const)(
      '%s a status %s write outcome refreshes seats before any mutation can be resubmitted',
      async (_id, status) => {
        await openPanel();
        const pendingList = deferred<ISeat[]>();
        store.writeLocalSeat.mockRejectedValueOnce(
          failure('REQUEST_FAILED', status, 'Local seat request failed.'),
        );
        store.listLocalSeats.mockReturnValueOnce(pendingList.promise);
        credentials();
        fireEvent.click(button('Provision seat'));
        await waitFor(() =>
          expect(store.listLocalSeats).toHaveBeenCalledTimes(2),
        );
        expect(provisionButton()).toBeDisabled();
        expect(button('Revoke seat')).toBeDisabled();
        fireEvent.submit(provisionButton().closest('form')!);
        expect(store.writeLocalSeat).toHaveBeenCalledTimes(1);
        await act(async () => pendingList.resolve(seats(1)));
        await waitFor(() => expect(provisionButton()).toBeEnabled());
        credentials();
        fireEvent.click(provisionButton());
        await waitFor(() =>
          expect(store.writeLocalSeat).toHaveBeenCalledTimes(2),
        );
        expect(store.writeLocalSeat.mock.calls[1][0].expectedGeneration).toBe(
          1,
        );
      },
    );

    it('O15 keeps every write disabled after a failed unknown-outcome refresh until an explicit successful Retry refresh', async () => {
      await openPanel();
      store.writeLocalSeat.mockRejectedValueOnce(
        failure('REQUEST_FAILED', 0, 'Local seat request failed.'),
      );
      store.listLocalSeats.mockRejectedValueOnce(
        new Error('server-private-detail'),
      );
      credentials();
      fireEvent.click(button('Provision seat'));
      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent(/retry refresh/i),
      );
      expect(screen.getByRole('alert')).not.toHaveTextContent(
        'server-private-detail',
      );
      expect(provisionButton()).toBeDisabled();
      expect(button('Revoke seat')).toBeDisabled();
      expect(input('Local seat')).toBeDisabled();
      fireEvent.submit(provisionButton().closest('form')!);
      expect(store.writeLocalSeat).toHaveBeenCalledTimes(1);
      store.listLocalSeats.mockResolvedValueOnce(seats(7));
      fireEvent.click(button('Retry refresh'));
      await waitFor(() => expect(provisionButton()).toBeEnabled());
      credentials();
      fireEvent.click(provisionButton());
      await waitFor(() =>
        expect(store.writeLocalSeat).toHaveBeenCalledTimes(2),
      );
      expect(store.writeLocalSeat.mock.calls[1][0].expectedGeneration).toBe(7);
    });

    it.each([
      [
        'OPERATOR_DENIED',
        401,
        'Primary vault authorization failed (401).',
        undefined,
      ],
      [
        'LOCAL_SEAT_THROTTLED',
        429,
        'Too many requests (429). Retry-After: 17 seconds.',
        17,
      ],
    ] as const)(
      'O16 a known %s outcome does not force a refresh and keeps its message',
      async (code, status, message, retryAfter) => {
        await openPanel();
        store.writeLocalSeat.mockRejectedValueOnce(
          failure(code, status, message, retryAfter),
        );
        credentials();
        fireEvent.click(button('Provision seat'));
        await waitFor(() =>
          expect(screen.getByRole('alert')).toHaveTextContent(message),
        );
        await waitFor(() => expect(provisionButton()).toBeEnabled());
        expect(store.listLocalSeats).toHaveBeenCalledTimes(1);
        expect(store.writeLocalSeat).toHaveBeenCalledTimes(1);
        expectCleared();
      },
    );

    it.each(['GENERATION_CONFLICT', 'OPERATION_MISMATCH'])(
      'O16 a %s outcome still refreshes exactly once and never retries the write',
      async (code) => {
        await openPanel();
        store.writeLocalSeat.mockRejectedValueOnce(
          failure(code, 409, 'Refresh required.'),
        );
        store.listLocalSeats.mockResolvedValueOnce(seats(2));
        credentials();
        fireEvent.click(button('Provision seat'));
        await waitFor(() =>
          expect(store.listLocalSeats).toHaveBeenCalledTimes(2),
        );
        await waitFor(() => expect(provisionButton()).toBeEnabled());
        expect(store.writeLocalSeat).toHaveBeenCalledTimes(1);
      },
    );
  });
});
