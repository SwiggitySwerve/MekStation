import {
  COMPONENT_CATEGORIES as COMPONENT_CATEGORY_MAP,
  ComponentConfigurationCategory,
  ComponentConfiguration,
  TechBaseMemory,
  ComponentMemoryState,
} from '../ComponentConfiguration';
import { TechBase, TechBaseFilter } from '../TechBase';

export type { ComponentConfigurationCategory, ComponentConfiguration, TechBaseMemory, ComponentMemoryState };
export * from '../ComponentDatabase';

export const COMPONENT_CATEGORIES = Object.keys(
  COMPONENT_CATEGORY_MAP,
) as ComponentConfigurationCategory[];

export const TECH_BASES: ReadonlyArray<TechBase> = [
  TechBase.INNER_SPHERE,
  TechBase.CLAN,
];

export const TECH_BASE_FILTERS: ReadonlyArray<TechBaseFilter> = [
  TechBaseFilter.INNER_SPHERE,
  TechBaseFilter.CLAN,
  TechBaseFilter.MIXED,
];


