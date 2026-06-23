#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const registryPath =
  process.env.MEKSTATION_QC_REGISTRY_PATH ??
  path.join(repoRoot, 'docs', 'qc', 'mekstation-qc-registry.json');
const openSpecChangesDir =
  process.env.MEKSTATION_OPENSPEC_CHANGES_DIR ??
  path.join(repoRoot, 'openspec', 'changes');
const sourceAnchorsPath =
  process.env.MEKSTATION_GM_CAMPAIGN_LEDGER_ANCHORS_PATH ?? null;

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

function parseArgs(argv) {
  return {
    json: argv.includes('--json'),
  };
}

function issue(severity, code, message, details = {}) {
  return { severity, code, message, ...details };
}

function loadRegistry() {
  return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
}

function loadSourceAnchors() {
  if (!sourceAnchorsPath) return defaultSourceAnchors;
  return JSON.parse(fs.readFileSync(sourceAnchorsPath, 'utf8'));
}

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function activeChangeExists(changeId) {
  return fs.existsSync(path.join(openSpecChangesDir, changeId));
}

function validateSurface(surfaceById, issues) {
  const surface = surfaceById.get(requiredSurface.id);
  if (!surface) {
    issues.push(
      issue(
        'error',
        'surface-missing',
        `Required GM campaign ledger surface ${requiredSurface.id} is missing.`,
        { surfaceId: requiredSurface.id },
      ),
    );
    return null;
  }

  if (!surfaceById.has(requiredSurface.parentId)) {
    issues.push(
      issue(
        'error',
        'parent-surface-missing',
        `${requiredSurface.id} parent surface ${requiredSurface.parentId} is missing.`,
        { surfaceId: requiredSurface.id, parentId: requiredSurface.parentId },
      ),
    );
  }

  if (surface.parentId !== requiredSurface.parentId) {
    issues.push(
      issue(
        'error',
        'parent-surface-mismatch',
        `${requiredSurface.id} must be a child of ${requiredSurface.parentId}.`,
        { surfaceId: requiredSurface.id, parentId: surface.parentId },
      ),
    );
  }

  if (!surface.claimIds?.includes(requiredSurface.claimId)) {
    issues.push(
      issue(
        'error',
        'claim-missing',
        `${requiredSurface.id} must include claim ${requiredSurface.claimId}.`,
        { surfaceId: requiredSurface.id, claimId: requiredSurface.claimId },
      ),
    );
  }

  for (const commandToken of requiredSurface.commandIncludes) {
    if (!surface.commands.some((command) => command.includes(commandToken))) {
      issues.push(
        issue(
          'error',
          'command-missing',
          `${requiredSurface.id} must expose a command containing ${commandToken}.`,
          { surfaceId: requiredSurface.id, commandToken },
        ),
      );
    }
  }

  for (const specToken of requiredSurface.specIncludes) {
    if (!surface.specRefs.some((specRef) => specRef.includes(specToken))) {
      issues.push(
        issue(
          'error',
          'spec-ref-missing',
          `${requiredSurface.id} must reference ${specToken}.`,
          { surfaceId: requiredSurface.id, specToken },
        ),
      );
    }
  }

  for (const changeRef of surface.activeChangeRefs ?? []) {
    if (!activeChangeExists(changeRef)) {
      issues.push(
        issue(
          'error',
          'stale-active-change-ref',
          `${requiredSurface.id} references stale or inactive OpenSpec change ${changeRef}.`,
          { surfaceId: requiredSurface.id, changeRef },
        ),
      );
    }
  }

  return {
    surfaceId: requiredSurface.id,
    parentId: surface.parentId,
    claimId: requiredSurface.claimId,
    coverageStatus: surface.coverageStatus,
    commandCount: surface.commands.length,
    activeChangeRefs: surface.activeChangeRefs ?? [],
  };
}

function validateSourceAnchor(anchor, issues) {
  const absolutePath = path.join(repoRoot, anchor.path);
  if (!fs.existsSync(absolutePath)) {
    issues.push(
      issue(
        'error',
        'source-anchor-missing',
        `Required GM campaign ledger source anchor ${anchor.path} is missing.`,
        { anchorId: anchor.id, path: anchor.path },
      ),
    );
    return {
      id: anchor.id,
      path: anchor.path,
      tokenCount: anchor.tokens.length,
      present: false,
    };
  }

  const text = readRepoFile(anchor.path);
  for (const token of anchor.tokens) {
    if (!text.includes(token)) {
      issues.push(
        issue(
          'error',
          'source-anchor-token-missing',
          `${anchor.id} (${anchor.path}) must contain GM campaign ledger token ${token}.`,
          { anchorId: anchor.id, path: anchor.path, token },
        ),
      );
    }
  }

  return {
    id: anchor.id,
    path: anchor.path,
    tokenCount: anchor.tokens.length,
    present: true,
  };
}

function buildManifest() {
  const issues = [];
  const registry = loadRegistry();
  const sourceAnchors = loadSourceAnchors();
  const surfaceById = new Map(
    registry.surfaces.map((surface) => [surface.surfaceId, surface]),
  );
  const surface = validateSurface(surfaceById, issues);
  const anchors = sourceAnchors.map((anchor) =>
    validateSourceAnchor(anchor, issues),
  );

  const errors = issues.filter((item) => item.severity === 'error');
  const warnings = issues.filter((item) => item.severity === 'warning');

  return {
    version: 1,
    status: errors.length > 0 ? 'fail' : 'pass',
    registryPath: path.relative(repoRoot, registryPath).replaceAll('\\', '/'),
    requiredDomains,
    requiredFamilies,
    validatedDomainCount: requiredDomains.length,
    validatedFamilyCount: requiredFamilies.length,
    requiredSurfaceCount: 1,
    validatedSurfaceCount: surface ? 1 : 0,
    sourceAnchorCount: sourceAnchors.length,
    errors,
    warnings,
    issues,
    surface,
    anchors,
  };
}

function printIssues(issues) {
  for (const item of issues) {
    const prefix = item.severity === 'error' ? 'ERROR' : 'WARN';
    console.log(`${prefix}: ${item.message}`);
  }
}

const options = parseArgs(process.argv.slice(2));
const manifest = buildManifest();

if (options.json) {
  console.log(JSON.stringify(manifest, null, 2));
} else {
  printIssues(manifest.issues);
  console.log(
    `[qc:gm:campaign-ledger] surfaces=${manifest.validatedSurfaceCount}/${manifest.requiredSurfaceCount} domains=${manifest.validatedDomainCount}/${manifest.requiredDomains.length} families=${manifest.validatedFamilyCount}/${manifest.requiredFamilies.length} anchors=${manifest.sourceAnchorCount} errors=${manifest.errors.length} warnings=${manifest.warnings.length}`,
  );
}

process.exit(manifest.errors.length > 0 ? 1 : 0);
