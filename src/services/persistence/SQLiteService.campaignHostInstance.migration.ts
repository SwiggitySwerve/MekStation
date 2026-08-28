/**
 * Hosting-server instance singleton (design D2, task 1.1 remainder).
 *
 * One row (`id = 1`) holds the durable `instance_id` for this process.
 * Campaign envelopes copy that value; they never mint a per-write id.
 * ADDITIVE ONLY: no foreign keys into campaigns or journal tables.
 */

const nonempty = (column: string): string => `length(trim(${column})) > 0`;

export const CAMPAIGN_HOST_INSTANCE_MIGRATION = {
  version: 15,
  name: 'campaign_host_instance_schema',
  up: `
    CREATE TABLE IF NOT EXISTS campaign_host_instance (
      id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
      instance_id TEXT NOT NULL CHECK (${nonempty('instance_id')})
    );
  `,
};
