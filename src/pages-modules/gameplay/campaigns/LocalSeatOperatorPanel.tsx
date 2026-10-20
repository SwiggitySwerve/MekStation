import React, { useRef, useState } from 'react';

import {
  listLocalSeats,
  LocalSeatRequestError,
  writeLocalSeat,
  type ILocalSeatPublic,
  type LocalSeatId,
} from '@/lib/campaign/coop/localSeatCredentialStore';

const control =
  'border-border-theme bg-surface-deep rounded border px-3 py-2 disabled:opacity-50';

export function LocalSeatOperatorPanel(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [ready, setReady] = useState(false);
  const [seats, setSeats] = useState<ILocalSeatPublic[]>([]);
  const [seatId, setSeatId] = useState<LocalSeatId>('local-seat-1');
  const [expectedGeneration, setExpectedGeneration] = useState(0);
  const [label, setLabel] = useState('');
  const [message, setMessage] = useState('');
  const primary = useRef<HTMLInputElement>(null);
  const password = useRef<HTMLInputElement>(null);
  const work = (value: boolean) => {
    working.current = value;
    setBusy(value);
  };
  const select = (seat: ILocalSeatPublic) => {
    setSeatId(seat.seatId);
    setExpectedGeneration(seat.generation);
    setLabel(seat.label ?? '');
    if (primary.current) primary.current.value = '';
    if (password.current) password.current.value = '';
  };
  async function refresh(prefix = '') {
    setReady(false);
    try {
      const snapshot = await listLocalSeats();
      setSeats(snapshot);
      const selected = snapshot.find((seat) => seat.seatId === seatId);
      if (!selected) throw new Error('Missing seat');
      select(selected);
      setReady(true);
      setMessage(prefix);
    } catch (error) {
      const detail =
        error instanceof LocalSeatRequestError
          ? error.message
          : 'Unable to load local seats.';
      setMessage(
        `${prefix} ${detail} Retry refresh before making changes.`.trim(),
      );
    }
  }
  async function load() {
    if (working.current) return;
    work(true);
    setOpen(true);
    await refresh();
    work(false);
  }
  async function submit(action: 'provision' | 'revoke') {
    if (working.current || !ready) return;
    const operatorPassword = primary.current?.value ?? '';
    const seatPassword = password.current?.value ?? '';
    if (primary.current) primary.current.value = '';
    if (password.current) password.current.value = '';
    if (!operatorPassword || (action === 'provision' && !seatPassword)) {
      setMessage(
        'Enter the primary vault password and, to provision, a new seat password.',
      );
      return;
    }
    if (
      action === 'provision' &&
      (!label.trim() || label.trim().length > 64 || seatPassword.length < 8)
    ) {
      setMessage(
        'Provisioning needs a seat label (1-64 characters) and a new seat password of at least 8 characters.',
      );
      return;
    }
    work(true);
    setMessage('');
    try {
      const base = { seatId, expectedGeneration, operatorPassword };
      const result = await writeLocalSeat(
        action === 'provision'
          ? { ...base, action, password: seatPassword, label }
          : { ...base, action },
      );
      setSeats(result.seats);
      setExpectedGeneration(result.generation);
      setMessage(`Local seat ${action} completed.`);
    } catch (error) {
      const detail =
        error instanceof LocalSeatRequestError
          ? error.message
          : 'Unable to update local seat.';
      setMessage(detail);
      if (
        error instanceof LocalSeatRequestError &&
        error.status === 409 &&
        (error.code === 'GENERATION_CONFLICT' ||
          error.code === 'OPERATION_MISMATCH')
      ) {
        await refresh(detail);
      }
    } finally {
      work(false);
    }
  }
  return (
    <section className="border-border-theme bg-surface-deep/50 mb-6 rounded-lg border px-4 py-3">
      <button
        type="button"
        className={control}
        disabled={busy}
        aria-expanded={open}
        onClick={() => {
          if (open) setOpen(false);
          else void load();
        }}
      >
        Manage local seats
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <p>
            The operator can impersonate either local seat. Shared OS access is
            not isolated.
          </p>
          <p>
            Re-provisioning creates a new playerId and requires GM readmission.
          </p>
          <p>
            Revocation applies only to the next token mint or renewal. An
            existing bearer remains effective until expiry. The prior principal
            remains a campaign member until explicitly removed.
          </p>
          <ul aria-label="Local seat states">
            {seats.map((seat) => (
              <li key={seat.seatId}>
                {`${seat.seatId}: ${seat.status}; label: ${seat.label ?? 'none'}; playerId: ${seat.playerId ?? 'none'}; generation: ${seat.generation}; locked until: ${seat.lockedUntil ?? 'not locked'}`}
              </li>
            ))}
          </ul>
          {message && <p role="alert">{message}</p>}
          <button
            type="button"
            className={control}
            disabled={busy}
            onClick={() => void load()}
          >
            Retry refresh
          </button>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit('provision');
            }}
          >
            <fieldset disabled={busy || !ready} className="space-y-3">
              <legend>Local seat credentials</legend>
              <label className="block">
                Local seat
                <select
                  className={control}
                  value={seatId}
                  onChange={(event) => {
                    const selected = seats.find(
                      (seat) => seat.seatId === event.target.value,
                    );
                    if (selected) select(selected);
                  }}
                >
                  {seats.map((seat) => (
                    <option key={seat.seatId} value={seat.seatId}>
                      {seat.seatId}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                Seat label
                <input
                  className={control}
                  value={label}
                  required
                  maxLength={64}
                  onChange={(event) => setLabel(event.target.value)}
                />
              </label>
              {(
                [
                  ['Primary vault password', primary],
                  ['New seat password', password],
                ] as const
              ).map(([title, ref]) => (
                <label key={title} className="block">
                  {title}
                  <input
                    className={control}
                    ref={ref}
                    type="password"
                    autoComplete={
                      ref === primary ? 'current-password' : 'new-password'
                    }
                    minLength={ref === password ? 8 : undefined}
                  />
                </label>
              ))}
              <button className={control} type="submit">
                Provision seat
              </button>
              <button
                className={control}
                type="button"
                disabled={
                  seats.find((seat) => seat.seatId === seatId)?.status !==
                  'active'
                }
                onClick={() => void submit('revoke')}
              >
                Revoke seat
              </button>
            </fieldset>
          </form>
        </div>
      )}
    </section>
  );
}
