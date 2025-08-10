import { CatalogService } from '../../services/catalog/CatalogService'
import { TechContext } from '../../services/catalog/types'

describe('Catalog Filters', () => {
  const ctx: TechContext = { techBase: 'Inner Sphere', unitType: 'BattleMech' }

  test('requiresAmmo=true returns only ammo-requiring equipment', async () => {
    const service = new CatalogService()
    await service.initialize(ctx)

    const res = service.search({ requiresAmmo: true, page: 1, pageSize: 50 }, ctx)
    expect(res.items.length).toBeGreaterThan(0)
    expect(res.items.every(i => i.kind === 'equipment' && (i as any).requiresAmmo === true)).toBe(true)
  })

  test('weight metrics filter narrows to specified range', async () => {
    const service = new CatalogService()
    await service.initialize(ctx)

    const res = service.search({ metrics: { weight: [0.5, 2] }, page: 1, pageSize: 100 }, ctx)
    expect(res.items.length).toBeGreaterThan(0)
    expect(res.items.every(i => {
      const w = i.metrics.weight ?? 0
      return w >= 0.5 && w <= 2
    })).toBe(true)
  })

  test('componentCategories filter returns only requested component category', async () => {
    const service = new CatalogService()
    await service.initialize(ctx)

    const res = service.search({ componentCategories: ['engine'], page: 1, pageSize: 50 }, ctx)
    expect(res.items.length).toBeGreaterThan(0)
    expect(res.items.every(i => i.kind === 'component' && (i as any).componentCategory === 'engine')).toBe(true)
  })
})