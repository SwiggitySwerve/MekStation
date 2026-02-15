import React from 'react';

import {
  EmptyPanel,
  SystemDetailsPanel,
  ContractDetailsPanel,
  MechStatusPanel,
  PilotStatusPanel,
} from './ContextPanelTabs';

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
