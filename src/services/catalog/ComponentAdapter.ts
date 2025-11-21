import { COMPONENT_DATABASE } from '../../utils/componentDatabase'
import { ComponentCatalogItem, ComponentCategory, NormalizedTechBase, TechContext } from './types'

function tokenize(name: string, features?: string[]): string[] {
  const tokens = new Set<string>()
  const add = (s?: string) => {
    if (!s) return
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s\-\/\(\)]/g, ' ')
      .split(/\s|\//)
      .filter(Boolean)
      .forEach(t => tokens.add(t))
  }
  add(name)
  ;(features || []).forEach(add)
  return Array.from(tokens)
}

function tbFromKey(key: string): NormalizedTechBase {
  return key === 'Clan' ? 'Clan' : 'Inner Sphere'
}

export class ComponentAdapter {
  loadAll(ctx?: TechContext): ComponentCatalogItem[] {
    const unitType = ctx?.unitType || 'BattleMech'
    const items: ComponentCatalogItem[] = []

    const pushVariant = (
      componentCategory: ComponentCategory,
      techBaseKey: string,
      entry: any
    ) => {
      const techBase = tbFromKey(techBaseKey)
      const id = `${componentCategory}:${entry.id}:${techBase}`
      const name = entry.name
      const metrics = {
        weight: typeof entry.weight === 'number' ? entry.weight : null,
        crits: typeof entry.criticalSlots === 'number' ? entry.criticalSlots : null,
        heat: entry.dissipation ? -entry.dissipation : null,
        damage: null,
        rangeShort: null,
        rangeMedium: null,
        rangeLong: null,
        ammoPerTon: null,
        battleValue: entry.battleValue ?? null,
        cost: entry.cost ?? null
      }

      items.push({
        kind: 'component',
        id,
        name,
        techBase,
        rulesLevel: entry.rulesLevel || 'Standard',
        introductionYear: entry.introductionYear || 3025,
        description: entry.description,
        sourceBook: undefined,
        pageReference: undefined,
        tags: tokenize(name, entry.features),
        unitType,
        componentCategory,
        metrics
      })
    }

    const catMap: Array<[ComponentCategory, any]> = [
      ['structure', COMPONENT_DATABASE.chassis],
      ['engine', COMPONENT_DATABASE.engine],
      ['gyro', COMPONENT_DATABASE.gyro],
      ['heatSink', COMPONENT_DATABASE.heatsink],
      ['armor', COMPONENT_DATABASE.armor],
      ['jumpJet', COMPONENT_DATABASE.movement || {}],
      ['enhancement', COMPONENT_DATABASE.myomer || {}]
    ]

    for (const [componentCategory, db] of catMap) {
      Object.keys(db || {}).forEach(techBaseKey => {
        const list = db[techBaseKey] || []
        list.forEach((entry: any) => pushVariant(componentCategory, techBaseKey, entry))
      })
    }

    return items
  }
}




