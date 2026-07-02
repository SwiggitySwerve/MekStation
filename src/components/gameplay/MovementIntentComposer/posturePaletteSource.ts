/**
 * Posture Palette source (change `tactical-movement-intent-composer`, phase 4,
 * tactical-movement-intent capability, task 4.2).
 *
 * Derives the legal Posture Actions for the unit's current state, each with its
 * rules-derived MP cost, then applies Live Intersection to mark entries the
 * remaining budget cannot afford as disabled. Legality + disabled-reason come
 * from the SAME posture-command availability predicates the dock uses (single
 * source of truth), so the composer palette and the dock never disagree; MP
 * costs come from `movement-system` posture-cost helpers (`getStandingCost`,
 * `getHullDownEntryCost`). There is NO UI-local MP math here.
 *
 * "Evade where legal" is modeled as a posture (no destination) per the ADR /
 * design; its MP cost is 0 (Evade consumes a move declaration, not path MP —
 * the run/evade budget is what the resolver charges against), so it never
 * shrinks the placeable-hex set on its own.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-movement-intent/spec.md
 */

import { MovementPostureCommands } from '@/components/gameplay/TacticalActionDock/commands/movementPostureCommands';
import { MovementTraversalCommands } from '@/components/gameplay/TacticalActionDock/commands/movementTraversalCommands';
import {
  type CommandAvailability,
  type IMovementCapability,
  type ITacticalCommand,
  type ITacticalCommandContext,
  type PostureActionType,
} from '@/types/gameplay';
import {
  getHullDownEntryCost,
  getStandingCost,
} from '@/utils/gameplay/movement';

import type { IPosturePaletteEntry } from './composer.types';

interface HullDownUnitState {
  readonly componentDamage: ITacticalCommandContext['activeUnitComponentDamage'];
  readonly destroyedLocations: readonly string[];
  readonly hullDown: boolean;
  readonly prone: boolean;
}

/**
 * Static descriptor binding a `PostureActionType` to the dock command that owns
 * its legality predicate and to the movement-system cost function that owns its
 * MP. Keeping the palette bound to the dock commands means posture legality has
 * exactly one authority.
 */
interface IPostureDescriptor {
  readonly action: PostureActionType;
  readonly label: string;
  readonly hotkey?: string;
  readonly commandId: string;
  /** Rules-derived MP cost for the action given capability + unit state. */
  readonly cost: (
    capability: IMovementCapability | null,
    unit: HullDownUnitState,
  ) => number;
}

const POSTURE_DESCRIPTORS: readonly IPostureDescriptor[] = [
  {
    action: 'STAND_UP',
    label: 'Stand Up',
    commandId: 'movement.stand',
    cost: (capability) =>
      capability ? getStandingCost(capability, 'normal') : 0,
  },
  {
    action: 'CAREFUL_STAND',
    label: 'Careful Stand',
    commandId: 'movement.carefulStand',
    cost: (capability) =>
      capability ? getStandingCost(capability, 'careful') : 0,
  },
  {
    action: 'HULL_DOWN',
    label: 'Hull Down',
    commandId: 'movement.hullDown',
    cost: (capability, unit) =>
      capability ? getHullDownEntryCost(unit, capability) : 0,
  },
  {
    action: 'GO_PRONE',
    label: 'Go Prone',
    commandId: 'movement.goProne',
    // Go Prone from hull-down is a posture flip with no MP charge in the
    // movement-system rules the go-prone command encodes.
    cost: () => 0,
  },
  {
    action: 'EVADE',
    label: 'Evade',
    hotkey: 'E',
    commandId: 'movement.evade',
    // Evade has no path MP — the run/evade budget is what the resolver charges.
    cost: () => 0,
  },
];

function findCommand(commandId: string): ITacticalCommand | undefined {
  return (
    MovementPostureCommands.find((command) => command.id === commandId) ??
    MovementTraversalCommands.find((command) => command.id === commandId)
  );
}

/**
 * Build the posture palette entries for the unit's current state. An entry is
 * `offered: false` (skipped) when its command is unavailable for a *state*
 * reason (not a transient budget reason). Offered entries are `disabled` when
 * Live Intersection finds their `mpCost` exceeds every remaining budget
 * (`bestRemainingMp`), OR when the command is unavailable for a reason that is
 * not a pure state illegality (e.g. destroyed support location, MP shortfall).
 */
export function buildPosturePaletteEntries({
  capability,
  commandContext,
  bestRemainingMp,
}: {
  readonly capability: IMovementCapability | null;
  readonly commandContext: ITacticalCommandContext;
  /** Highest remaining MP across still-affordable budgets (Live Intersection). */
  readonly bestRemainingMp: number;
}): readonly IPosturePaletteEntry[] {
  const hullDownUnit: HullDownUnitState = {
    componentDamage: commandContext.activeUnitComponentDamage,
    destroyedLocations: commandContext.activeUnitDestroyedLocations ?? [],
    hullDown: commandContext.activeUnitHullDown ?? false,
    prone: commandContext.activeUnitProne ?? false,
  };

  const entries: IPosturePaletteEntry[] = [];
  for (const descriptor of POSTURE_DESCRIPTORS) {
    const command = findCommand(descriptor.commandId);
    if (!command) continue;
    const availability = command.availability(commandContext);
    const classification = classifyPostureAvailability(availability);
    // Not offered: illegal for the unit's current state.
    if (classification === 'illegal') continue;

    const mpCost = descriptor.cost(capability, hullDownUnit);
    // Live Intersection: an offered legal action that costs more than every
    // remaining budget is disabled (spec: unaffordable actions greyed out).
    const unaffordable = mpCost > bestRemainingMp;
    const disabled = classification === 'blocked' || unaffordable;
    const disabledReason = !availability.available
      ? availability.reason
      : unaffordable
        ? `Needs ${mpCost} MP; only ${bestRemainingMp} MP remains.`
        : undefined;

    entries.push({
      action: descriptor.action,
      label: descriptor.label,
      hotkey: descriptor.hotkey ?? command.hotkey,
      mpCost,
      offered: true,
      disabled,
      disabledReason,
    });
  }
  return entries;
}

/**
 * Classify a posture command's availability into the palette's three buckets.
 * A *state* reason (prone/hull-down/motive-type/no-unit/not-your-turn) means
 * the action is illegal and not offered; a *capacity* reason (needs N MP,
 * destroyed support) means the action is offered-but-disabled so the player can
 * still see it exists and why it is blocked.
 */
function classifyPostureAvailability(
  availability: CommandAvailability,
): 'legal' | 'blocked' | 'illegal' {
  if (availability.available) return 'legal';
  const reason = availability.reason ?? '';
  if (STATE_ILLEGAL_PATTERNS.some((pattern) => pattern.test(reason))) {
    return 'illegal';
  }
  return 'blocked';
}

/** Reasons that mean the action is structurally illegal for this state. */
const STATE_ILLEGAL_PATTERNS: readonly RegExp[] = [
  /not prone or hull-down/i,
  /only available when prone/i,
  /only available for mek-style/i,
  /must be hull-down/i,
  /already prone/i,
  /already hull-down/i,
  /no unit is active/i,
  /not your turn/i,
  /already locked movement/i,
];
