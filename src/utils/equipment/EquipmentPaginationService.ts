/**
 * Equipment Pagination Service - Handles pagination operations
 * Single responsibility for pagination logic and page calculations
 * Following SOLID principles - Single Responsibility and Open/Closed
 */

import {
  IEquipmentPaginationService,
  PaginationConfig,
  PaginationResult
} from './EquipmentBrowserTypes';

export class EquipmentPaginationService implements IEquipmentPaginationService {

  /**
   * Paginate an array of items
   */
  paginate<T>(items: T[], config: PaginationConfig): PaginationResult<T> {
    console.log(`[EquipmentPaginationService] Paginating ${items.length} items, page ${config.currentPage}, size ${config.pageSize}`);

    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / config.pageSize);
    const currentPage = Math.max(1, Math.min(config.currentPage, totalPages));
    
    const startIndex = (currentPage - 1) * config.pageSize;
    const endIndex = Math.min(startIndex + config.pageSize, totalItems);
    const paginatedItems = items.slice(startIndex, endIndex);
    
    const pagination = this.calculatePaginationInfo(totalItems, {
      ...config,
      currentPage
    });
    
    const result: PaginationResult<T> = {
      items: paginatedItems,
      totalItems,
      totalPages: pagination.totalPages,
      currentPage,
      pageSize: config.pageSize,
      hasNextPage: pagination.hasNextPage,
      hasPreviousPage: pagination.hasPreviousPage
    };

    console.log(`[EquipmentPaginationService] Paginated result: ${paginatedItems.length} items on page ${currentPage}/${totalPages}`);
    return result;
  }

  /**
   * Calculate pagination info without creating the result
   */
  calculatePaginationInfo(totalItems: number, config: PaginationConfig): {
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  } {
    const totalPages = Math.ceil(totalItems / config.pageSize);
    const currentPage = Math.max(1, Math.min(config.currentPage, totalPages));
    
    return {
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1
    };
  }
}
