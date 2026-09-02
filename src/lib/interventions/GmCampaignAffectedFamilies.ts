/**
 * The affected-family vocabulary a campaign correction declares
 * (umbrella task 16.1).
 *
 * A correction already carries two things, and neither answers 16.1's
 * question. `correction.family` says what KIND of correction it is
 * (time-advance, salvage-allocation, ...); `changedStateRefs` says which
 * refs moved, as opaque `campaign:<id>:<field>` strings. What a reviewer
 * - and, later, a rebuild - needs is the SET OF DOMAINS the correction
 * affects, named from a closed vocabulary, so that "what does this
 * break?" has an answer that does not depend on knowing that `finances`
 * is a money field and `repairQueue` is not.
 *
 * Two properties this file exists to hold:
 *
 * - **Derived, never re-computed.** Families come from the refs the
 *   preview ALREADY produces. There is no second walk over the campaign
 *   and no second opinion about what changed; if the ref set is right,
 *   the family set is right, and if it is wrong they are wrong together
 *   rather than disagreeing.
 * - **Total over the preview's own field list.** `CAMPAIGN_FIELD_FAMILY`
 *   is declared `satisfies Record<CampaignRootField, ...>`, so a root
 *   field added to `GmTimeCascadePreview` without a family is a COMPILE
 *   error rather than a field that silently affects nothing.
 *
 * TWO HONEST LIMITS, both pinned by tests rather than left to be
 * rediscovered:
 *
 * 1. The letter names eighteen families. The preview compares eleven root
 *    fields, so ten families - transactions, reputation, rewards, salvage,
 *    roster, receipts, scenario-artifacts, activity, audit and
 *    viewer-projection - CANNOT be derived from a field diff today. They
 *    are declared in `UNDERIVABLE_AFFECTED_FAMILIES` and asserted, so the
 *    residue is a fact under test. Deriving them needs sources the
 *    preview does not read (the activity log, the audit projection, the
 *    outcome receipts), which is work beyond this seam.
 * 2. `location` is an EXTENSION beyond the letter's list. The preview
 *    compares `currentSystemId`, and no family in the letter covers where
 *    the campaign is. Mapping it onto `date` because a time cascade moves
 *    both would be inventing a classification; naming it is honest and
 *    keeps the map total.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-persistence/spec.md
 */

/**
 * Every campaign root field the intervention preview diffs.
 *
 * Owned here rather than in the preview so the field list and the
 * family map that must cover it live together, and so the dependency
 * runs one way: the preview imports its classification, never the
 * reverse.
 */
export const CAMPAIGN_ROOT_FIELDS = [
  'currentDate',
  'currentSystemId',
  'repairQueue',
  'partsInventory',
  'unitCombatStates',
  'finances',
  'missions',
  'loans',
  'unitMarket',
  'personnelMarket',
  'contractMarket',
] as const;

/**
 * The closed vocabulary. The eighteen families task 16.1 names, plus
 * `location` (see limit 2 above). Ordered as the letter lists them so the
 * two can be read side by side.
 */
export const CAMPAIGN_AFFECTED_FAMILIES = [
  'date',
  'missions-contracts',
  'finances',
  'transactions',
  'loans',
  'reputation',
  'rewards',
  'salvage',
  'repairs',
  'inventory',
  'roster',
  'unit-pilot-personnel',
  'markets',
  'receipts',
  'scenario-artifacts',
  'activity',
  'audit',
  'viewer-projection',
  'location',
] as const;

export type CampaignAffectedFamily =
  (typeof CAMPAIGN_AFFECTED_FAMILIES)[number];

type CampaignRootField = (typeof CAMPAIGN_ROOT_FIELDS)[number];

/**
 * Every root field the preview diffs, and the family it belongs to.
 *
 * `satisfies` is doing real work: it makes the map TOTAL over the
 * preview's own field list, so the two cannot drift without the build
 * saying so.
 */
export const CAMPAIGN_FIELD_FAMILY = {
  currentDate: 'date',
  currentSystemId: 'location',
  repairQueue: 'repairs',
  partsInventory: 'inventory',
  unitCombatStates: 'unit-pilot-personnel',
  finances: 'finances',
  missions: 'missions-contracts',
  loans: 'loans',
  unitMarket: 'markets',
  personnelMarket: 'markets',
  contractMarket: 'markets',
} as const satisfies Record<CampaignRootField, CampaignAffectedFamily>;

/**
 * The families the letter names that no field diff can reach today.
 *
 * Declared rather than omitted: an absent family and an underivable one
 * look identical in a preview, and only one of them is a gap somebody
 * should be able to see.
 */
export const UNDERIVABLE_AFFECTED_FAMILIES = [
  'transactions',
  'reputation',
  'rewards',
  'salvage',
  'roster',
  'receipts',
  'scenario-artifacts',
  'activity',
  'audit',
  'viewer-projection',
] as const satisfies readonly CampaignAffectedFamily[];

/** Canonical order for a declared set: the vocabulary's own order. */
const FAMILY_ORDER = new Map<CampaignAffectedFamily, number>(
  CAMPAIGN_AFFECTED_FAMILIES.map((family, index) => [family, index]),
);

/**
 * The field a `campaign:<id>:<field>` ref names, or null.
 *
 * A ref for another campaign is not this correction's business, and a ref
 * naming something that is not a compared root field (an external effect,
 * a conflict's own ref) has no family here - both yield null rather than
 * a guess.
 */
function fieldOfRef(campaignId: string, ref: string): CampaignRootField | null {
  const prefix = `campaign:${campaignId}:`;
  if (!ref.startsWith(prefix)) return null;
  const field = ref.slice(prefix.length);
  return (CAMPAIGN_ROOT_FIELDS as readonly string[]).includes(field)
    ? (field as CampaignRootField)
    : null;
}

/**
 * The families a correction affects, derived from the refs it changed.
 *
 * Deduplicated (three market fields are one `markets` family) and sorted
 * into the vocabulary's order, so two previews that found the same
 * domains declare the same list regardless of the order the diff walked.
 * An empty ref set declares an EMPTY family set - a correction that
 * changed nothing affects nothing, and defaulting to everything would
 * make the declaration useless precisely when it matters.
 */
export function declareAffectedFamilies(
  campaignId: string,
  changedStateRefs: readonly string[],
): readonly CampaignAffectedFamily[] {
  const families = new Set<CampaignAffectedFamily>();
  for (const ref of changedStateRefs) {
    const field = fieldOfRef(campaignId, ref);
    if (field === null) continue;
    families.add(CAMPAIGN_FIELD_FAMILY[field]);
  }
  return Object.freeze(
    Array.from(families).sort(
      (left, right) =>
        (FAMILY_ORDER.get(left) ?? 0) - (FAMILY_ORDER.get(right) ?? 0),
    ),
  );
}
