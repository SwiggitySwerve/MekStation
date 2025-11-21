import { EquipmentAdapter } from './EquipmentAdapter'
import { ComponentAdapter } from './ComponentAdapter'
import { SearchIndex } from './SearchIndex'
import { CatalogItem, PaginatedResult, SearchCriteria, TechContext } from './types'

export class CatalogService {
  private equipmentAdapter = new EquipmentAdapter()
  private componentAdapter = new ComponentAdapter()
  private index = new SearchIndex()
  private cacheTimestamp = 0
  private readonly CACHE_MS = 5 * 60 * 1000

  async initialize(ctx: TechContext): Promise<void> {
    const items = this.buildItems(ctx)
    this.index.build(items)
    this.cacheTimestamp = Date.now()
  }

  invalidateCache(): void {
    this.cacheTimestamp = 0
  }

  private buildItems(ctx: TechContext): CatalogItem[] {
    const eq = this.equipmentAdapter.loadAll(ctx)
    const comp = this.componentAdapter.loadAll(ctx)
    return [...eq, ...comp]
  }

  private ensureFresh(ctx: TechContext): void {
    if (Date.now() - this.cacheTimestamp > this.CACHE_MS) {
      const items = this.buildItems(ctx)
      this.index.build(items)
      this.cacheTimestamp = Date.now()
    }
  }

  getById(id: string, ctx: TechContext): CatalogItem | null {
    this.ensureFresh(ctx)
    return this.index.getById(id, ctx)
  }

  search(criteria: SearchCriteria, ctx: TechContext): PaginatedResult<CatalogItem> {
    this.ensureFresh(ctx)
    return this.index.search(criteria, ctx)
  }

  stats(ctx: TechContext): {
    total: number
    byKind: Record<string, number>
    byTechBase: Record<string, number>
  } {
    this.ensureFresh(ctx)
    // simple stats
    const all = this.index['items'] as CatalogItem[]
    const byKind: Record<string, number> = {}
    const byTechBase: Record<string, number> = {}
    all.forEach(i => {
      byKind[i.kind] = (byKind[i.kind] || 0) + 1
      byTechBase[i.techBase] = (byTechBase[i.techBase] || 0) + 1
    })
    return { total: all.length, byKind, byTechBase }
  }
}




