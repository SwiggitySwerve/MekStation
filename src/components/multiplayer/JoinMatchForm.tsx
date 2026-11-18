import { useState } from 'react';
/**
 * JoinMatchForm — render the join-by-room-code form on the multiplayer hub.
 *
 * Wave 5 of Phase 4 (capstone integration). Pure controlled-form
 * component. Caller owns the resolve + navigate side-effect.
 *
 * Room codes are 6 ASCII chars (per Wave 3b's `generateRoomCode`); we
 * upper-case on submit so case-sensitive backends still match. The
 * input itself is case-tolerant for paste convenience.
 */

import { ModeAvailabilityNotice } from '@/components/multiplayer/ModeAvailabilityNotice';

// =============================================================================
// Props
// =============================================================================

export interface IJoinMatchFormProps {
  readonly onSubmit: (roomCode: string) => void | Promise<void>;
  readonly busy?: boolean;
  readonly compactAvailability?: boolean;
  readonly error?: string | null;
}

// =============================================================================
// Component
// =============================================================================

export function JoinMatchForm(props: IJoinMatchFormProps): React.ReactElement {
  const [roomCode, setRoomCode] = useState<string>('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = roomCode.trim().toUpperCase();
        if (!trimmed) return;
        void props.onSubmit(trimmed);
      }}
      className="space-y-4"
    >
      <ModeAvailabilityNotice
        mode="hosted"
        compact={props.compactAvailability}
      />
      <div>
        <label
          htmlFor="jm-roomCode"
          className="text-text-theme-secondary block text-xs font-medium tracking-wide uppercase"
        >
          Room code
        </label>
        <input
          id="jm-roomCode"
          type="text"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          maxLength={12}
          autoComplete="off"
          placeholder="e.g. KR4P7M"
          className="border-border-theme bg-surface-deep text-text-theme-primary focus:border-accent mt-1 w-full rounded border px-3 py-2 text-sm uppercase focus:outline-none"
          required
        />
      </div>
      {props.error && (
        <p className="text-xs text-rose-400" role="alert">
          {props.error}
        </p>
      )}
      <button
        type="submit"
        disabled={props.busy}
        className={`w-full rounded px-4 py-2 text-sm font-medium ${
          props.busy
            ? 'bg-surface-raised text-text-theme-secondary cursor-not-allowed'
            : 'bg-accent text-on-accent hover:bg-accent-hover'
        }`}
      >
        {props.busy ? 'Joining…' : 'Join match'}
      </button>
    </form>
  );
}
