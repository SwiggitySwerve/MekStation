import { SearchIndex } from '../../services/catalog/SearchIndex'
import { CatalogService } from '../../services/catalog/CatalogService'
import { TechContext, SearchCriteria } from '../../services/catalog/types'
import { EquipmentAdapter } from '../../services/catalog/EquipmentAdapter'
import { ComponentAdapter } from '../../services/catalog/ComponentAdapter'

describe('Catalog Search', () => {
  const ctx: TechContext = { techBase: 'Inner Sphere', unitType: 'BattleMech' }

  test('SearchIndex filters by tech base and text', () => {
    const eqAdapter = new EquipmentAdapter()
    const compAdapter = new ComponentAdapter()
    const items = [...eqAdapter.loadAll(ctx), ...compAdapter.loadAll(ctx)]

    const index = new SearchIndex()
    index.build(items)

    const result = index.search({ text: 'laser', page: 1, pageSize: 20 }, ctx)
    expect(result.items.length).toBeGreaterThan(0)
    // Ensure all results match tech base filter
    expect(result.items.every(i => i.techBase === 'Inner Sphere')).toBe(true)
  })

  test('CatalogService initializes and searches with pagination', async () => {
    const service = new CatalogService()
    await service.initialize(ctx)

    const criteria: SearchCriteria = { text: 'endo', componentCategories: ['structure'], page: 1, pageSize: 5 }
    const res = service.search(criteria, ctx)

    expect(res.items.length).toBeGreaterThan(0)
    expect(res.currentPage).toBe(1)
    expect(res.pageSize).toBe(5)
    expect(res.totalCount).toBeGreaterThanOrEqual(res.items.length)
  })

  test('Sorting by weight ASC yields non-decreasing weights', async () => {
    const service = new CatalogService()
    await service.initialize(ctx)

    const res = service.search({ text: '', sortBy: 'weight', sortOrder: 'ASC', page: 1, pageSize: 20 }, ctx)
    const weights = res.items.map(i => i.metrics.weight ?? 0)
    for (let i = 1; i < weights.length; i++) {
      expect(weights[i] >= weights[i - 1]).toBe(true)
    }
  })
})