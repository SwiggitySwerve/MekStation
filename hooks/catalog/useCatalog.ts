import { useMemo } from 'react'
import { CatalogGateway } from '../../services/catalog/CatalogGateway'
import { CatalogItem, PaginatedResult, SearchCriteria, TechContext } from '../../services/catalog/types'

export function useCatalog(defaultCtx?: Partial<TechContext>) {
  useMemo(() => {
    if (defaultCtx) void CatalogGateway.setContext(defaultCtx)
  }, [JSON.stringify(defaultCtx || {})])

  async function search(criteria: SearchCriteria): Promise<PaginatedResult<CatalogItem>> {
    return CatalogGateway.search(criteria)
  }

  async function getById(id: string): Promise<CatalogItem | null> {
    return CatalogGateway.getById(id)
  }

  async function setContext(ctx: Partial<TechContext>): Promise<void> {
    return CatalogGateway.setContext(ctx)
  }

  return { search, getById, setContext }
}