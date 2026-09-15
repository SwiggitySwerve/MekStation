/**
 * The cutover CLI's argument contract (task 5.7, D10).
 *
 * The compositions themselves are proven in
 * `src/lib/campaign/authority/__tests__/campaignAuthorityCutoverOps.test.ts`.
 * What is proven HERE is the one thing only the CLI can get wrong: which
 * reviewed act it decides to run. A subcommand that fell through to a
 * default, or a missing id read as an empty campaign, would run the wrong
 * act against a real database.
 */

import { CUTOVER_USAGE, parseCutoverArgs } from '../campaign-authority-cutover';

describe('campaign authority cutover CLI arguments', () => {
  it('parses each reviewed act with its campaign', () => {
    expect(parseCutoverArgs(['parity', 'campaign-7'])).toEqual({
      command: 'parity',
      campaignId: 'campaign-7',
    });
    expect(parseCutoverArgs(['rollback', 'campaign-7'])).toEqual({
      command: 'rollback',
      campaignId: 'campaign-7',
    });
  });

  it('refuses an unknown or missing subcommand rather than defaulting', () => {
    expect(() => parseCutoverArgs(['parrity', 'campaign-7'])).toThrow(
      /Unknown command/,
    );
    expect(() => parseCutoverArgs([])).toThrow(/Unknown command/);
  });

  it('refuses a missing campaign id, including a flag in its place', () => {
    expect(() => parseCutoverArgs(['parity'])).toThrow(/requires a campaignId/);
    expect(() => parseCutoverArgs(['rollback', '--force'])).toThrow(
      /requires a campaignId/,
    );
  });

  it('refuses extra arguments instead of silently ignoring them', () => {
    expect(() => parseCutoverArgs(['parity', 'a', 'b'])).toThrow(
      /Unexpected extra argument/,
    );
  });

  it('documents both acts and the exit codes a shell would branch on', () => {
    expect(CUTOVER_USAGE).toContain('parity <campaignId>');
    expect(CUTOVER_USAGE).toContain('rollback <campaignId>');
    expect(CUTOVER_USAGE).toContain('EXIT CODES');
  });
});
