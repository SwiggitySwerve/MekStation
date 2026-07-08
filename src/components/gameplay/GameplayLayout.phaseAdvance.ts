import type {
  ITacticalCommandContext,
  TacticalActionHandler,
} from '@/types/gameplay';
import type { ShellMode } from '@/types/gameplay/TacticalShellInterfaces';

import type {
  PhaseAdvanceControlProps,
  TacticalTurnRailProps,
} from './TacticalTurnRail';

import { buildCommandRegistry } from './TacticalActionDock/useCommandRegistry';

const PHASE_ADVANCE_COMMAND_IDS: ReadonlySet<string> = new Set([
  'heat-end.begin-round',
  'heat-end.end-phase',
  'heat.continue',
  'heat-end.next-turn',
]);

type PhaseBlocker = TacticalTurnRailProps['projection']['blockers'][number];

interface BuildPhaseAdvanceControlParams {
  readonly actionContext: ITacticalCommandContext;
  readonly shellMode: ShellMode;
  readonly phaseQueueProjection: TacticalTurnRailProps['projection'];
  readonly units: readonly { readonly id: string; readonly name: string }[];
  readonly onAction: TacticalActionHandler;
}

export function buildPhaseAdvanceControl({
  actionContext,
  shellMode,
  phaseQueueProjection,
  units,
  onAction,
}: BuildPhaseAdvanceControlParams): PhaseAdvanceControlProps | undefined {
  if (shellMode !== 'combat') return undefined;

  const command = buildCommandRegistry(actionContext, shellMode).find((item) =>
    PHASE_ADVANCE_COMMAND_IDS.has(item.id),
  );
  if (!command) return undefined;

  const unitNames = new Map(units.map((unit) => [unit.id, unit.name]));
  const blockerReasons = phaseQueueProjection.blockers.map((blocker) =>
    phaseAdvanceBlockerReason(blocker, unitNames),
  );
  const disabledReason =
    blockerReasons.length > 0
      ? `Resolve required actions before advancing: ${blockerReasons.join('; ')}`
      : undefined;
  const disabled = disabledReason !== undefined;

  return {
    label: command.label,
    disabled,
    disabledReason,
    blockerReasons,
    onAdvance: () => {
      if (disabled) return;
      if (command.requiresConfirmation && !confirmPhaseAdvance(command.label)) {
        return;
      }
      const result = command.commit(actionContext);
      if (result.payload === undefined) {
        onAction(result.actionId);
      } else {
        onAction(result.actionId, result.payload);
      }
    },
  };
}

function phaseAdvanceBlockerReason(
  blocker: PhaseBlocker,
  unitNames: ReadonlyMap<string, string>,
): string {
  const unitName = unitNames.get(blocker.unitId) ?? blocker.unitId;
  return `${unitName}: ${blocker.missingAction}`;
}

function confirmPhaseAdvance(label: string): boolean {
  if (typeof window === 'undefined') return true;
  return window.confirm(`Confirm: ${label}?`);
}
