import { MechLocation } from '@/types/construction';
import { EquipmentCategory } from '@/types/equipment';

export interface LoadoutEquipmentItem {
  instanceId: string;
  equipmentId: string;
  name: string;
  category: EquipmentCategory;
  weight: number;
  criticalSlots: number;
  heat?: number;
  damage?: number | string;
  ranges?: {
    minimum: number;
    short: number;
    medium: number;
    long: number;
  };
  isAllocated: boolean;
  location?: string;
  isRemovable: boolean;
  isOmniPodMounted?: boolean;
  targetingComputerCompatible?: boolean;
}

export interface AvailableLocation {
  location: MechLocation;
  label: string;
  availableSlots: number;
  canFit: boolean;
}

export interface GlobalLoadoutTrayProps {
  equipment: LoadoutEquipmentItem[];
  equipmentCount: number;
  onRemoveEquipment: (instanceId: string) => void;
  onRemoveAllEquipment: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  selectedEquipmentId?: string | null;
  onSelectEquipment?: (instanceId: string | null) => void;
  onUnassignEquipment?: (instanceId: string) => void;
  onQuickAssign?: (instanceId: string, location: MechLocation) => void;
  availableLocations?: AvailableLocation[];
  isOmni?: boolean;
  className?: string;
}
