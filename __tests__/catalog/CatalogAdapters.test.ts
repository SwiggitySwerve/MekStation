import { EquipmentAdapter } from '../../services/catalog/EquipmentAdapter'
import { ComponentAdapter } from '../../services/catalog/ComponentAdapter'
import { TechContext } from '../../services/catalog/types'

describe('Catalog Adapters', () => {
  const ctx: TechContext = { techBase: 'Inner Sphere', unitType: 'BattleMech' }

  test('EquipmentAdapter loads flattened equipment with expected fields', () => {
    const eqAdapter = new EquipmentAdapter()
    const items = eqAdapter.loadAll(ctx)
    expect(Array.isArray(items)).toBe(true)
    expect(items.length).toBeGreaterThan(0)

    const sample = items[0]
    expect(sample.kind).toBe('equipment')
    expect(typeof sample.id).toBe('string')
    expect(typeof sample.name).toBe('string')
    expect(['Inner Sphere', 'Clan']).toContain(sample.techBase)
    expect(sample.metrics).toBeDefined()
    expect(typeof sample.metrics.weight).toBe('number')
    expect(typeof sample.metrics.crits).toBe('number')
  })

  test('ComponentAdapter loads components with tech base and categories', () => {
    const compAdapter = new ComponentAdapter()
    const items = compAdapter.loadAll(ctx)
    expect(Array.isArray(items)).toBe(true)
    expect(items.length).toBeGreaterThan(0)

    const sample = items[0]
    expect(sample.kind).toBe('component')
    expect(['Inner Sphere', 'Clan']).toContain(sample.techBase)
    expect(['engine','gyro','structure','armor','heatSink','jumpJet','enhancement']).toContain(sample.componentCategory)
  })

  test('ComponentAdapter includes Endo Steel variants', () => {
    const compAdapter = new ComponentAdapter()
    const items = compAdapter.loadAll(ctx)
    const names = items.map(i => i.name)
    expect(names.some(n => n.toLowerCase().includes('endo steel'))).toBe(true)
  })
})