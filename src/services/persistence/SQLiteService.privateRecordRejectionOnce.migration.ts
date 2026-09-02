/**
 * Append-once private rejection-detail identity (task 2.3 residual 9).
 *
 * rejection-detail rows are the one private kind keyed by session plus
 * command. The partial unique index names that pair without forcing
 * gm-draft (and the other kinds) to carry a command_id or to be unique
 * on one. command_id stays nullable on the table.
 *
 * The INSERT trigger requires a nonempty command_id only for
 * rejection-detail. No UPDATE trigger is added: erase and redact must
 * keep working through the shipped private_record_no_rewrite.
 *
 * Residual 5 is closed by receipt, not by a table: campaign delivery is
 * journal plus delivery-epoch plus live subscribe. Nothing would consume
 * a campaign-session outbox, so this file does not create one.
 */
export const PRIVATE_RECORD_REJECTION_ONCE_MIGRATION = {
  version: 29,
  name: 'private_record_rejection_detail_once',
  up: `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_private_record_rejection_detail
      ON private_record (campaign_session_id, command_id)
      WHERE record_kind = 'rejection-detail';

    CREATE TRIGGER IF NOT EXISTS private_record_rejection_detail_requires_command
      BEFORE INSERT ON private_record
      WHEN NEW.record_kind = 'rejection-detail'
        AND (NEW.command_id IS NULL OR length(trim(NEW.command_id)) = 0)
      BEGIN
        SELECT RAISE(ABORT, 'rejection-detail rows require a nonempty command_id');
      END;
  `,
};
