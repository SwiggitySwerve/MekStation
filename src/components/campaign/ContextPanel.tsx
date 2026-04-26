import React from 'react';

import { ContextPanelMode, type ContextPanelProps } from './ContextPanel.types';
import {
  EmptyPanel,
  SystemDetailsPanel,
  ContractDetailsPanel,
  MechStatusPanel,
  PilotStatusPanel,
} from './ContextPanelTabs';

// Re-export leaf types so existing consumers (e.g. stories, tabs file)
// keep their `from './ContextPanel'` import paths working.
export { ContextPanelMode } from './ContextPanel.types';
export type {
  SystemData,
  ContractData,
  MechData,
  PilotData,
  ContextPanelProps,
} from './ContextPanel.types';

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
