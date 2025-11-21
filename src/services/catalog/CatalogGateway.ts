import { CatalogService } from './CatalogService'
import { CatalogItem, PaginatedResult, SearchCriteria, TechContext } from './types'

let instance: CatalogService | null = null
let currentContext: TechContext = { techBase: 'Inner Sphere', unitType: 'BattleMech' }
let initialized = false

async function ensureInitialized(): Promise<void> {
  if (!instance) instance = new CatalogService()
  if (!initialized) {
    await instance.initialize(currentContext)
    initialized = true
  }
}

export const CatalogGateway = {
  async setContext(ctx: Partial<TechContext>): Promise<void> {
    currentContext = { ...currentContext, ...ctx }
    if (!instance) instance = new CatalogService()
    await instance.initialize(currentContext)
    initialized = true
  },

  getContext(): TechContext {
    return currentContext
  },

  async search(criteria: SearchCriteria): Promise<PaginatedResult<CatalogItem>> {
    await ensureInitialized()
    return instance!.search(criteria, currentContext)
  },

  async getById(id: string): Promise<CatalogItem | null> {
    await ensureInitialized()
    return instance!.getById(id, currentContext)
  },

  async stats(): Promise<{ total: number; byKind: Record<string, number>; byTechBase: Record<string, number> }> {
    await ensureInitialized()
    return instance!.stats(currentContext)
  }
}




