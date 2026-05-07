/**
 * Public API barrel for the replay-library module. Per add-replay-library
 * (PR 1 introduces types only; PR 2 adds index reader/writer; PR 3 adds
 * backfill scan; subsequent PRs wire writers + UI).
 */

export { scanReplayDirectory } from './backfill-scan';
export type { IScanReplayDirectoryOptions } from './backfill-scan';
export { defaultBackfillScan, readReplayIndex } from './index-reader';
export type { BackfillScan, IReadReplayIndexOptions } from './index-reader';
export { appendManifestEntry } from './index-writer';
export type { IAppendManifestEntryOptions } from './index-writer';
export type {
  ICampaignReplayManifestEntry,
  IPvPReplayManifestEntry,
  IQuickReplayManifestEntry,
  IReplayManifestEntry,
  IReplayManifestEntryBase,
  ISwarmReplayManifestEntry,
} from './types';
