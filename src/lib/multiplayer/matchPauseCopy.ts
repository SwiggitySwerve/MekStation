import type { MatchPauseReason } from '@/types/multiplayer/Protocol';

/**
 * One sentence per non-peer pause cause, shared by the pause error and
 * the pause overlay so the two never disagree. A `peer-pending` pause is
 * worded from its pending seats and countdown instead.
 */
export const MATCH_PAUSE_MESSAGES: Readonly<
  Record<Exclude<MatchPauseReason, 'peer-pending'>, string>
> = {
  'gm-absent': 'Waiting for the GM to return.',
  'opponent-fault':
    'The server opponent hit an error; rejoining the match retries it.',
};
