/**
 * Campaign construction-maxima population.
 *
 * Seam for `R9.roster-damage` slice S2. Declared here with no behaviour
 * so the red-first characterization commit typechecks; the resolution
 * through the canonical/custom source authority lands in the next commit.
 *
 * @spec openspec/specs/campaign-unit-combat-state/spec.md
 */

/**
 * Fill in `campaign.unitMaxStates` for roster units that have no entry.
 */
export async function ensureCampaignUnitMaxStates(): Promise<void> {
  return Promise.resolve();
}
