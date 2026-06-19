import React from 'react';

import type { IHexCoordinate, IINarcPodState } from '@/types/gameplay';
import type { IPhysicalAttackOption } from '@/utils/gameplay/physicalAttacks/types';

import {
  iNarcPodDisplayName,
  iNarcPodTargetKey,
} from '@/utils/gameplay/specialWeaponMechanics';

import { attackTypeLabel, REASON_COPY } from './PhysicalAttackPanel.helpers';

export interface MeleeTarget {
  id: string;
  carrierUnitId: string;
  name: string;
  position: IHexCoordinate;
  selectedINarcPod?: IINarcPodState;
}

interface CommittedSummaryProps {
  summary: string | null;
}

export function CommittedPhysicalAttackSummary({
  summary,
}: CommittedSummaryProps): React.ReactElement | null {
  if (!summary) return null;

  return (
    <p
      className="rounded border border-green-300 bg-green-50 px-2 py-1 text-xs text-green-900"
      data-testid="physical-attack-committed-summary"
      role="status"
    >
      {summary}
    </p>
  );
}

interface TargetListProps {
  meleeTargets: readonly MeleeTarget[];
  selectedTargetId?: string;
  onSelectTarget: (target: MeleeTarget) => void;
}

export function PhysicalAttackTargetList({
  meleeTargets,
  selectedTargetId,
  onSelectTarget,
}: TargetListProps): React.ReactElement {
  if (meleeTargets.length === 0) {
    return (
      <p
        className="text-text-theme-muted text-sm"
        data-testid="physical-attack-empty"
      >
        No valid melee targets in adjacent hexes
      </p>
    );
  }

  return (
    <ul
      className="flex flex-col gap-1"
      data-testid="physical-attack-target-list"
      role="radiogroup"
      aria-label="Melee target"
    >
      {meleeTargets.map((target) => {
        const isSelected = selectedTargetId === target.id;
        return (
          <li key={target.id}>
            <button
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelectTarget(target)}
              className={`min-h-[36px] w-full rounded border px-2 py-1 text-left ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'text-text-theme-primary border-gray-200 bg-white hover:bg-gray-50'
              }`}
              data-testid={`physical-attack-target-${target.id}`}
            >
              {target.name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface INarcPodSelectProps {
  selectedINarcPodKey: string;
  targetINarcPods: readonly IINarcPodState[];
  onSelectINarcPod: (podKey: string) => void;
}

export function PhysicalAttackINarcPodSelect({
  selectedINarcPodKey,
  targetINarcPods,
  onSelectINarcPod,
}: INarcPodSelectProps): React.ReactElement | null {
  if (targetINarcPods.length === 0) return null;

  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-text-theme-muted">Brush-Off pod</span>
      <select
        value={selectedINarcPodKey}
        onChange={(event) => onSelectINarcPod(event.currentTarget.value)}
        className="border-border-theme-subtle bg-surface-base text-text-theme-primary min-h-[32px] rounded border px-2 py-1"
        data-testid="physical-attack-inarc-pod-select"
      >
        {targetINarcPods.map((pod) => {
          const podKey = iNarcPodTargetKey(pod);
          return (
            <option key={podKey} value={podKey}>
              {iNarcPodDisplayName(pod)}
            </option>
          );
        })}
      </select>
    </label>
  );
}

interface OptionListProps {
  options: readonly IPhysicalAttackOption[];
  hasTarget: boolean;
  onRowHover: (option: IPhysicalAttackOption) => void;
  onRowLeave: () => void;
  onDeclare: (option: IPhysicalAttackOption) => void;
}

function optionRowKey(option: IPhysicalAttackOption, index: number): string {
  return `${option.attackType}-${option.limb ?? 'body'}-${index}`;
}

function optionReasonTooltip(option: IPhysicalAttackOption): string {
  return option.restrictionsFailed
    .map((reason) => REASON_COPY[reason])
    .join('; ');
}

function optionAriaLabel(
  option: IPhysicalAttackOption,
  isEligible: boolean,
  reasonTooltip: string,
): string {
  const label = attackTypeLabel(option.attackType, option.limb);
  return `${label} — TN ${option.toHit.finalToHit}+, ${option.damage.targetDamage} damage${
    isEligible ? '' : ` (disabled: ${reasonTooltip})`
  }`;
}

function optionDamageSummary(option: IPhysicalAttackOption): string {
  const selfDamage =
    option.selfRisk.damageToAttacker > 0
      ? ` · self ${option.selfRisk.damageToAttacker}`
      : '';
  const missFall =
    option.selfRisk.onMiss === 'AttackerFalls' ? ' · fall on miss' : '';
  return `TN ${option.toHit.finalToHit}+ — ${option.damage.targetDamage} dmg${selfDamage}${missFall}`;
}

interface OptionRowProps {
  option: IPhysicalAttackOption;
  index: number;
  onRowHover: (option: IPhysicalAttackOption) => void;
  onRowLeave: () => void;
  onDeclare: (option: IPhysicalAttackOption) => void;
}

function PhysicalAttackOptionRow({
  option,
  index,
  onRowHover,
  onRowLeave,
  onDeclare,
}: OptionRowProps): React.ReactElement {
  const isEligible = option.restrictionsFailed.length === 0;
  const reasonTooltip = optionReasonTooltip(option);
  const attackLabel = attackTypeLabel(option.attackType, option.limb);

  return (
    <li
      key={optionRowKey(option, index)}
      tabIndex={isEligible ? 0 : -1}
      role="group"
      aria-label={optionAriaLabel(option, isEligible, reasonTooltip)}
      onMouseEnter={() => isEligible && onRowHover(option)}
      onMouseLeave={onRowLeave}
      onFocus={() => isEligible && onRowHover(option)}
      onBlur={onRowLeave}
      onKeyDown={(event) => {
        if (!isEligible) return;
        if (
          (event.key === 'Enter' || event.key === ' ') &&
          event.target === event.currentTarget
        ) {
          event.preventDefault();
          onDeclare(option);
        }
      }}
    >
      <div
        className={`flex items-center justify-between gap-2 rounded border px-2 py-1 ${
          isEligible
            ? 'border-gray-200 bg-white'
            : 'border-gray-200 bg-gray-100 opacity-60'
        }`}
        title={reasonTooltip || undefined}
        data-testid={`physical-attack-option-${option.attackType}-${option.limb ?? 'body'}`}
        data-eligible={isEligible ? 'true' : 'false'}
      >
        <div className="flex flex-1 flex-col text-xs">
          <span
            className={`font-medium ${
              isEligible
                ? 'text-text-theme-primary'
                : 'text-gray-500 line-through'
            }`}
          >
            {attackLabel}
          </span>
          <span className="text-text-theme-muted">
            {optionDamageSummary(option)}
          </span>
          {!isEligible && reasonTooltip && (
            <span className="text-xs text-red-600">{reasonTooltip}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDeclare(option)}
          disabled={!isEligible}
          aria-label={`Declare ${attackLabel}`}
          className={`min-h-[32px] rounded px-2 py-1 text-xs font-medium focus:ring-2 focus:ring-offset-2 focus:outline-none ${
            isEligible
              ? 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
              : 'cursor-not-allowed bg-gray-300 text-gray-500'
          }`}
          data-testid={`physical-attack-declare-${option.attackType}-${option.limb ?? 'body'}`}
        >
          Declare
        </button>
      </div>
    </li>
  );
}

export function PhysicalAttackOptionList({
  options,
  hasTarget,
  onRowHover,
  onRowLeave,
  onDeclare,
}: OptionListProps): React.ReactElement | null {
  if (!hasTarget || options.length === 0) return null;

  return (
    <ul
      className="flex flex-col gap-1"
      data-testid="physical-attack-option-list"
      aria-label="Eligible physical attacks"
      aria-live="polite"
    >
      {options.map((option, index) => (
        <PhysicalAttackOptionRow
          key={optionRowKey(option, index)}
          option={option}
          index={index}
          onRowHover={onRowHover}
          onRowLeave={onRowLeave}
          onDeclare={onDeclare}
        />
      ))}
    </ul>
  );
}

interface SkipButtonProps {
  onSkip: () => void;
}

export function PhysicalAttackSkipButton({
  onSkip,
}: SkipButtonProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onSkip}
        className="bg-surface-deep text-text-theme-primary hover:bg-surface-base min-h-[44px] flex-1 rounded px-4 py-2 font-medium focus:ring-2 focus:ring-offset-2 focus:outline-none"
        data-testid="physical-attack-skip-button"
      >
        Skip
      </button>
    </div>
  );
}
