/**
 * The GM ledger control plane's preview / approve / manual-takeover state
 * (state-machine audit K11). One discriminated union, one transition map, and
 * a token minted per generated preview: an action whose token is not the
 * current preview's, or whose type the current phase does not accept, is
 * refused and leaves the state unchanged. `useGmControlPlane` answers each
 * dispatch synchronously, so a second click inside one event turn is refused
 * before it can apply anything.
 */

import { useCallback, useRef, useState } from 'react';

import type { GmLedgerPreview } from './GmCampaignInterventionControlPlane.helpers';
import type { ManualTakeoverState } from './GmCampaignPreviewPanels';

interface IGmControlOf<TKind extends string> {
  readonly kind: TKind;
  readonly token: number;
  readonly preview: GmLedgerPreview;
}

export type GmControl =
  | { readonly kind: 'idle' }
  | IGmControlOf<'previewed'>
  | IGmControlOf<'approving'>
  | IGmControlOf<'applied'>
  | (IGmControlOf<'refused'> & { readonly reason: string })
  | (IGmControlOf<'blocked'> & { readonly reason: string })
  | (IGmControlOf<'failed'> & { readonly reason: string })
  | (IGmControlOf<'manual'> & { readonly conflicts: readonly string[] });

export type GmControlKind = GmControl['kind'];

export type GmControlAction =
  | { readonly type: 'preview-generated'; readonly preview: GmLedgerPreview }
  | { readonly type: 'approve-started'; readonly token: number }
  | {
      readonly type: 'approve-blocked';
      readonly token: number;
      readonly reason: string;
    }
  | { readonly type: 'approve-applied'; readonly token: number }
  | {
      readonly type: 'approve-refused';
      readonly token: number;
      readonly reason: string;
    }
  | {
      readonly type: 'approve-failed';
      readonly token: number;
      readonly reason: string;
    }
  | {
      readonly type: 'manual-recorded';
      readonly token: number;
      readonly conflicts: readonly string[];
    };

export interface IGmControlPlaneState {
  readonly control: GmControl;
  /** The token of the newest generated preview; 0 before the first. */
  readonly lastToken: number;
}

export const INITIAL_GM_CONTROL_PLANE_STATE: IGmControlPlaneState = {
  control: { kind: 'idle' },
  lastToken: 0,
};

/**
 * The action types each phase accepts. `approving` accepts only its own
 * answer, so neither a second approve nor a new preview can start while an
 * apply is in flight. `failed` is terminal for its preview: the apply may
 * have landed before it threw, so the GM generates a fresh preview first.
 */
export const GM_CONTROL_TRANSITIONS: Readonly<
  Record<GmControlKind, readonly GmControlAction['type'][]>
> = {
  idle: ['preview-generated'],
  previewed: [
    'preview-generated',
    'approve-started',
    'approve-blocked',
    'manual-recorded',
  ],
  approving: ['approve-applied', 'approve-refused', 'approve-failed'],
  applied: ['preview-generated'],
  refused: ['preview-generated', 'approve-started', 'approve-blocked'],
  blocked: ['preview-generated'],
  failed: ['preview-generated'],
  manual: ['preview-generated'],
};

/** The next state, or `state` itself when the action is refused. */
export function reduceGmControlPlane(
  state: IGmControlPlaneState,
  action: GmControlAction,
): IGmControlPlaneState {
  const { control } = state;
  if (!GM_CONTROL_TRANSITIONS[control.kind].includes(action.type)) {
    return state;
  }
  if (action.type === 'preview-generated') {
    const token = state.lastToken + 1;
    return {
      lastToken: token,
      control: { kind: 'previewed', token, preview: action.preview },
    };
  }
  if (control.kind === 'idle' || action.token !== control.token) return state;
  const { token, preview } = control;

  switch (action.type) {
    case 'approve-started':
      if (preview.status !== 'ready') return state;
      return { ...state, control: { kind: 'approving', token, preview } };
    case 'approve-blocked':
      return {
        ...state,
        control: { kind: 'blocked', token, preview, reason: action.reason },
      };
    case 'approve-applied':
      return { ...state, control: { kind: 'applied', token, preview } };
    case 'approve-refused':
      return {
        ...state,
        control: { kind: 'refused', token, preview, reason: action.reason },
      };
    case 'approve-failed':
      return {
        ...state,
        control: { kind: 'failed', token, preview, reason: action.reason },
      };
    case 'manual-recorded':
      if (preview.status !== 'requires-manual-takeover') return state;
      return {
        ...state,
        control: {
          kind: 'manual',
          token,
          preview,
          conflicts: action.conflicts,
        },
      };
    default: {
      const exhaustive: never = action;
      void exhaustive;
      return state;
    }
  }
}

export interface IGmControlView {
  readonly status: string;
  readonly reason: string | null;
  readonly canGenerate: boolean;
  readonly canApprove: boolean;
  readonly canTakeManualControl: boolean;
  /** True once this preview's correction was applied (the green badge). */
  readonly approvedApplied: boolean;
  readonly manualTakeover: ManualTakeoverState | null;
}

const MANUAL_TAKEOVER_REASON =
  'Manual takeover selected; no campaign state changed.';

/** What the control plane shows and enables for `control`. */
export function viewGmControl(control: GmControl): IGmControlView {
  const accepts = (type: GmControlAction['type']): boolean =>
    GM_CONTROL_TRANSITIONS[control.kind].includes(type);
  const previewStatus = control.kind === 'idle' ? null : control.preview.status;
  const base = {
    reason: null,
    canGenerate: accepts('preview-generated'),
    canApprove: accepts('approve-started') && previewStatus === 'ready',
    canTakeManualControl:
      accepts('manual-recorded') &&
      previewStatus === 'requires-manual-takeover',
    approvedApplied: false,
    manualTakeover: null,
  };

  switch (control.kind) {
    case 'idle':
      return { ...base, status: 'No approved GM corrections yet.' };
    case 'previewed':
      return {
        ...base,
        status:
          control.preview.status === 'ready'
            ? 'Ready for GM approval.'
            : `Preview status: ${control.preview.status}`,
      };
    case 'approving':
      return { ...base, status: 'Applying the approved correction...' };
    case 'applied':
      return {
        ...base,
        status: 'Approved and applied to campaign state.',
        approvedApplied: true,
      };
    case 'refused':
      return {
        ...base,
        status: 'Not applied to campaign state.',
        reason: control.reason,
      };
    case 'blocked':
      return { ...base, status: 'Approval blocked.', reason: control.reason };
    case 'failed':
      return {
        ...base,
        status: 'Apply failed.',
        reason: `${control.reason} Generate a new preview before trying again.`,
      };
    case 'manual':
      return {
        ...base,
        status: 'Manual takeover recorded.',
        manualTakeover: {
          reason: MANUAL_TAKEOVER_REASON,
          conflicts: control.conflicts,
        },
      };
    default: {
      const exhaustive: never = control;
      void exhaustive;
      return { ...base, status: '' };
    }
  }
}

/**
 * The control plane state with a dispatch that answers at once whether the
 * action was accepted. The reducer runs against a ref, not the last render,
 * so two dispatches in one event turn see each other.
 */
export function useGmControlPlane(): readonly [
  IGmControlPlaneState,
  (action: GmControlAction) => boolean,
] {
  const current = useRef(INITIAL_GM_CONTROL_PLANE_STATE);
  const [state, setState] = useState(INITIAL_GM_CONTROL_PLANE_STATE);
  const dispatch = useCallback((action: GmControlAction): boolean => {
    const next = reduceGmControlPlane(current.current, action);
    if (next === current.current) return false;
    current.current = next;
    setState(next);
    return true;
  }, []);
  return [state, dispatch] as const;
}
