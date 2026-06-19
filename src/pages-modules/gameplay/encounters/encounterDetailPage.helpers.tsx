import { useCallback, useState } from 'react';

import type { IBatchResult } from '@/simulation/batchOutcome';
import type { IQuickResolveBattleConfig } from '@/simulation/QuickResolveService';
import type { IEncounter, IEncounterValidationResult } from '@/types/encounter';
import type { IForce } from '@/types/force';
import type { IPilot } from '@/types/pilot';

import { GenerateScenarioModal } from '@/components/gameplay/GenerateScenarioModal';
import {
  DeleteEncounterConfirmDialog,
  EncounterActionsFooter,
  EncounterScenarioGeneratorSection,
  EncounterWatchReplayButton,
} from '@/components/gameplay/pages/EncounterDetailPage.actions';
import { EncounterRepairBanner } from '@/components/gameplay/pages/EncounterDetailPage.repairBanner';
import {
  EncounterBattleSettingsCard,
  EncounterForcesCard,
  EncounterValidationCard,
} from '@/components/gameplay/pages/EncounterDetailPage.sections';
import { buildPreparedBattleData } from '@/components/gameplay/pages/preBattleSessionBuilder';
import { QuickResolveLauncher } from '@/components/gameplay/quickResolve/QuickResolveLauncher';
import { QuickSimResultSummary } from '@/components/gameplay/QuickSimResultSummary';
import { useToast } from '@/components/shared/Toast';
import { Badge, Button } from '@/components/ui';
import { encounterBrokenRefs } from '@/services/encounter/encounterBrokenRefs';
import { EncounterStatus, SCENARIO_TEMPLATES } from '@/types/encounter';
import { getStatusColor, getStatusLabel } from '@/utils/encounterStatus';
import { logger } from '@/utils/logger';

type RawForceIds = {
  readonly playerForceId: string | null;
  readonly opponentForceId: string | null;
} | null;

type EncounterTemplate = (typeof SCENARIO_TEMPLATES)[number] | null;
type Breadcrumb = { readonly label: string; readonly href?: string };
type QuickResolvePrepResult = {
  readonly battle: IQuickResolveBattleConfig | null;
  readonly closeQuickResolveModal: () => void;
  readonly isPreparingBattle: boolean;
  readonly openQuickResolveModal: () => Promise<void>;
  readonly runCount: number;
  readonly setRunCount: React.Dispatch<React.SetStateAction<number>>;
  readonly showQuickResolveModal: boolean;
};
type QuickResolvePrep = ReturnType<typeof useQuickResolveEncounterPrep>;

export function getEncounterTemplate(
  templateType: string | undefined,
): EncounterTemplate {
  if (!templateType) return null;
  return SCENARIO_TEMPLATES.find((item) => item.type === templateType) ?? null;
}

export function buildEncounterBreadcrumbs(encounterName: string): Breadcrumb[] {
  return [
    { label: 'Home', href: '/' },
    { label: 'Gameplay', href: '/gameplay' },
    { label: 'Encounters', href: '/gameplay/encounters' },
    { label: encounterName },
  ];
}

export function findForceById(
  forces: readonly IForce[],
  forceId: string | undefined,
): IForce | undefined {
  return forceId ? forces.find((force) => force.id === forceId) : undefined;
}

export function EncounterDetailHeaderActions({
  encounterStatus,
  gameSessionId,
  canLaunch,
  isPreparingBattle,
  isBattleLocked,
  onOpenQuickResolve,
  onLaunch,
}: {
  readonly encounterStatus: EncounterStatus;
  readonly gameSessionId: string | undefined;
  readonly canLaunch: boolean;
  readonly isPreparingBattle: boolean;
  readonly isBattleLocked: boolean;
  readonly onOpenQuickResolve: () => Promise<void>;
  readonly onLaunch: () => void;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-3">
      <Badge
        variant={getStatusColor(encounterStatus)}
        data-testid="encounter-status"
      >
        {getStatusLabel(encounterStatus, true)}
      </Badge>

      <EncounterWatchReplayButton gameSessionId={gameSessionId} />

      {!isBattleLocked && (
        <>
          <Button
            variant="secondary"
            disabled={!canLaunch || isPreparingBattle}
            onClick={() => void onOpenQuickResolve()}
            title={
              canLaunch
                ? 'Run a Monte Carlo batch to estimate win probability'
                : 'Fix validation errors first'
            }
            data-testid="quick-resolve-btn"
          >
            {isPreparingBattle ? 'Preparing...' : 'Quick Resolve'}
          </Button>
          <Button
            variant="primary"
            disabled={!canLaunch}
            onClick={onLaunch}
            title={
              canLaunch
                ? 'Launch this encounter'
                : 'Fix validation errors first'
            }
            data-testid="launch-encounter-btn"
          >
            Launch Battle
          </Button>
        </>
      )}
    </div>
  );
}

export function EncounterDetailBody({
  encounter,
  encounterId,
  validation,
  template,
  error,
  canLaunch,
  isBattleLocked,
  rawForceIds,
  quickResolve,
  quickResolveResult,
  showDeleteConfirm,
  showGenerateModal,
  onCancelDelete,
  onConfirmDelete,
  onOpenGenerateModal,
  onCloseGenerateModal,
  onGenerateScenario,
  onDeleteRequest,
  onQuickResolveComplete,
}: {
  readonly encounter: IEncounter;
  readonly encounterId: string;
  readonly validation: IEncounterValidationResult | null;
  readonly template: ReturnType<typeof getEncounterTemplate>;
  readonly error: string | null;
  readonly canLaunch: boolean;
  readonly isBattleLocked: boolean;
  readonly rawForceIds: RawForceIds;
  readonly quickResolve: QuickResolvePrep;
  readonly quickResolveResult: IBatchResult | null;
  readonly showDeleteConfirm: boolean;
  readonly showGenerateModal: boolean;
  readonly onCancelDelete: () => void;
  readonly onConfirmDelete: () => Promise<void>;
  readonly onOpenGenerateModal: () => void;
  readonly onCloseGenerateModal: () => void;
  readonly onGenerateScenario: Parameters<
    typeof GenerateScenarioModal
  >[0]['onGenerate'];
  readonly onDeleteRequest: () => void;
  readonly onQuickResolveComplete: (result: IBatchResult) => void;
}): React.ReactElement {
  const brokenRefs = encounterBrokenRefs(
    encounter,
    rawForceIds ?? { playerForceId: null, opponentForceId: null },
  );

  return (
    <>
      {error && <EncounterErrorBanner message={error} />}

      <EncounterRepairBanner
        encounterId={encounterId}
        missingPlayerForceId={
          brokenRefs.playerForceMissing
            ? (rawForceIds?.playerForceId ?? null)
            : null
        }
        missingOpponentForceId={
          brokenRefs.opponentForceMissing
            ? (rawForceIds?.opponentForceId ?? null)
            : null
        }
      />

      <EncounterValidationCard validation={validation} />
      <QuickResolveSummary
        canLaunch={canLaunch}
        encounterId={encounterId}
        isBattleLocked={isBattleLocked}
        quickResolve={quickResolve}
        quickResolveResult={quickResolveResult}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EncounterForcesCard encounter={encounter} encounterId={encounterId} />
        <EncounterBattleSettingsCard
          encounter={encounter}
          template={template}
        />
      </div>

      {!isBattleLocked && encounter.playerForce && (
        <EncounterScenarioGeneratorSection
          onOpenGenerateModal={onOpenGenerateModal}
        />
      )}

      {!isBattleLocked && (
        <EncounterActionsFooter
          encounterId={encounterId}
          onDelete={onDeleteRequest}
        />
      )}

      {showDeleteConfirm && (
        <DeleteEncounterConfirmDialog
          encounterName={encounter.name}
          onCancel={onCancelDelete}
          onConfirm={onConfirmDelete}
        />
      )}

      <GenerateScenarioModal
        isOpen={showGenerateModal}
        onClose={onCloseGenerateModal}
        playerBV={encounter.playerForce?.totalBV || 0}
        playerUnitCount={encounter.playerForce?.unitCount || 0}
        onGenerate={onGenerateScenario}
      />

      {quickResolve.showQuickResolveModal && quickResolve.battle && (
        <QuickResolveLauncher
          battle={quickResolve.battle}
          encounterId={encounterId}
          runCount={quickResolve.runCount}
          onRunCountChange={quickResolve.setRunCount}
          onClose={quickResolve.closeQuickResolveModal}
          onComplete={onQuickResolveComplete}
        />
      )}
    </>
  );
}

function EncounterErrorBanner({
  message,
}: {
  readonly message: string;
}): React.ReactElement {
  return (
    <div className="mb-6 rounded-lg border border-red-600/30 bg-red-900/20 p-4">
      <p className="text-sm text-red-400">{message}</p>
    </div>
  );
}

function QuickResolveSummary({
  canLaunch,
  encounterId,
  isBattleLocked,
  quickResolve,
  quickResolveResult,
}: {
  readonly canLaunch: boolean;
  readonly encounterId: string;
  readonly isBattleLocked: boolean;
  readonly quickResolve: QuickResolvePrep;
  readonly quickResolveResult: IBatchResult | null;
}): React.ReactElement | null {
  if (isBattleLocked || !canLaunch) {
    return null;
  }

  return (
    <div className="mb-6">
      <QuickSimResultSummary
        encounterId={encounterId}
        result={quickResolveResult}
        onRunBatch={() => void quickResolve.openQuickResolveModal()}
        runBatchDisabled={quickResolve.isPreparingBattle}
      />
    </div>
  );
}

export function useQuickResolveEncounterPrep({
  playerForce,
  opponentForce,
  pilots,
  showToast,
}: {
  readonly playerForce: IForce | undefined;
  readonly opponentForce: IForce | undefined;
  readonly pilots: readonly IPilot[];
  readonly showToast: ReturnType<typeof useToast>['showToast'];
}): QuickResolvePrepResult {
  const [showQuickResolveModal, setShowQuickResolveModal] = useState(false);
  const [runCount, setRunCount] = useState(100);
  const [battle, setBattle] = useState<IQuickResolveBattleConfig | null>(null);
  const [isPreparingBattle, setIsPreparingBattle] = useState(false);

  const openQuickResolveModal = useCallback(async () => {
    if (!playerForce || !opponentForce) {
      showToast({
        message: 'Both forces must be configured to Quick Resolve',
        variant: 'error',
      });
      return;
    }

    setIsPreparingBattle(true);
    try {
      const prepared = await buildPreparedBattleData({
        playerForce,
        opponentForce,
        pilots,
      });
      if (
        prepared.playerAdapted.length === 0 ||
        prepared.opponentAdapted.length === 0
      ) {
        showToast({
          message: 'Failed to load unit data for one or both forces',
          variant: 'error',
        });
        return;
      }
      setBattle({
        playerUnits: prepared.playerAdapted,
        opponentUnits: prepared.opponentAdapted,
        gameUnits: prepared.gameUnits,
      });
      setShowQuickResolveModal(true);
    } catch (err) {
      logger.error('Quick Resolve setup failed:', err);
      showToast({
        message:
          err instanceof Error
            ? err.message
            : 'Failed to prepare Quick Resolve',
        variant: 'error',
      });
    } finally {
      setIsPreparingBattle(false);
    }
  }, [playerForce, opponentForce, pilots, showToast]);

  const closeQuickResolveModal = useCallback(() => {
    setShowQuickResolveModal(false);
  }, []);

  return {
    battle,
    closeQuickResolveModal,
    isPreparingBattle,
    openQuickResolveModal,
    runCount,
    setRunCount,
    showQuickResolveModal,
  };
}

export function handleQuickResolveComplete(
  result: IBatchResult,
  encounterId: string,
  setQuickResolveResult: (result: IBatchResult) => void,
  showToast: ReturnType<typeof useToast>['showToast'],
): void {
  logger.info('Quick Resolve batch complete', {
    encounterId,
    totalRuns: result.totalRuns,
    baseSeed: result.baseSeed,
    winProbability: result.winProbability,
  });
  setQuickResolveResult(result);
  showToast({
    message: `Batch complete - Player wins ${(
      result.winProbability.player * 100
    ).toFixed(1)}%`,
    variant: 'success',
  });
}
