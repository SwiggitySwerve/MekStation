/**
 * Catalog Gateway - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

import { SearchCriteria, TechContext, CatalogItem, PaginatedResult } from './types';

export class CatalogGateway {
  async search(criteria: SearchCriteria, context: TechContext): Promise<PaginatedResult<CatalogItem>> {
    return {
      items: [],
      total: 0,
      page: criteria.page ?? 1,
      pageSize: criteria.pageSize ?? 25,
      totalPages: 0,
    };
  }

  async getById(id: string, context: TechContext): Promise<CatalogItem | null> {
    return null;
  }

  async getCategories(context: TechContext): Promise<string[]> {
    return [];
  }
}

export const catalogGateway = new CatalogGateway();


