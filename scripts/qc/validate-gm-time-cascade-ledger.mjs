#!/usr/bin/env node
import {
  buildLedgerQcManifest,
  parseArgs,
  printLedgerQcResult,
} from './gm-ledger-qc-core.mjs';

const requiredSurface = {
  id: 'time-cascade-gm-ledger',
  parentId: 'campaign-economy-progression',
  claimId: 'campaign.gm-ledger.time-cascade',
  commandIncludes: [
    'qc:gm:time-cascade:validate',
    'verify:qc:gm:campaign-browser',
    'gm-campaign-ledger-control-plane.spec.ts',
    'GmRosterRecoveryProjection.test.ts',
    'GmTimeCascadeInterventionImplementer.test.ts',
    'GmCampaignInterventionBoundaries.test.ts',
    'GmCampaignInterventionControlPlane.test.tsx',
    'marketProcessors.test.ts',
  ],
  specIncludes: [
    'time-cascade-system',
    'day-progression',
    'intervention-ledger-abstraction',
    'gm-cascade-preview',
    'gm-campaign-intervention-boundaries',
  ],
};

const requiredDomains = ['time'];
const requiredFamilies = ['time-advance'];
const requiredProcessors = [
  'repairProgressProcessor',
  'contractProcessor',
  'dailyCostsProcessor',
  'unitMarketProcessor',
  'personnelMarketProcessor',
  'contractMarketProcessor',
];
const requiredCampaignRoots = [
  'currentDate',
  'currentSystemId',
  'timeCascadeEvents',
  'repairQueue',
  'partsInventory',
  'unitCombatStates',
  'finances',
  'missions',
  'loans',
  'unitMarket',
  'personnelMarket',
  'contractMarket',
];

const defaultSourceAnchors = [
  {
    id: 'time-cascade-types',
    path: 'src/types/interventions/GmTimeCascadeInterventionTypes.ts',
    tokens: [
      'GmTimeCascadeInterventionDomain',
      "'time'",
      'GmTimeCascadeCorrectionFamily',
      "'time-advance'",
      'IGmTimeCascadeAdvanceCorrection',
      'baseUpdatedAt',
      'baseCurrentDate',
      'externalEffectRefs',
      'projectedExternalEffects',
      'IGmTimeCascadeDaySummary',
      'gm.campaign.time_cascade_applied',
      'IGmTimeCascadeProjectedEffect',
      'afterCampaign',
      'daySummaries',
      'generatedEvents',
      'externalEffects',
      'IGmTimeCascadePublicEffect',
    ],
  },
  {
    id: 'time-cascade-implementer',
    path: 'src/lib/interventions/GmTimeCascadeInterventionImplementer.ts',
    tokens: [
      "domain: 'time'",
      'buildGmTimeCascadeProjectedEffect',
      'applyGmTimeCascadeProjectedEffects',
      'projectTimeCascadeEffectsForRecord',
      'registerGmTimeCascadeInterventionImplementer',
      'isTimeCascadeCommandPayload',
      "payload.correction.family === 'time-advance'",
    ],
  },
  {
    id: 'time-cascade-preview-processors',
    path: 'src/lib/interventions/GmTimeCascadePreview.ts',
    tokens: [
      'TIME_CASCADE_PROCESSORS',
      'repairProgressProcessor',
      'contractProcessor',
      'dailyCostsProcessor',
      'unitMarketProcessor',
      'personnelMarketProcessor',
      'contractMarketProcessor',
      'findSystemById',
      'time-cascade-base-stale',
      'time-cascade-date-stale',
      'time-cascade-destination-unknown',
      'time-cascade-external-effect-unprojected',
      'requiresManualTakeover: true',
      'CAMPAIGN_ROOT_FIELDS',
      'projectDays',
      'daySummaries',
      'processorsRun',
    ],
  },
  {
    id: 'time-cascade-projection-replay',
    path: 'src/lib/interventions/GmTimeCascadeProjection.ts',
    tokens: [
      'projectTimeCascadeEffectsForRecord',
      'applyGmTimeCascadeProjectedEffects',
      'applyGmTimeCascadeProjectedEffect',
      'timeCascadeEvents',
    ],
  },
  {
    id: 'time-cascade-roster-recovery-projection',
    path: 'src/lib/interventions/GmRosterRecoveryProjection.ts',
    tokens: [
      'projectRosterRecoveryExternalEffects',
      'buildRosterRecoveryPatchesFromExternalEffects',
      'gm.roster.recovery',
      'CampaignPilotStatus.Wounded',
      'CampaignPilotStatus.Active',
      ':recovery',
      'recovery advanced',
    ],
  },
  {
    id: 'time-cascade-focused-tests',
    path: 'src/lib/interventions/__tests__/GmTimeCascadeInterventionImplementer.test.ts',
    tokens: [
      'previews and applies one day without mutating the source campaign',
      'replays stored projected effects for multi-day repair completion',
      'stores repeated cascades without recursively nesting prior event history',
      'records action-ledger projections while redacting GM-private context',
      'supports optional travel in the same projected cascade',
      'blocks invalid day counts before approval',
      'blocks stale base campaign versions',
      'blocks approval when campaign state changes after preview creation',
      'blocks unknown travel destinations',
      'requires manual takeover when external effects are named but not projected',
      'approves external effects once the cascade includes their projection',
      'projectForPlayer',
      'projectForGm',
      'new-avalon',
      'roster:pilot-1:fatigue',
    ],
  },
  {
    id: 'time-cascade-roster-recovery-tests',
    path: 'src/lib/interventions/__tests__/GmRosterRecoveryProjection.test.ts',
    tokens: [
      'projects wounded pilot recovery as a time-cascade external effect',
      'returns wounded pilots to active duty when recovery and injuries clear',
      'skips active pilots without recovery state',
      'builds roster patches from approved external effects',
    ],
  },
  {
    id: 'time-cascade-boundary-tests',
    path: 'src/lib/interventions/__tests__/GmCampaignInterventionBoundaries.test.ts',
    tokens: [
      'executes time interventions when the time cascade implementer is registered',
      'logs deferred time attempts without exposing hidden scenario notes',
      'secret merchant inventory branch',
      'registerGmTimeCascadeInterventionImplementer',
    ],
  },
  {
    id: 'time-cascade-day-processor-registration',
    path: 'src/lib/campaign/processors/processorRegistration.ts',
    tokens: [
      'repairProgressProcessor',
      'contractProcessor',
      'dailyCostsProcessor',
      'unitMarketProcessor',
      'personnelMarketProcessor',
      'contractMarketProcessor',
      'pipeline.register(repairProgressProcessor)',
      'pipeline.register(contractProcessor)',
      'pipeline.register(dailyCostsProcessor)',
      'pipeline.register(unitMarketProcessor)',
      'pipeline.register(personnelMarketProcessor)',
      'pipeline.register(contractMarketProcessor)',
    ],
  },
  {
    id: 'time-cascade-day-processor-focused-tests',
    path: 'src/lib/campaign/processors/__tests__/processors.test.ts',
    tokens: [
      'contractProcessor',
      'dailyCostsProcessor',
      "expect(contractProcessor.id).toBe('contracts')",
      "expect(dailyCostsProcessor.id).toBe('dailyCosts')",
    ],
  },
  {
    id: 'time-cascade-repair-processor-tests',
    path: 'src/lib/campaign/processors/__tests__/repairProgressProcessor.test.ts',
    tokens: [
      'repairProgressProcessor',
      "expect(repairProgressProcessor.id).toBe('repair-progress')",
      'repairQueue',
      'repair_completed',
    ],
  },
  {
    id: 'time-cascade-market-processor-tests',
    path: 'src/lib/campaign/processors/__tests__/marketProcessors.test.ts',
    tokens: [
      'unitMarketProcessor',
      'personnelMarketProcessor',
      'contractMarketProcessor',
      'Unit market refreshed',
      'Personnel market refreshed',
      'Contract market refreshed',
      'unit market refresh stores the generated offers on campaign.unitMarket',
      'personnel market refresh appends the day offers and prunes expired ones',
      'contract market refresh replaces offers and clears declined ids',
    ],
  },
  {
    id: 'time-cascade-gm-ledger-route',
    path: 'src/pages/gameplay/campaigns/[id]/gm-ledger.tsx',
    tokens: [
      'GmCampaignInterventionControlPlane',
      "currentPage: 'gm-ledger'",
      'onApplyCampaignUpdate',
    ],
  },
  {
    id: 'time-cascade-gm-ledger-control-plane',
    path: 'src/components/campaign/gm/GmCampaignInterventionControlPlane.tsx',
    tokens: [
      'registerGmTimeCascadeInterventionImplementer',
      'buildRosterRecoveryPatchesFromExternalEffects',
      'useCampaignRosterStore',
      'applyPilotPatches',
      'buildTimeCascadeCommand',
      'GmCampaignInterventionActions',
      'TIME_CASCADE_ID',
      'TIME_CASCADE_MANUAL_ID',
    ],
  },
  {
    id: 'time-cascade-gm-ledger-actions',
    path: 'src/components/campaign/gm/GmCampaignInterventionActions.tsx',
    tokens: [
      // Time previews now flow through the unified correction-type <select>
      // ("time" / "time-conflict" options) + the single "Generate correction"
      // control, not standalone per-type buttons.
      'gm-ledger-correction-type',
      'onTimePreview(false)',
      'onTimePreview(true)',
    ],
  },
  {
    id: 'time-cascade-gm-ledger-component-tests',
    path: 'src/components/campaign/gm/__tests__/GmCampaignInterventionControlPlane.test.tsx',
    tokens: [
      'previews and approves a time cascade with player-safe output',
      'previews and applies roster recovery external effects on time approval',
      'gm-ledger-correction-type',
      'gm-ledger-preview-time-effect',
      'gm-ledger-preview-external-effects',
      'Mira Holt recovery advanced 2 days',
      'Hidden time cascade',
      'timeCascadeEvents',
    ],
  },
  {
    id: 'time-cascade-gm-ledger-browser-proof',
    path: 'e2e/gm-campaign-ledger-control-plane.spec.ts',
    tokens: [
      'previews and approves an accumulated time cascade',
      'blocks unprojected external time effects until manual takeover',
      'gm-ledger-correction-type',
      'generateCorrection',
      'timeCascadeEventCount',
      'Campaign time corrected by 2 days.',
      'not.toContainText',
    ],
  },
];

const options = parseArgs(process.argv.slice(2));
const manifest = buildLedgerQcManifest({
  entityLabel: 'GM time cascade ledger',
  tokenLabel: 'GM time cascade ledger',
  sourceAnchorsEnvVar: 'MEKSTATION_GM_TIME_CASCADE_ANCHORS_PATH',
  requiredSurface,
  requiredDomains,
  requiredFamilies,
  defaultSourceAnchors,
  extraRequirements: {
    requiredProcessors,
    requiredCampaignRoots,
  },
});

if (options.json) {
  console.log(JSON.stringify(manifest, null, 2));
} else {
  printLedgerQcResult(manifest, {
    label: 'qc:gm:time-cascade',
    extraSummaryFields: [
      { label: 'processors', manifestKey: 'requiredProcessors' },
      { label: 'roots', manifestKey: 'requiredCampaignRoots' },
    ],
  });
}

process.exit(manifest.errors.length > 0 ? 1 : 0);
