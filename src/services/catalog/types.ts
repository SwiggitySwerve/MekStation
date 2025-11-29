/**
 * Catalog Types - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

export type UnitType = 'BattleMech' | 'Vehicle' | 'Infantry' | 'ProtoMech' | 'BattleArmor' | 'Aerospace';
export type SortBy = 'name' | 'tonnage' | 'techBase' | 'battleValue';

export interface SearchCriteria {
  query?: string;
  unitType?: UnitType[];
  techBase?: string[];
  minTonnage?: number;
  maxTonnage?: number;
  era?: string;
  sortBy?: SortBy;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface TechContext {
  techBase: string;
  rulesLevel: string;
  era?: string;
  unitType?: UnitType;
}

export interface CatalogItem {
  id: string;
  name: string;
  kind: string;
  techBase: string;
  rulesLevel: string;
  unitType?: UnitType;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}


