export type NormalizedTechBase = 'Inner Sphere' | 'Clan'
export type EquipmentTechBase = 'IS' | 'Clan'

export type UnitType = 'BattleMech' | 'IndustrialMech' | 'ProtoMech' | 'BattleArmor' | 'Vehicle'

export interface TechContext {
  techBase: NormalizedTechBase
  unitType: UnitType
  year?: number
  rulesLevel?: 'Introductory' | 'Standard' | 'Advanced' | 'Experimental'
}

export type EquipmentCategory =
  | 'Energy Weapons'
  | 'Ballistic Weapons'
  | 'Missile Weapons'
  | 'Artillery Weapons'
  | 'Capital Weapons'
  | 'Physical Weapons'
  | 'Anti-Personnel Weapons'
  | 'One-Shot Weapons'
  | 'Torpedoes'
  | 'Ammunition'
  | 'Heat Management'
  | 'Movement Equipment'
  | 'Equipment'
  | 'Industrial Equipment'
  | 'Electronic Warfare'
  | 'Prototype Equipment'

export type ComponentCategory =
  | 'engine'
  | 'gyro'
  | 'structure'
  | 'armor'
  | 'heatSink'
  | 'jumpJet'
  | 'enhancement'

export type CatalogItemKind = 'equipment' | 'component'

export interface CatalogMetrics {
  weight?: number | null
  crits?: number | null
  heat?: number | null
  damage?: number | null
  rangeShort?: number | null
  rangeMedium?: number | null
  rangeLong?: number | null
  ammoPerTon?: number | null
  battleValue?: number | null
  cost?: number | null
}

export interface CatalogItemBase {
  id: string
  name: string
  techBase: NormalizedTechBase
  rulesLevel: 'Introductory' | 'Standard' | 'Advanced' | 'Experimental'
  introductionYear: number
  description?: string
  sourceBook?: string
  pageReference?: string
  tags: string[]
  unitType: UnitType
}

export interface EquipmentCatalogItem extends CatalogItemBase {
  kind: 'equipment'
  category: EquipmentCategory
  requiresAmmo: boolean
  baseType?: string
  metrics: CatalogMetrics
}

export interface ComponentCatalogItem extends CatalogItemBase {
  kind: 'component'
  componentCategory: ComponentCategory
  metrics: CatalogMetrics
}

export type CatalogItem = EquipmentCatalogItem | ComponentCatalogItem

export type SortBy =
  | 'name'
  | 'weight'
  | 'crits'
  | 'techBase'
  | 'damage'
  | 'heat'
  | 'battleValue'
  | 'cost'
  | 'introductionYear'

export interface SearchCriteria {
  text?: string
  categories?: EquipmentCategory[]
  componentCategories?: ComponentCategory[]
  techBase?: NormalizedTechBase | EquipmentTechBase | 'all'
  unitType?: UnitType
  rulesLevel?: 'Introductory' | 'Standard' | 'Advanced' | 'Experimental'
  eraRange?: [number, number]
  requiresAmmo?: boolean
  metrics?: {
    weight?: [number, number]
    crits?: [number, number]
    heat?: [number, number]
    damage?: [number, number]
  }
  sortBy?: SortBy
  sortOrder?: 'ASC' | 'DESC'
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  items: T[]
  totalCount: number
  currentPage: number
  pageSize: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}




