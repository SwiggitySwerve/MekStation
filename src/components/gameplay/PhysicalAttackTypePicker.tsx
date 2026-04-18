/**
 * PhysicalAttackTypePicker
 *
 * Per `add-physical-attack-phase-ui`: button strip the human player
 * uses to declare which kind of melee attack they want to make this
 * turn. Mirrors `WeaponSelector` for the weapon-attack flow but, since
 * a mech can only commit to ONE physical attack per turn, the rows are
 * radio-style buttons rather than checkboxes.
 *
 * Each option is greyed out (disabled + tooltip) when its restriction
 * helper rejects it — destroyed shoulder, hip damaged, weapon already
 * fired from that arm, etc. Restriction copy comes straight from the
 * `IPhysicalAttackRestriction.reason` returned by
 * `physicalAttacks/restrictions.ts` so the UI never has to keep its
 * own list of reasons in sync with the rules engine.
 *
 * Pure presentational: the parent passes in the attacker's component
 * damage + tonnage + heat etc. and the picker computes per-row
 * eligibility on the fly. The chosen type is reported up via
 * `onSelect`.
 */

import React, { useMemo } from 'react';

import type { IComponentDamageState } from '@/types/gameplay';
import type {
  IPhysicalAttackInput,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks/types';

import {
  canKick,
  canMeleeWeapon,
  canPunch,
} from '@/utils/gameplay/physicalAttacks/restrictions';

export interface PhysicalAttackTypePickerProps {
  /**
   * The currently-selected attack type (or null when nothing is
   * picked). Drives the `aria-pressed` state on each row.
   */
  selected: PhysicalAttackType | null;
  /** Tonnage of the attacker — used by the restriction shape. */
  attackerTonnage: number;
  /** Piloting skill of the attacker — used by the restriction shape. */
  pilotingSkill: number;
  /** Component damage on the attacker — drives actuator-based grey-outs. */
  componentDamage: IComponentDamageState;
  /** Current attacker heat (used by `getEffectiveWeight` / TSM checks). */
  heat?: number;
  /** True when the attacker mounts a TSM and is hot enough to engage it. */
  hasTSM?: boolean;
  /** Weapon ids fired from the attacker's left arm this turn (blocks left punch). */
  weaponsFiredFromLeftArm?: readonly string[];
  /** Weapon ids fired from the attacker's right arm this turn (blocks right punch). */
  weaponsFiredFromRightArm?: readonly string[];
  /** True when the attacker is prone — kick is forbidden while prone. */
  attackerProne?: boolean;
  /**
   * Optional list of melee weapon types the attacker has equipped
   * (e.g. `['hatchet', 'sword']`). Rows for melee weapons not in this
   * list are hidden (NOT disabled) — a mech without a hatchet doesn't
   * even render the Hatchet row. Distinct from disabling the row,
   * which signals the mech could attempt the type but a restriction
   * blocks it this turn.
   */
  meleeWeaponsEquipped?: readonly PhysicalAttackType[];
  /** Charge / DFA require movement context — surfaced as enable flags. */
  canCharge?: boolean;
  canDFA?: boolean;
  /** Callback fired when a button is clicked with a valid (allowed) type. */
  onSelect: (attackType: PhysicalAttackType) => void;
  /** Optional className passthrough. */
  className?: string;
}

interface OptionRow {
  type: PhysicalAttackType;
  label: string;
  enabled: boolean;
  reason?: string;
}

const ALL_MELEE_TYPES: readonly PhysicalAttackType[] = [
  'hatchet',
  'sword',
  'mace',
];

/**
 * Build the picker row list. Each row computes its own
 * enabled/reason via the restrictions helpers — this keeps the
 * component thin (no rule duplication) and lets reviewers diff
 * eligibility logic against `physicalAttacks/restrictions.ts` in one
 * place.
 */
function buildOptions(props: PhysicalAttackTypePickerProps): OptionRow[] {
  const baseInput: IPhysicalAttackInput = {
    attackerTonnage: props.attackerTonnage,
    pilotingSkill: props.pilotingSkill,
    componentDamage: props.componentDamage,
    attackType: 'punch',
    heat: props.heat,
    hasTSM: props.hasTSM,
    attackerProne: props.attackerProne,
  };

  // Punch is allowed when EITHER arm passes restrictions — the engine
  // picks the actual arm at resolution time. Surface the FIRST blocking
  // reason if both arms fail so the player gets a useful tooltip.
  const leftPunch = canPunch({
    ...baseInput,
    attackType: 'punch',
    arm: 'left',
    weaponsFiredFromArm: props.weaponsFiredFromLeftArm,
  });
  const rightPunch = canPunch({
    ...baseInput,
    attackType: 'punch',
    arm: 'right',
    weaponsFiredFromArm: props.weaponsFiredFromRightArm,
  });
  const punchAllowed = leftPunch.allowed || rightPunch.allowed;
  const punchReason = leftPunch.allowed
    ? rightPunch.reason
    : (leftPunch.reason ?? rightPunch.reason);

  const kick = canKick({ ...baseInput, attackType: 'kick' });

  const rows: OptionRow[] = [
    {
      type: 'punch',
      label: 'Punch',
      enabled: punchAllowed,
      reason: punchAllowed ? undefined : punchReason,
    },
    {
      type: 'kick',
      label: 'Kick',
      enabled: kick.allowed,
      reason: kick.allowed ? undefined : kick.reason,
    },
    {
      type: 'charge',
      label: 'Charge',
      enabled: props.canCharge ?? false,
      reason:
        (props.canCharge ?? false)
          ? undefined
          : 'Need to charge into target hex',
    },
    {
      type: 'dfa',
      label: 'Death From Above',
      enabled: props.canDFA ?? false,
      reason:
        (props.canDFA ?? false) ? undefined : 'Requires jumping over target',
    },
  ];

  // Only render melee-weapon rows for weapons the mech actually has.
  // Equipped-but-blocked weapons render as disabled rows so the player
  // sees WHY they can't swing this turn.
  for (const meleeType of ALL_MELEE_TYPES) {
    if (!props.meleeWeaponsEquipped?.includes(meleeType)) continue;
    const restriction = canMeleeWeapon({
      ...baseInput,
      attackType: meleeType,
    });
    rows.push({
      type: meleeType,
      label: meleeType.charAt(0).toUpperCase() + meleeType.slice(1),
      enabled: restriction.allowed,
      reason: restriction.allowed ? undefined : restriction.reason,
    });
  }

  return rows;
}

export function PhysicalAttackTypePicker(
  props: PhysicalAttackTypePickerProps,
): React.ReactElement {
  const { selected, onSelect, className = '' } = props;

  // Memoize so a parent re-render doesn't rerun the restriction
  // helpers when nothing the picker depends on actually changed.
  const options = useMemo(() => buildOptions(props), [props]);

  return (
    <div
      className={`flex flex-col gap-2 ${className}`}
      data-testid="physical-attack-type-picker"
      role="radiogroup"
      aria-label="Physical attack type"
    >
      <ul className="flex flex-col gap-2" data-testid="physical-attack-list">
        {options.map((row) => {
          const isSelected = selected === row.type;
          return (
            <li
              key={row.type}
              className={`bg-surface-base rounded border border-gray-200 p-2 ${
                row.enabled ? '' : 'opacity-60'
              }`}
              data-testid={`physical-attack-row-${row.type}`}
              data-disabled={!row.enabled}
            >
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={!row.enabled}
                onClick={() => onSelect(row.type)}
                title={row.reason}
                className={`flex w-full items-center justify-between rounded px-2 py-1 text-left ${
                  isSelected
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-text-theme-primary hover:bg-gray-50'
                } ${row.enabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                data-testid={`physical-attack-button-${row.type}`}
              >
                <span
                  className={`font-medium ${
                    row.enabled ? '' : 'text-text-theme-muted line-through'
                  }`}
                >
                  {row.label}
                </span>
                {!row.enabled && row.reason && (
                  <span
                    className="text-xs text-red-600"
                    data-testid={`physical-attack-reason-${row.type}`}
                  >
                    {row.reason}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default PhysicalAttackTypePicker;
