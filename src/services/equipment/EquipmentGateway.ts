/**
 * Equipment Gateway - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

import { TechBase } from '../../types';

export interface EquipmentSearchCriteria {
  query?: string;
  category?: string[];
  techBase?: TechBase[];
  minWeight?: number;
  maxWeight?: number;
  page?: number;
  pageSize?: number;
}

export interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  techBase: TechBase;
  weight: number;
  slots: number;
}

export class EquipmentGateway {
  async search(criteria: EquipmentSearchCriteria): Promise<EquipmentItem[]> {
    return [];
  }

  async getById(id: string): Promise<EquipmentItem | null> {
    return null;
  }

  async getCategories(): Promise<string[]> {
    return [];
  }
}

export const equipmentGateway = new EquipmentGateway();


