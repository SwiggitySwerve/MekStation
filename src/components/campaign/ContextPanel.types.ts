/**
 * Shared types for ContextPanel — leaf module to break circular dependency
 * between ContextPanel.tsx and ContextPanelTabs.tsx.
 */

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
