#!/usr/bin/env npx tsx
/**
 * Campaign Authority Cutover
 *
 * The operator entry point for the D10 migration-state machine
 * (design-campaign-authority-and-sync task 5.7). Two subcommands, one
 * campaign at a time, both reviewed acts a human runs deliberately:
 *
 *   parity <campaignId>     Replay the journal beside the live snapshot
 *                           projection and advance a `shadowing` campaign
 *                           to `journal` (projections agree) or `blocked`
 *                           (they do not, both digests preserved).
 *   rollback <campaignId>   Return a campaign to snapshot authority while
 *                           the D10 rollback law still permits it. Journal
 *                           rows are never deleted.
 *
 * DELIBERATELY NOT A CRON AND NOT A ROUTE. `shadowing` exists so that a
 * cutover is reviewed; something that advanced campaigns on a timer, or on
 * a request, would be the unreviewed cutover the state was invented to
 * prevent. This file is the only caller of the ops module, and nothing
 * under src/pages imports either.
 *
 * Every outcome the machinery can produce is printed as itself and mapped
 * to its own exit code, so a refusal is never mistaken for a success by a
 * shell that only inspects the status:
 *   0  cutover / rolled-back        the campaign moved
 *   2  blocked                      parity mismatch; the marker records both digests
 *   3  refused                      not a candidate (wrong state, no marker,
 *                                   no snapshot, rollback prohibited)
 *   1  usage or runtime error
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D10)
 */

import {
  durableCampaignAuthorityCutoverDeps,
  rollbackCampaignAuthority,
  runCampaignParityCutover,
} from '../src/lib/campaign/authority/campaignAuthorityCutoverOps';
import {
  getSQLiteService,
  resetSQLiteService,
} from '../src/services/persistence/SQLiteService';

export type CutoverCommand = 'parity' | 'rollback';

export interface ICutoverArgs {
  readonly command: CutoverCommand;
  readonly campaignId: string;
}

export const CUTOVER_USAGE = `campaign-authority-cutover - drive one campaign's D10 migration state

USAGE
  npx tsx scripts/campaign-authority-cutover.ts parity <campaignId>
  npx tsx scripts/campaign-authority-cutover.ts rollback <campaignId>

COMMANDS
  parity <campaignId>     Compare the journal replay against the live snapshot
                          projection and advance a 'shadowing' campaign to
                          'journal' or 'blocked'. Refused for any other state:
                          after cutover nothing maintains the snapshot, so a
                          mismatch there would be an artefact of the check.
  rollback <campaignId>   Return the campaign to snapshot authority. Permitted
                          only while the journal head equals the imported
                          baseline AND no journal-authority command has
                          committed (D10). Journal rows are never deleted.

EXIT CODES
  0  the campaign moved (cutover / rolled-back)
  2  parity mismatch: the marker now records both digests and is 'blocked'
  3  refused: not a candidate, or the rollback law prohibits it
  1  usage or runtime error
`;

/**
 * Parse the two positional arguments. Strict on purpose: a typo'd
 * subcommand that fell through to a default would run the wrong reviewed
 * act against a real campaign.
 */
export function parseCutoverArgs(argv: readonly string[]): ICutoverArgs {
  const [command, campaignId, ...rest] = argv;
  if (command !== 'parity' && command !== 'rollback') {
    throw new Error(`Unknown command: ${command ?? '(none)'}`);
  }
  if (campaignId === undefined || campaignId.startsWith('-')) {
    throw new Error(`${command} requires a campaignId argument`);
  }
  if (rest.length > 0) {
    throw new Error(`Unexpected extra argument: ${rest[0]}`);
  }
  return { command, campaignId };
}

async function cliMain(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(CUTOVER_USAGE);
    process.exit(0);
  }

  let args: ICutoverArgs;
  try {
    args = parseCutoverArgs(argv);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'argument parse error';
    process.stderr.write(`error: ${message}\n\n${CUTOVER_USAGE}`);
    process.exit(1);
  }

  // The user's actual SQLite database, the same one the server opens.
  resetSQLiteService();
  getSQLiteService().initialize();
  const deps = durableCampaignAuthorityCutoverDeps();

  const outcome =
    args.command === 'parity'
      ? await runCampaignParityCutover(deps, args.campaignId)
      : await rollbackCampaignAuthority(deps, args.campaignId);

  process.stdout.write(`${JSON.stringify(outcome, null, 2)}\n`);
  if (outcome.kind === 'cutover' || outcome.kind === 'rolled-back') {
    process.exit(0);
  }
  process.exit(outcome.kind === 'blocked' ? 2 : 3);
}

if (require.main === module) {
  cliMain().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`campaign-authority-cutover failed: ${message}\n`);
    process.exit(1);
  });
}
