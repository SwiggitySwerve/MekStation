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
    'verify:qc:gm:campaign-browser',
    'gm-campaign-ledger-control-plane.spec.ts',
    'GmCampaignInterventionImplementer.test.ts',
    'GmCampaignInterventionBoundaries.test.ts',
    'GmCampaignInterventionControlPlane.test.tsx',
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
    id: 'campaign-gm-ledger-route',
    path: 'src/pages/gameplay/campaigns/[id]/gm-ledger.tsx',
    tokens: [
      'GmCampaignInterventionControlPlane',
      'GmCampaignPlayerLedgerView',
      'resolveCampaignAuthorityFromSession',
      'useCampaignPersistenceStore',
      'markDirty',
      "currentPage: 'gm-ledger'",
      'onApplyCampaignUpdate',
    ],
  },
  {
    id: 'campaign-gm-ledger-authority-helper',
    path: 'src/lib/campaign/campaignAuthority.ts',
    tokens: [
      'resolveCampaignAuthorityFromSession',
      'canUseCampaignGmControls',
      'single-player-owner',
      'coop-host',
      'coop-guest',
      'canViewGmPrivateLedger',
    ],
  },
  {
    id: 'campaign-gm-ledger-control-plane',
    path: 'src/components/campaign/gm/GmCampaignInterventionControlPlane.tsx',
    tokens: [
      'gm-ledger-preview-btn',
      'gm-ledger-approve-btn',
      'gm-ledger-player-log',
      'createGmCascadePreview',
      'approveGmCascadePreview',
      'requires-manual-takeover',
      'No campaign state changed',
    ],
  },
  {
    id: 'campaign-gm-ledger-control-plane-helpers',
    path: 'src/components/campaign/gm/GmCampaignInterventionControlPlane.helpers.ts',
    tokens: [
      'buildMerchantReversalCommand',
      'MERCHANT_REVERSAL_ID',
      'projectForPlayer',
      'projectForGm',
      'Hidden campaign merchant reversal',
    ],
  },
  {
    id: 'campaign-gm-ledger-player-view',
    path: 'src/components/campaign/gm/GmCampaignPlayerLedgerView.tsx',
    tokens: [
      'gm-ledger-player-only-view',
      'gm-ledger-player-only-notice',
      'buildPersistedCampaignEventRows',
      'GM controls are available only to the campaign owner or co-op host',
    ],
  },
  {
    id: 'campaign-gm-ledger-projections',
    path: 'src/components/campaign/gm/GmCampaignLedgerProjection.tsx',
    tokens: [
      'gm-ledger-private-log',
      'publicEffect.summary',
      'privateMetadata',
    ],
  },
  {
    id: 'campaign-gm-ledger-browser-proof',
    path: 'e2e/gm-campaign-ledger-control-plane.spec.ts',
    tokens: [
      'previews, approves, and redacts a merchant reversal',
      'guest direct route shows only player-safe ledger projection',
      'saves and reloads a player-safe merchant reversal from the server campaign list',
      'blocks conflicted cascades until the GM takes manual control',
      'readServerLedgerSnapshot',
      'campaign-save-now-btn',
      'campaign-card-',
      'gm-ledger-player-log',
      'gm-ledger-private-log',
      'gm-ledger-player-only-notice',
      "getByRole('navigation', { name: 'Campaign sections' })",
      'not.toContainText',
    ],
  },
  {
    id: 'campaign-gm-ledger-control-plane-tests',
    path: 'src/components/campaign/gm/__tests__/GmCampaignInterventionControlPlane.test.tsx',
    tokens: [
      'previews and approves a funds correction with player-safe output',
      'GmCampaignPlayerLedgerView',
      'renders only player-safe persisted ledger rows',
      'blocks conflicted approval and records manual takeover without mutating state',
      'Hidden campaign',
      'No campaign state changed',
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
