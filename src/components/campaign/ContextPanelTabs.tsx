import React from 'react';

import type {
  SystemData,
  ContractData,
  MechData,
  PilotData,
} from './ContextPanel';

import {
  formatPopulation,
  formatCBills,
  getArmorColor,
  getArmorTextColor,
  getStatusBadgeStyle,
} from './ContextPanelHelpers';
import {
  GlobeIcon,
  DocumentIcon,
  MechIcon,
  PilotIcon,
  CrosshairIcon,
  getContractTypeIcon,
} from './ContextPanelIcons';

export function EmptyPanel(): React.ReactElement {
  return (
    <div
      className="flex h-full items-center justify-center text-slate-500"
      data-testid="context-panel-empty"
    >
      <div className="flex items-center gap-3">
        <CrosshairIcon className="h-5 w-5 opacity-50" />
        <span className="text-sm">Select a system, contract, or unit</span>
      </div>
    </div>
  );
}

export function SystemDetailsPanel({
  data,
}: {
  data: SystemData;
}): React.ReactElement {
  return (
    <div
      className="flex h-full items-center gap-6 p-4"
      data-testid="context-panel-system"
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-sky-700/30 bg-sky-900/30">
        <GlobeIcon className="h-6 w-6 text-sky-400" />
      </div>

      <div className="min-w-0">
        <div className="mb-0.5 text-xs tracking-wider text-slate-400 uppercase">
          System
        </div>
        <div className="truncate text-lg font-semibold text-slate-100">
          {data.name}
        </div>
      </div>

      <div className="h-8 w-px flex-shrink-0 bg-slate-700" />

      <div>
        <div className="mb-1 text-xs tracking-wider text-slate-400 uppercase">
          Faction
        </div>
        <span className="inline-flex items-center rounded border border-sky-700/40 bg-sky-900/40 px-2.5 py-1 text-sm font-medium text-sky-400">
          {data.faction}
        </span>
      </div>

      {data.population !== undefined && (
        <>
          <div className="h-8 w-px flex-shrink-0 bg-slate-700" />
          <div>
            <div className="mb-0.5 text-xs tracking-wider text-slate-400 uppercase">
              Population
            </div>
            <div className="font-mono text-sm text-slate-200">
              {formatPopulation(data.population)}
            </div>
          </div>
        </>
      )}

      {data.industrialRating && (
        <>
          <div className="h-8 w-px flex-shrink-0 bg-slate-700" />
          <div>
            <div className="mb-0.5 text-xs tracking-wider text-slate-400 uppercase">
              Industry
            </div>
            <div className="text-sm font-medium text-amber-400">
              {data.industrialRating}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ContractDetailsPanel({
  data,
}: {
  data: ContractData;
}): React.ReactElement {
  return (
    <div
      className="flex h-full items-center gap-6 p-4"
      data-testid="context-panel-contract"
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-amber-700/30 bg-amber-900/30">
        <DocumentIcon className="h-6 w-6 text-amber-400" />
      </div>

      <div className="min-w-0">
        <div className="mb-0.5 flex items-center gap-2">
          <span className="text-xs tracking-wider text-slate-400 uppercase">
            Contract
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-slate-600/50 bg-slate-700/50 px-1.5 py-0.5 text-xs text-slate-300">
            {getContractTypeIcon(data.type)}
            {data.type}
          </span>
        </div>
        <div className="truncate text-lg font-semibold text-slate-100">
          {data.name}
        </div>
      </div>

      <div className="h-8 w-px flex-shrink-0 bg-slate-700" />

      <div>
        <div className="mb-0.5 text-xs tracking-wider text-slate-400 uppercase">
          Employer
        </div>
        <div className="text-sm text-slate-200">{data.employer}</div>
      </div>

      <div className="h-8 w-px flex-shrink-0 bg-slate-700" />

      <div>
        <div className="mb-0.5 text-xs tracking-wider text-slate-400 uppercase">
          Payment
        </div>
        <div className="font-mono text-sm font-semibold text-amber-400">
          {formatCBills(data.payment)} C-Bills
        </div>
      </div>

      <div className="h-8 w-px flex-shrink-0 bg-slate-700" />

      <div>
        <div className="mb-0.5 text-xs tracking-wider text-slate-400 uppercase">
          Deadline
        </div>
        <div className="font-mono text-sm text-slate-200">{data.deadline}</div>
      </div>
    </div>
  );
}

export function MechStatusPanel({
  data,
}: {
  data: MechData;
}): React.ReactElement {
  return (
    <div
      className="flex h-full items-center gap-6 p-4"
      data-testid="context-panel-mech"
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-violet-700/30 bg-violet-900/30">
        <MechIcon className="h-6 w-6 text-violet-400" />
      </div>

      <div className="min-w-0">
        <div className="mb-0.5 text-xs tracking-wider text-slate-400 uppercase">
          Mech
        </div>
        <div className="text-lg font-semibold text-slate-100">
          {data.name}{' '}
          <span className="font-mono text-sm text-slate-400">
            {data.variant}
          </span>
        </div>
      </div>

      <div className="h-8 w-px flex-shrink-0 bg-slate-700" />

      <div>
        <div className="mb-0.5 text-xs tracking-wider text-slate-400 uppercase">
          Tonnage
        </div>
        <div className="font-mono text-sm text-slate-200">{data.tonnage}t</div>
      </div>

      <div className="h-8 w-px flex-shrink-0 bg-slate-700" />

      <div className="w-40">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs tracking-wider text-slate-400 uppercase">
            Armor
          </span>
          <span
            className={`font-mono text-xs ${getArmorTextColor(data.armorPercent)}`}
          >
            {data.armorPercent}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full ${getArmorColor(data.armorPercent)} transition-all duration-300`}
            style={{ width: `${data.armorPercent}%` }}
          />
        </div>
      </div>

      <div className="h-8 w-px flex-shrink-0 bg-slate-700" />

      <div>
        <div className="mb-1 text-xs tracking-wider text-slate-400 uppercase">
          Status
        </div>
        <span
          className={`inline-flex items-center rounded border px-2.5 py-1 text-sm font-medium ${getStatusBadgeStyle(data.status)}`}
        >
          {data.status}
        </span>
      </div>
    </div>
  );
}

export function PilotStatusPanel({
  data,
}: {
  data: PilotData;
}): React.ReactElement {
  const maxWounds = 5;

  return (
    <div
      className="flex h-full items-center gap-6 p-4"
      data-testid="context-panel-pilot"
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-emerald-700/30 bg-emerald-900/30">
        <PilotIcon className="h-6 w-6 text-emerald-400" />
      </div>

      <div className="min-w-0">
        <div className="mb-0.5 text-xs tracking-wider text-slate-400 uppercase">
          Pilot
        </div>
        <div className="truncate text-lg font-semibold text-slate-100">
          {data.name}
          <span className="ml-2 text-sm font-normal text-emerald-400">
            &ldquo;{data.callsign}&rdquo;
          </span>
        </div>
      </div>

      <div className="h-8 w-px flex-shrink-0 bg-slate-700" />

      <div>
        <div className="mb-0.5 text-xs tracking-wider text-slate-400 uppercase">
          Gunnery
        </div>
        <div className="font-mono text-xl font-bold text-cyan-400">
          {data.gunnery}
        </div>
      </div>

      <div className="h-8 w-px flex-shrink-0 bg-slate-700" />

      <div>
        <div className="mb-0.5 text-xs tracking-wider text-slate-400 uppercase">
          Piloting
        </div>
        <div className="font-mono text-xl font-bold text-amber-400">
          {data.piloting}
        </div>
      </div>

      <div className="h-8 w-px flex-shrink-0 bg-slate-700" />

      <div>
        <div className="mb-1 text-xs tracking-wider text-slate-400 uppercase">
          Wounds
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: maxWounds }).map((_, i) => (
            <div
              key={i}
              className={`h-3 w-3 rounded-full border ${
                i < data.wounds
                  ? 'border-red-400 bg-red-500'
                  : 'border-slate-600 bg-slate-700'
              }`}
            />
          ))}
          {data.wounds > 0 && (
            <span className="ml-1 text-xs text-red-400">
              ({data.wounds}/{maxWounds})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
