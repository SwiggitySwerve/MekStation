#!/usr/bin/env node
import {
  buildLedgerQcManifest,
  parseArgs,
  printLedgerQcResult,
} from './gm-ledger-qc-core.mjs';

const requiredSurface = {
  id: 'post-combat-base-economy-gm-ledger',
  parentId: 'campaign-economy-progression',
  claimId: 'campaign.gm-ledger.post-combat-economy',
  commandIncludes: [
    'qc:gm:campaign-ledger:validate',
    'GmCampaignInterventionImplementer.test.ts',
    'GmCampaignInterventionBoundaries.test.ts',
  ],
  specIncludes: [
    'intervention-ledger-abstraction',
    'gm-cascade-preview',
    'gm-campaign-intervention-boundaries',
    'campaign-finances',
    'markets-system',
    'repair-maintenance',
  ],
};

const requiredDomains = ['post-combat', 'economy', 'repair', 'salvage'];
const requiredFamilies = [
  'salvage-allocation',
  'repair-ticket',
  'funds-transaction',
  'inventory-lot',
  'base-unit-state',
];

const defaultSourceAnchors = [
  {
    id: 'campaign-intervention-types',
    path: 'src/types/interventions/GmCampaignInterventionTypes.ts',
    tokens: [
      'GmCampaignInterventionDomain',
      "'post-combat'",
      "'economy'",
      "'repair'",
      "'salvage'",
      'GmCampaignCorrectionFamily',
      "'salvage-allocation'",
      "'repair-ticket'",
      "'funds-transaction'",
      "'inventory-lot'",
      "'base-unit-state'",
      'gm.campaign.salvage_allocation_corrected',
      'gm.campaign.repair_ticket_corrected',
      'gm.campaign.funds_transaction_corrected',
      'gm.campaign.inventory_lot_corrected',
      'gm.campaign.base_unit_state_corrected',
    ],
  },
  {
    id: 'campaign-intervention-implementer',
    path: 'src/lib/interventions/GmCampaignInterventionImplementer.ts',
    tokens: [
      'CAMPAIGN_INTERVENTION_DOMAINS',
      "'post-combat'",
      "'economy'",
      "'repair'",
      "'salvage'",
      'registerGmCampaignInterventionImplementers',
      'isCampaignCommandPayload',
      "'salvage-allocation'",
      "'repair-ticket'",
      "'funds-transaction'",
      "'inventory-lot'",
      "'base-unit-state'",
    ],
  },
  {
    id: 'campaign-preview-effect-builders',
    path: 'src/lib/interventions/GmCampaignInterventionPreview.ts',
    tokens: [
      'buildGmCampaignProjectedEffect',
      'buildSalvageAllocationEffect',
      'buildRepairTicketEffect',
      'buildFundsTransactionEffect',
      'buildInventoryLotEffect',
      'buildBaseUnitStateEffect',
      'campaign-salvage-allocation-not-found',
      'campaign-repair-ticket-not-found',
      'campaign-base-unit-state-empty',
    ],
  },
  {
    id: 'campaign-effect-projection-replay',
    path: 'src/lib/interventions/GmCampaignInterventionProjection.ts',
    tokens: [
      'projectCampaignEffectsForRecord',
      'applyGmCampaignProjectedEffects',
      'applySalvageAllocationEffect',
      'applyRepairTicketEffect',
      'applyFundsTransactionEffect',
      'applyInventoryLotEffect',
      'applyBaseUnitStateEffect',
      'appendGmCampaignEvent',
    ],
  },
  {
    id: 'cascade-approval-action-ledger',
    path: 'src/lib/interventions/GmCascadePreviewPipeline.ts',
    tokens: [
      'approveGmCascadePreview',
      'appendGmInterventionRecord',
      'requires-manual-takeover',
      'Cannot approve GM cascade preview',
      'post-combat',
      'economy',
      'repair',
      'salvage',
    ],
  },
  {
    id: 'action-ledger-redaction-projections',
    path: 'src/lib/interventions/ActionLedger.ts',
    tokens: [
      'appendGmInterventionRecord',
      'projectForPlayer',
      'projectForGm',
      "status: record.status === 'manual' ? 'manual' : 'approved'",
    ],
  },
  {
    id: 'campaign-ledger-focused-tests',
    path: 'src/lib/interventions/__tests__/GmCampaignInterventionImplementer.test.ts',
    tokens: [
      'previews and applies salvage allocation corrections with player-safe output',
      'previews and applies repair ticket corrections',
      'applies funds corrections through the intervention and action ledgers',
      'previews and applies inventory and base unit state corrections',
      'requires manual takeover for unresolved campaign cascades and blocks approval',
      'rejects non-GM campaign corrections without returning private metadata',
      'replays projected effects for %s corrections',
      'projectForPlayer',
      'projectForGm',
      'merchant-reversal-1',
    ],
  },
  {
    id: 'campaign-boundary-redaction-tests',
    path: 'src/lib/interventions/__tests__/GmCampaignInterventionBoundaries.test.ts',
    tokens: [
      'secret merchant inventory branch',
      "not.toContain('secret merchant')",
      'logs deferred time attempts without exposing hidden scenario notes',
    ],
  },
];

const options = parseArgs(process.argv.slice(2));
const manifest = buildLedgerQcManifest({
  entityLabel: 'GM campaign ledger',
  tokenLabel: 'GM campaign ledger',
  sourceAnchorsEnvVar: 'MEKSTATION_GM_CAMPAIGN_LEDGER_ANCHORS_PATH',
  requiredSurface,
  requiredDomains,
  requiredFamilies,
  defaultSourceAnchors,
});

if (options.json) {
  console.log(JSON.stringify(manifest, null, 2));
} else {
  printLedgerQcResult(manifest, { label: 'qc:gm:campaign-ledger' });
}

process.exit(manifest.errors.length > 0 ? 1 : 0);
