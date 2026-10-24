import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { getActiveCampaignSyncTransport } from '@/lib/campaign/coop/campaignSyncTransport';
import {
  forgetCoopCredential,
  isCoopCredentialChoice,
  listLocalSeats,
  LocalSeatRequestError,
  mintCoopCredential,
  readCoopCredentialChoice,
  readCoopCredentialStatus,
  replaceCoopCredential,
  RENEWAL_WINDOW_MS,
  writeCoopCredentialChoice,
  type CoopCredentialChoice,
  type ILocalSeatPublic,
} from '@/lib/campaign/coop/localSeatCredentialStore';

const control =
  'border-border-theme bg-surface-deep rounded border px-3 py-2 disabled:opacity-50';
const names: Record<CoopCredentialChoice, string> = {
  primary: 'Primary vault identity',
  seat1: 'Local seat 1',
  seat2: 'Local seat 2',
};

function errorText(error: unknown): string {
  return error instanceof LocalSeatRequestError
    ? error.message
    : 'Unable to complete this action. Retry explicitly when ready.';
}

function CredentialDisclosure(): React.ReactElement {
  return (
    <p className="text-text-theme-secondary mt-2 text-sm">
      Choosing a credential grants no campaign role. The computer operator can
      impersonate any local seat; these seats do not isolate users sharing an
      operating-system account. Re-provisioning creates a new player identity
      requiring GM readmission. Revocation or re-provisioning stops the next
      mint or renewal; old bearers still work until their original expiry (local
      seats: at most one hour), including existing sockets. Old campaign
      membership remains until removed by the GM.
    </p>
  );
}

/** Next-join preference only; opening or changing this control never mints. */
export function LocalSeatCredentialPanel(): React.ReactElement {
  const id = useId();
  const [choice, setChoice] = useState<CoopCredentialChoice | null>(null);
  const [seats, setSeats] = useState<ILocalSeatPublic[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const working = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    try {
      setChoice(readCoopCredentialChoice());
    } catch (error) {
      setMessage(errorText(error));
    }
    return () => {
      mounted.current = false;
    };
  }, []);

  async function refresh() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setMessage('');
    try {
      const snapshot = await listLocalSeats();
      if (!mounted.current) return;
      setSeats(snapshot);
      setLoaded(true);
    } catch (error) {
      if (mounted.current) setMessage(errorText(error));
    } finally {
      working.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  function choose(value: string) {
    if (working.current || !isCoopCredentialChoice(value)) return;
    try {
      writeCoopCredentialChoice(value);
      setChoice(value);
      setMessage(
        'Choice saved for the next join. Existing matches keep their joined credential.',
      );
    } catch (error) {
      setMessage(errorText(error));
    }
  }

  const selectedSeat =
    choice === 'seat1' || choice === 'seat2'
      ? seats.find(
          (seat) =>
            seat.seatId ===
            (choice === 'seat1' ? 'local-seat-1' : 'local-seat-2'),
        )
      : undefined;
  return (
    <section
      aria-label="Co-op credential choice"
      className="border-border-theme bg-surface-deep/50 mb-6 rounded-lg border px-4 py-3"
    >
      <label htmlFor={id} className="mb-2 block">
        This browser profile joins as
      </label>
      <select
        id={id}
        className={control}
        value={choice ?? ''}
        disabled={busy || choice === null}
        onChange={(event) => choose(event.target.value)}
      >
        {choice === null && (
          <option value="">Credential choice unavailable</option>
        )}
        {Object.entries(names).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={`${control} ml-2`}
        disabled={busy}
        onClick={() => void refresh()}
      >
        {busy
          ? 'Loading local seats…'
          : 'Show / refresh local seat availability'}
      </button>
      {loaded && (
        <ul className="mt-2" aria-label="Public local seat availability">
          {seats.map((seat) => (
            <li key={seat.seatId}>
              {seat.seatId}: {seat.label ?? 'Unnamed'} — {seat.status}
              {seat.playerId ? ` — ${seat.playerId}` : ''}
              {seat.lockedUntil ? ' — temporarily locked' : ''}
            </li>
          ))}
        </ul>
      )}
      {selectedSeat && selectedSeat.status !== 'active' && (
        <p role="alert">
          Ask the operator to provision this seat before signing in.
        </p>
      )}
      <p className="text-text-theme-secondary mt-2 text-sm">
        This public preference persists in this browser profile. Passwords are
        entered only when joining or renewing. Use a separate browser profile
        for each player. Forgetting this preference does not sign out a match;
        use its “Forget choice and match sign-in” control to remove its bearer.
      </p>
      <button
        type="button"
        className={`${control} mt-2`}
        disabled={busy}
        onClick={() => {
          if (working.current) return;
          try {
            forgetCoopCredential();
            setChoice('primary');
            setMessage(
              'Next-join choice forgotten. Primary is the default. Match sign-ins were not removed.',
            );
          } catch (error) {
            setMessage(errorText(error));
          }
        }}
      >
        Forget next-join choice
      </button>
      <CredentialDisclosure />
      <p role="status" aria-live="polite" className="mt-2">
        {message}
      </p>
    </section>
  );
}

/** Mount with session.matchId ?? session.hostMatchId, for host and guest. */
export function CoopCredentialRenewal({
  matchId,
  reloadPage = () => window.location.reload(),
  navigatePage = (href: string) => window.location.assign(href),
}: {
  matchId?: string;
  reloadPage?: () => void;
  navigatePage?: (href: string) => void;
}): React.ReactElement | null {
  const id = useId();
  const password = useRef<HTMLInputElement>(null);
  const working = useRef(false);
  const lifetime = useRef(0);
  const invalidate = useCallback(() => {
    lifetime.current += 1;
  }, []);
  const clearPassword = useCallback(() => {
    if (password.current) password.current.value = '';
  }, []);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  const [status, setStatus] = useState<ReturnType<
    typeof readCoopCredentialStatus
  > | null>(null);
  const [problem, setProblem] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    setStatus(null);
    setProblem('');
    setMessage('');
    const refresh = () => {
      if (!matchId) return;
      try {
        setStatus(readCoopCredentialStatus(matchId));
        setProblem('');
      } catch (error) {
        setStatus(null);
        setProblem(
          error instanceof LocalSeatRequestError &&
            error.code === 'BINDING_REQUIRED'
            ? ''
            : errorText(error),
        );
      }
      setNow(Date.now());
    };
    refresh();
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      invalidate();
      window.clearInterval(timer);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      clearPassword();
    };
  }, [matchId, invalidate, clearPassword]);

  async function renew() {
    let secret = password.current?.value ?? '';
    clearPassword();
    if (working.current || !matchId) return;
    if (!secret) {
      setMessage('Enter the password for the joined credential.');
      return;
    }
    working.current = true;
    setBusy(true);
    setMessage('');
    const generation = lifetime.current;
    try {
      const binding = readCoopCredentialStatus(matchId);
      const pending = mintCoopCredential(binding.choice, secret);
      secret = '';
      const minted = await pending;
      if (lifetime.current !== generation) return;
      replaceCoopCredential(binding, minted);
      // The existing transport captures its bearer; never leave it active
      // after updating storage and claim it adopted the replacement.
      getActiveCampaignSyncTransport(matchId)?.close();
      reloadPage();
      setMessage(
        'Sign-in saved. Reload this page before continuing if it did not reload automatically.',
      );
    } catch (error) {
      if (lifetime.current === generation) setMessage(errorText(error));
    } finally {
      secret = '';
      working.current = false;
      setBusy(false);
      if (lifetime.current === generation) clearPassword();
    }
  }

  function forget() {
    if (working.current || !matchId) return;
    working.current = true;
    setBusy(true);
    clearPassword();
    try {
      getActiveCampaignSyncTransport(matchId)?.close();
      forgetCoopCredential(matchId);
      navigatePage('/gameplay/campaigns');
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  if (
    !matchId ||
    (!problem &&
      (!status || (status.expiresAt - now > RENEWAL_WINDOW_MS && !message)))
  )
    return null;
  const expired = status !== null && status.expiresAt <= now;
  return (
    <section
      aria-label="Co-op sign-in renewal and recovery"
      className="mb-4 rounded-lg border border-amber-600 bg-amber-950/40 px-4 py-3 text-sm text-amber-100"
    >
      <p role="status" aria-live="polite">
        {problem ||
          (expired
            ? 'Your co-op sign-in expired. Re-enter its password to recover.'
            : 'Your co-op sign-in expires within four minutes. Renew before continuing.')}
      </p>
      {status && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void renew();
          }}
        >
          <p className="mt-2">
            Joined as {names[status.choice]} — {status.playerId}
          </p>
          <label htmlFor={id} className="mt-2 mb-1 block">
            Password for {names[status.choice]}
          </label>
          <input
            id={id}
            ref={password}
            type="password"
            autoComplete="current-password"
            required
            maxLength={512}
            disabled={busy}
            className={control}
            aria-describedby={`${id}-policy`}
          />
          <button type="submit" className={`${control} ml-2`} disabled={busy}>
            {busy
              ? 'Renewing…'
              : expired
                ? 'Recover and reload'
                : 'Renew and reload'}
          </button>
        </form>
      )}
      <p id={`${id}-policy`} className="mt-2">
        Renewal requires an explicit submit and the credential used to join;
        changing the next-join choice does not change it. Nothing mints or
        retries automatically. A successful renewal closes this match’s current
        transport and reloads to reconnect with the saved bearer. Finish pending
        actions first: reload may discard unsent work. This does not promise
        uninterrupted transport or renew other matches. If this seat was
        re-provisioned, forget this sign-in, choose the seat at co-op entry and
        reclaim with its new password; the GM must admit its new player
        identity. A replacement player is refused here.
      </p>
      <button
        type="button"
        className={`${control} mt-2`}
        disabled={busy}
        onClick={forget}
      >
        Forget choice and match sign-in; return to co-op entry
      </button>
      <p className="mt-2">
        Forgetting removes this profile’s choice, this match’s public binding
        and saved bearer; it does not revoke server credentials or remove
        membership.
      </p>
      <CredentialDisclosure />
      <p role="alert" className="mt-2">
        {message}
      </p>
    </section>
  );
}
