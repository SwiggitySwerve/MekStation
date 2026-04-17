/**
 * Small constructor helpers for the SPA catalog data files. Keeps each
 * per-category table legible by eliding the fields that default for that
 * category (e.g. gunnery entries default xpCost=20, pipelines=['to-hit']).
 */

import type { ISPADefinition } from '@/types/spa/SPADefinition';

type CoreFields = Pick<ISPADefinition, 'id' | 'displayName' | 'description'>;
type Overrides = CoreFields & Partial<ISPADefinition>;

export function gunnery(overrides: Overrides): ISPADefinition {
  return {
    category: 'gunnery',
    source: 'CamOps',
    xpCost: 20,
    isFlaw: false,
    isOriginOnly: false,
    pipelines: ['to-hit'],
    requiresDesignation: false,
    ...overrides,
  };
}

export function piloting(overrides: Overrides): ISPADefinition {
  return {
    category: 'piloting',
    source: 'CamOps',
    xpCost: 20,
    isFlaw: false,
    isOriginOnly: false,
    pipelines: ['psr'],
    requiresDesignation: false,
    ...overrides,
  };
}

export function support(overrides: Overrides): ISPADefinition {
  return {
    category: 'miscellaneous',
    source: 'CamOps',
    xpCost: 20,
    isFlaw: false,
    isOriginOnly: false,
    pipelines: [],
    requiresDesignation: false,
    ...overrides,
  };
}

export function bioware(overrides: Overrides): ISPADefinition {
  return {
    category: 'bioware',
    source: 'ManeiDomini',
    xpCost: null,
    isFlaw: false,
    isOriginOnly: true,
    pipelines: ['special'],
    requiresDesignation: false,
    ...overrides,
  };
}

export function edge(overrides: Overrides): ISPADefinition {
  return {
    category: 'edge',
    source: 'CamOps',
    xpCost: null,
    isFlaw: false,
    isOriginOnly: false,
    pipelines: ['special'],
    requiresDesignation: false,
    ...overrides,
  };
}
