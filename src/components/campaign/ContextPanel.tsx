import React from 'react';

export enum ContextPanelMode {
  Empty = 'empty',
  SystemDetails = 'system',
  ContractDetails = 'contract',
  MechStatus = 'mech',
  PilotStatus = 'pilot',
}

export interface SystemData {
  name: string;
  faction: string;
  population?: number;
  industrialRating?: string;
}

export interface ContractData {
  name: string;
  employer: string;
  payment: number;
  deadline: string;
  type: string;
}

export interface MechData {
  name: string;
  variant: string;
  tonnage: number;
  armorPercent: number;
  status: string;
}

export interface PilotData {
  name: string;
  callsign: string;
  gunnery: number;
  piloting: number;
  wounds: number;
}

export interface ContextPanelProps {
  mode: ContextPanelMode;
  systemData?: SystemData;
  contractData?: ContractData;
  mechData?: MechData;
  pilotData?: PilotData;
  className?: string;
}

function GlobeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3s-4.5 4.03-4.5 9 2.015 9 4.5 9zm-9-9h18"
      />
    </svg>
  );
}

function DocumentIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function MechIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
      />
    </svg>
  );
}

function PilotIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function CrosshairIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
      <path
        strokeLinecap="round"
        strokeWidth={1.5}
        d="M12 2v4m0 12v4m8-10h-4M6 12H2"
      />
    </svg>
  );
}

function formatPopulation(pop: number): string {
  if (pop >= 1_000_000_000) {
    return `${(pop / 1_000_000_000).toFixed(1)}B`;
  }
  if (pop >= 1_000_000) {
    return `${(pop / 1_000_000).toFixed(1)}M`;
  }
  if (pop >= 1_000) {
    return `${(pop / 1_000).toFixed(1)}K`;
  }
  return pop.toLocaleString();
}

function formatCBills(amount: number): string {
  return amount.toLocaleString('en-US');
}

function getArmorColor(percent: number): string {
  if (percent >= 75) return 'bg-emerald-500';
  if (percent >= 50) return 'bg-amber-500';
  if (percent >= 25) return 'bg-orange-500';
  return 'bg-red-500';
}

function getArmorTextColor(percent: number): string {
  if (percent >= 75) return 'text-emerald-400';
  if (percent >= 50) return 'text-amber-400';
  if (percent >= 25) return 'text-orange-400';
  return 'text-red-400';
}

function getStatusBadgeStyle(status: string): string {
  const statusLower = status.toLowerCase();
  if (statusLower === 'ready' || statusLower === 'operational') {
    return 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50';
  }
  if (statusLower === 'damaged' || statusLower === 'injured') {
    return 'bg-amber-900/50 text-amber-400 border-amber-700/50';
  }
  if (statusLower === 'critical' || statusLower === 'destroyed') {
    return 'bg-red-900/50 text-red-400 border-red-700/50';
  }
  if (statusLower === 'repairing' || statusLower === 'recovering') {
    return 'bg-sky-900/50 text-sky-400 border-sky-700/50';
  }
  return 'bg-slate-700/50 text-slate-400 border-slate-600/50';
}

function getContractTypeIcon(type: string): React.ReactNode {
  const iconClass = 'w-3.5 h-3.5';
  const typeLower = type.toLowerCase();

  if (typeLower === 'raid' || typeLower === 'assault') {
    return (
      <svg
        className={iconClass}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    );
  }
  if (typeLower === 'garrison' || typeLower === 'defense') {
    return (
      <svg
        className={iconClass}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    );
  }
  if (typeLower === 'recon' || typeLower === 'reconnaissance') {
    return (
      <svg
        className={iconClass}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    );
  }
  if (typeLower === 'escort' || typeLower === 'extraction') {
    return (
      <svg
        className={iconClass}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 8l4 4m0 0l-4 4m4-4H3"
        />
      </svg>
    );
  }
  return (
    <svg
      className={iconClass}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}

function EmptyPanel(): React.ReactElement {
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

function SystemDetailsPanel({
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

function ContractDetailsPanel({
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

function MechStatusPanel({ data }: { data: MechData }): React.ReactElement {
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

function PilotStatusPanel({ data }: { data: PilotData }): React.ReactElement {
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

export function ContextPanel({
  mode,
  systemData,
  contractData,
  mechData,
  pilotData,
  className = '',
}: ContextPanelProps): React.ReactElement {
  const renderContent = (): React.ReactElement => {
    switch (mode) {
      case ContextPanelMode.SystemDetails:
        if (!systemData) return <EmptyPanel />;
        return <SystemDetailsPanel data={systemData} />;

      case ContextPanelMode.ContractDetails:
        if (!contractData) return <EmptyPanel />;
        return <ContractDetailsPanel data={contractData} />;

      case ContextPanelMode.MechStatus:
        if (!mechData) return <EmptyPanel />;
        return <MechStatusPanel data={mechData} />;

      case ContextPanelMode.PilotStatus:
        if (!pilotData) return <EmptyPanel />;
        return <PilotStatusPanel data={pilotData} />;

      case ContextPanelMode.Empty:
      default:
        return <EmptyPanel />;
    }
  };

  return (
    <div className={`h-full overflow-hidden ${className}`}>
      {renderContent()}
    </div>
  );
}

export default ContextPanel;
