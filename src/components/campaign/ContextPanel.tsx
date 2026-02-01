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
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
      <path strokeLinecap="round" strokeWidth={1.5} d="M12 2v4m0 12v4m8-10h-4M6 12H2" />
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
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
  }
  if (typeLower === 'garrison' || typeLower === 'defense') {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      className="h-full flex items-center justify-center text-slate-500"
      data-testid="context-panel-empty"
    >
      <div className="flex items-center gap-3">
        <CrosshairIcon className="w-5 h-5 opacity-50" />
        <span className="text-sm">Select a system, contract, or unit</span>
      </div>
    </div>
  );
}

function SystemDetailsPanel({ data }: { data: SystemData }): React.ReactElement {
  return (
    <div
      className="h-full p-4 flex items-center gap-6"
      data-testid="context-panel-system"
    >
      <div className="w-12 h-12 rounded-xl bg-sky-900/30 border border-sky-700/30 flex items-center justify-center flex-shrink-0">
        <GlobeIcon className="w-6 h-6 text-sky-400" />
      </div>

      <div className="min-w-0">
        <div className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">System</div>
        <div className="text-slate-100 text-lg font-semibold truncate">{data.name}</div>
      </div>

      <div className="h-8 w-px bg-slate-700 flex-shrink-0" />

      <div>
        <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Faction</div>
        <span className="inline-flex items-center px-2.5 py-1 rounded bg-sky-900/40 text-sky-400 text-sm font-medium border border-sky-700/40">
          {data.faction}
        </span>
      </div>

      {data.population !== undefined && (
        <>
          <div className="h-8 w-px bg-slate-700 flex-shrink-0" />
          <div>
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Population</div>
            <div className="text-slate-200 text-sm font-mono">{formatPopulation(data.population)}</div>
          </div>
        </>
      )}

      {data.industrialRating && (
        <>
          <div className="h-8 w-px bg-slate-700 flex-shrink-0" />
          <div>
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Industry</div>
            <div className="text-amber-400 text-sm font-medium">{data.industrialRating}</div>
          </div>
        </>
      )}
    </div>
  );
}

function ContractDetailsPanel({ data }: { data: ContractData }): React.ReactElement {
  return (
    <div
      className="h-full p-4 flex items-center gap-6"
      data-testid="context-panel-contract"
    >
      <div className="w-12 h-12 rounded-xl bg-amber-900/30 border border-amber-700/30 flex items-center justify-center flex-shrink-0">
        <DocumentIcon className="w-6 h-6 text-amber-400" />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-slate-400 text-xs uppercase tracking-wider">Contract</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 text-xs border border-slate-600/50">
            {getContractTypeIcon(data.type)}
            {data.type}
          </span>
        </div>
        <div className="text-slate-100 text-lg font-semibold truncate">{data.name}</div>
      </div>

      <div className="h-8 w-px bg-slate-700 flex-shrink-0" />

      <div>
        <div className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Employer</div>
        <div className="text-slate-200 text-sm">{data.employer}</div>
      </div>

      <div className="h-8 w-px bg-slate-700 flex-shrink-0" />

      <div>
        <div className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Payment</div>
        <div className="text-amber-400 text-sm font-mono font-semibold">
          {formatCBills(data.payment)} C-Bills
        </div>
      </div>

      <div className="h-8 w-px bg-slate-700 flex-shrink-0" />

      <div>
        <div className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Deadline</div>
        <div className="text-slate-200 text-sm font-mono">{data.deadline}</div>
      </div>
    </div>
  );
}

function MechStatusPanel({ data }: { data: MechData }): React.ReactElement {
  return (
    <div
      className="h-full p-4 flex items-center gap-6"
      data-testid="context-panel-mech"
    >
      <div className="w-12 h-12 rounded-xl bg-violet-900/30 border border-violet-700/30 flex items-center justify-center flex-shrink-0">
        <MechIcon className="w-6 h-6 text-violet-400" />
      </div>

      <div className="min-w-0">
        <div className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Mech</div>
        <div className="text-slate-100 text-lg font-semibold">
          {data.name}{' '}
          <span className="text-slate-400 font-mono text-sm">{data.variant}</span>
        </div>
      </div>

      <div className="h-8 w-px bg-slate-700 flex-shrink-0" />

      <div>
        <div className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Tonnage</div>
        <div className="text-slate-200 text-sm font-mono">{data.tonnage}t</div>
      </div>

      <div className="h-8 w-px bg-slate-700 flex-shrink-0" />

      <div className="w-40">
        <div className="flex items-center justify-between mb-1">
          <span className="text-slate-400 text-xs uppercase tracking-wider">Armor</span>
          <span className={`text-xs font-mono ${getArmorTextColor(data.armorPercent)}`}>
            {data.armorPercent}%
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getArmorColor(data.armorPercent)} transition-all duration-300`}
            style={{ width: `${data.armorPercent}%` }}
          />
        </div>
      </div>

      <div className="h-8 w-px bg-slate-700 flex-shrink-0" />

      <div>
        <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Status</div>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded text-sm font-medium border ${getStatusBadgeStyle(data.status)}`}
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
      className="h-full p-4 flex items-center gap-6"
      data-testid="context-panel-pilot"
    >
      <div className="w-12 h-12 rounded-xl bg-emerald-900/30 border border-emerald-700/30 flex items-center justify-center flex-shrink-0">
        <PilotIcon className="w-6 h-6 text-emerald-400" />
      </div>

      <div className="min-w-0">
        <div className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Pilot</div>
        <div className="text-slate-100 text-lg font-semibold truncate">
          {data.name}
          <span className="text-emerald-400 text-sm font-normal ml-2">&ldquo;{data.callsign}&rdquo;</span>
        </div>
      </div>

      <div className="h-8 w-px bg-slate-700 flex-shrink-0" />

      <div>
        <div className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Gunnery</div>
        <div className="text-cyan-400 text-xl font-mono font-bold">{data.gunnery}</div>
      </div>

      <div className="h-8 w-px bg-slate-700 flex-shrink-0" />

      <div>
        <div className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Piloting</div>
        <div className="text-amber-400 text-xl font-mono font-bold">{data.piloting}</div>
      </div>

      <div className="h-8 w-px bg-slate-700 flex-shrink-0" />

      <div>
        <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Wounds</div>
        <div className="flex items-center gap-1">
          {Array.from({ length: maxWounds }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full border ${
                i < data.wounds
                  ? 'bg-red-500 border-red-400'
                  : 'bg-slate-700 border-slate-600'
              }`}
            />
          ))}
          {data.wounds > 0 && (
            <span className="text-red-400 text-xs ml-1">
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
