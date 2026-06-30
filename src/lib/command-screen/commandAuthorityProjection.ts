import type {
  CommandAuthorityControl,
  ICommandAuthorityProjection,
} from '@/types/command-screen';

type CoopMode = 'single-player' | 'host' | 'guest';

export interface IBuildCoopCampaignAuthorityProjectionInput {
  readonly mode: CoopMode;
  readonly routeId: string;
  readonly screenId?: string;
  readonly pendingProposalCount?: number;
}

export interface IBuildNetworkedTacticalAuthorityProjectionInput {
  readonly playerId: string;
  readonly hostPlayerId?: string | null;
  readonly canAct: boolean;
  readonly waitingForOpponent?: boolean;
  readonly paused?: boolean;
  readonly spectator?: boolean;
  readonly screenId?: string;
}

const HOST_GM_CONTROLS: readonly CommandAuthorityControl[] = [
  'preview',
  'approve',
  'veto',
  'manual-takeover',
  'gm-correction',
  'view-public-result',
];

const GUEST_CAMPAIGN_CONTROLS: readonly CommandAuthorityControl[] = [
  'submit-proposal',
  'view-public-result',
];

const NETWORK_HOST_CONTROLS: readonly CommandAuthorityControl[] = [
  'preview',
  'approve',
  'gm-correction',
  'send-intent',
  'view-public-result',
];

const NETWORK_GUEST_CONTROLS: readonly CommandAuthorityControl[] = [
  'send-intent',
  'view-public-result',
];

const GM_ONLY_CONTROLS: readonly CommandAuthorityControl[] = [
  'approve',
  'veto',
  'manual-takeover',
  'gm-correction',
];

export function buildCoopCampaignAuthorityProjection(
  input: IBuildCoopCampaignAuthorityProjectionInput,
): ICommandAuthorityProjection {
  if (input.mode === 'host') {
    return {
      screenId: input.screenId ?? `campaign-coop-${input.routeId}`,
      domain: 'campaign',
      viewerRole: 'host-gm',
      authority: 'host-gm',
      commandPath: 'host-authoritative',
      enabledControls: HOST_GM_CONTROLS,
      hiddenControls: ['submit-proposal'],
      canViewPrivateGmMetadata: true,
      publicResultOnly: false,
      summary: 'Host GM authority',
      details: [
        `${input.pendingProposalCount ?? 0} pending proposals`,
        'Private rationale visible',
        'Public result projection available',
      ],
    };
  }

  if (input.mode === 'guest') {
    return {
      screenId: input.screenId ?? `campaign-coop-${input.routeId}`,
      domain: 'campaign',
      viewerRole: 'guest-player',
      authority: 'player',
      commandPath: 'host-approved-proposal',
      enabledControls: GUEST_CAMPAIGN_CONTROLS,
      hiddenControls: GM_ONLY_CONTROLS,
      canViewPrivateGmMetadata: false,
      publicResultOnly: true,
      summary: 'Guest proposal path',
      details: [
        'Mutations route to host review',
        'Public results only',
        'GM-private rationale hidden',
      ],
    };
  }

  return {
    screenId: input.screenId ?? `campaign-${input.routeId}`,
    domain: 'campaign',
    viewerRole: 'solo-player',
    authority: 'player',
    commandPath: 'direct-commit',
    enabledControls: ['preview', 'commit', 'view-public-result'],
    hiddenControls: GM_ONLY_CONTROLS,
    canViewPrivateGmMetadata: false,
    publicResultOnly: true,
    summary: 'Player command path',
    details: ['Direct campaign command', 'Public result projection'],
  };
}

export function buildNetworkedTacticalAuthorityProjection(
  input: IBuildNetworkedTacticalAuthorityProjectionInput,
): ICommandAuthorityProjection {
  const isHost =
    input.hostPlayerId != null && input.hostPlayerId === input.playerId;

  if (input.spectator) {
    return {
      screenId: input.screenId ?? 'networked-tactical',
      domain: 'multiplayer',
      viewerRole: 'spectator',
      authority: 'player',
      commandPath: 'read-only',
      enabledControls: ['view-public-result'],
      hiddenControls: ['send-intent', ...GM_ONLY_CONTROLS],
      canViewPrivateGmMetadata: false,
      publicResultOnly: true,
      summary: 'Spectator public mirror',
      details: ['Read-only tactical replay', 'GM-private rationale hidden'],
    };
  }

  if (isHost) {
    return {
      screenId: input.screenId ?? 'networked-tactical',
      domain: 'multiplayer',
      viewerRole: 'host-gm',
      authority: 'host-gm',
      commandPath: 'host-authoritative',
      enabledControls: input.paused
        ? ['view-public-result']
        : NETWORK_HOST_CONTROLS,
      hiddenControls: ['submit-proposal'],
      canViewPrivateGmMetadata: true,
      publicResultOnly: false,
      summary: 'Host tactical authority',
      details: [
        input.paused ? 'Match paused' : 'Authoritative host command path',
        'GM correction previews require approval',
        'Guests receive public results',
      ],
    };
  }

  return {
    screenId: input.screenId ?? 'networked-tactical',
    domain: 'multiplayer',
    viewerRole: 'guest-player',
    authority: 'player',
    commandPath: 'host-validated-intent',
    enabledControls: input.canAct
      ? NETWORK_GUEST_CONTROLS
      : ['view-public-result'],
    hiddenControls: GM_ONLY_CONTROLS,
    canViewPrivateGmMetadata: false,
    publicResultOnly: true,
    summary: input.waitingForOpponent
      ? 'Guest public mirror'
      : 'Guest validated intent path',
    details: [
      input.canAct ? 'Intent sent to host validation' : 'Awaiting host result',
      'Public results only',
      'GM-private rationale hidden',
    ],
  };
}

export function authorityHasControl(
  projection: ICommandAuthorityProjection,
  control: CommandAuthorityControl,
): boolean {
  return projection.enabledControls.includes(control);
}
