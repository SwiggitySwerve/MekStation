import { EquipmentDataService } from '../../utils/equipment/EquipmentDataService'
import { CatalogItem, EquipmentCatalogItem, NormalizedTechBase, TechContext } from './types'

function normalizeTechBase(tb: string): NormalizedTechBase {
  if (tb === 'IS') return 'Inner Sphere'
  if (tb === 'Clan') return 'Clan'
  // already normalized or fallback
  return (tb as NormalizedTechBase) || 'Inner Sphere'
}

function tokenize(name: string, baseType?: string, special?: string[]): string[] {
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
  add(baseType)
  ;(special || []).forEach(add)

  // weapon family hints
  const n = name.toLowerCase()
  if (n.includes('er')) tokens.add('er')
  if (n.includes('pulse')) tokens.add('pulse')
  if (n.includes('ultra') || n.includes('uac')) tokens.add('uac')
  if (n.includes('lb') || n.includes('lb-x')) tokens.add('lbx')
  if (n.includes('streak')) tokens.add('streak')
  if (n.includes('targeting')) tokens.add('tc')
  if (n.includes('ecm')) tokens.add('ecm')
  if (n.includes('case')) tokens.add('case')

  return Array.from(tokens)
}

export class EquipmentAdapter {
  loadAll(ctx?: TechContext): EquipmentCatalogItem[] {
    const result = EquipmentDataService.getAllEquipment()
    if (!result.isValid) return []

    return result.equipment.map(eq => {
      const techBase = normalizeTechBase(eq.techBase)
      const item: EquipmentCatalogItem = {
        kind: 'equipment',
        id: eq.id,
        name: eq.name,
        techBase,
        rulesLevel: (eq.rulesLevel as any) || 'Standard',
        introductionYear: eq.introductionYear || 3025,
        description: eq.description,
        sourceBook: eq.sourceBook,
        pageReference: eq.pageReference,
        tags: tokenize(eq.name, eq.baseType, eq.special),
        unitType: ctx?.unitType || 'BattleMech',
        category: eq.category as any,
        requiresAmmo: eq.requiresAmmo,
        baseType: eq.baseType,
        metrics: {
          weight: eq.weight,
          crits: eq.crits,
          heat: eq.heat ?? null,
          damage: eq.damage ?? null,
          rangeShort: eq.rangeShort ?? null,
          rangeMedium: eq.rangeMedium ?? null,
          rangeLong: eq.rangeLong ?? null,
          ammoPerTon: eq.ammoPerTon ?? null,
          battleValue: eq.battleValue ?? null,
          cost: eq.cost ?? null
        }
      }
      return item
    })
  }
}