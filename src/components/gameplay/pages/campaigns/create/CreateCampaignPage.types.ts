import { CampaignPreset } from '@/types/campaign/CampaignPreset';
import { CampaignType } from '@/types/campaign/CampaignType';

export interface SelectedUnit {
  id: string;
  name: string;
  tonnage: number;
}

export interface SelectedPilot {
  id: string;
  name: string;
}

export type PilotAssignments = Record<string, string>;

export interface BasicInfoStepProps {
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export interface CampaignTypeStepProps {
  campaignType: CampaignType;
  onSelectType: (type: CampaignType) => void;
}

export interface PresetStepProps {
  selectedPreset: CampaignPreset;
  onSelectPreset: (preset: CampaignPreset) => void;
}

export interface RosterStepProps {
  selectedUnits: SelectedUnit[];
  selectedPilots: SelectedPilot[];
  pilotAssignments: PilotAssignments;
  onAddTemplateUnit: (templateName: string, tonnage: number) => void;
  onRemoveUnit: (unitId: string) => void;
  onAddPilot: () => void;
  onRemovePilot: (pilotId: string) => void;
  onAssignPilot: (unitId: string, pilotId: string) => void;
}

export interface ReviewStepProps {
  name: string;
  description: string;
  campaignType: CampaignType;
  selectedPreset: CampaignPreset;
  selectedPresetName?: string;
  selectedPresetDescription?: string;
  unitCount: number;
  pilotCount: number;
}
