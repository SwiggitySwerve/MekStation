import { CatalogItem, PaginatedResult, SearchCriteria, SortBy, TechContext, NormalizedTechBase } from './types'

function toNormTechBase(tb: any): NormalizedTechBase | 'all' {
  if (tb === 'IS') return 'Inner Sphere'
  if (tb === 'Clan') return 'Clan'
  if (tb === 'Inner Sphere' || tb === 'Clan') return tb
  if (tb === 'all') return 'all'
  return 'all'
}

function scoreText(text: string | undefined, tokens: string[], name: string): number {
  if (!text) return 0
  const q = text.toLowerCase().trim()
  if (!q) return 0
  let score = 0
  const nameLower = name.toLowerCase()
  if (nameLower === q) score += 6
  if (nameLower.startsWith(q)) score += 4
  if (nameLower.includes(q)) score += 2
  if (tokens.includes(q)) score += 2
  return score
}

function withinRange(value: number | null | undefined, range?: [number, number]): boolean {
  if (value == null) return false
  if (!range) return true
  return value >= range[0] && value <= range[1]
}

export class SearchIndex {
  private items: CatalogItem[] = []
  private byId = new Map<string, CatalogItem>()

  build(items: CatalogItem[]): void {
    this.items = items
    this.byId.clear()
    items.forEach(i => this.byId.set(i.id, i))
  }

  getById(id: string, ctx?: TechContext): CatalogItem | null {
    const item = this.byId.get(id) || null
    if (!item) return null
    // Tech context filtering can be added here if ID is not variant-specific
    return item
  }

  search(criteria: SearchCriteria, ctx: TechContext): PaginatedResult<CatalogItem> {
    const { page = 1, pageSize = 25, sortBy = 'name', sortOrder = 'ASC' } = criteria
    const tb = toNormTechBase(criteria.techBase ?? ctx.techBase)

    let filtered = this.items.filter(i => {
      // tech base
      if (tb !== 'all' && i.techBase !== tb) return false
      // unit type
      if (criteria.unitType && i.unitType !== criteria.unitType) return false
      if (!criteria.unitType && i.unitType !== ctx.unitType) return false
      // Restrict kinds when filters imply a kind
      if (criteria.componentCategories && i.kind !== 'component') return false
      if ((criteria.categories || typeof criteria.requiresAmmo === 'boolean') && i.kind !== 'equipment') return false
      // rules level
      if (criteria.rulesLevel && i.rulesLevel !== criteria.rulesLevel) return false
      // era
      if (criteria.eraRange) {
        const [min, max] = criteria.eraRange
        if (i.introductionYear < min || i.introductionYear > max) return false
      }
      // equipment/category filters
      if (criteria.categories && i.kind === 'equipment') {
        if (!criteria.categories.includes(i.category)) return false
      }
      if (criteria.componentCategories && i.kind === 'component') {
        if (!criteria.componentCategories.includes(i.componentCategory)) return false
      }
      // requires ammo
      if (typeof criteria.requiresAmmo === 'boolean' && i.kind === 'equipment') {
        if ((i as any).requiresAmmo !== criteria.requiresAmmo) return false
      }
      // metrics band filters
      const m = i.metrics
      const met = criteria.metrics || {}
      if (met.weight && !withinRange(m.weight ?? null, met.weight)) return false
      if (met.crits && !withinRange(m.crits ?? null, met.crits)) return false
      if (met.heat && !withinRange(m.heat ?? null, met.heat)) return false
      if (met.damage && !withinRange(m.damage ?? null, met.damage)) return false
      return true
    })

    // text scoring
    const query = (criteria.text || '').trim()
    if (query) {
      const scored = filtered.map(i => ({
        item: i,
        score: scoreText(query, i.tags, i.name) + (i.techBase === ctx.techBase ? 1 : 0)
      }))
      scored.sort((a, b) => b.score - a.score)
      filtered = scored.map(s => s.item)
    }

    // sort
    const cmp = (a: CatalogItem, b: CatalogItem) => {
      const dir = sortOrder === 'DESC' ? -1 : 1
      const pickNum = (fn: (x: CatalogItem) => number) => {
        const av = fn(a)
        const bv = fn(b)
        return (av - bv) * dir
      }
      switch (sortBy as SortBy) {
        case 'name':
          return a.name.localeCompare(b.name) * dir
        case 'weight':
          return pickNum(x => (x.metrics.weight ?? 0))
        case 'crits':
          return pickNum(x => (x.metrics.crits ?? 0))
        case 'techBase':
          return a.techBase.localeCompare(b.techBase) * dir
        case 'damage':
          return pickNum(x => (x.metrics.damage ?? 0))
        case 'heat':
          return pickNum(x => (x.metrics.heat ?? 0))
        case 'battleValue':
          return pickNum(x => (x.metrics.battleValue ?? 0))
        case 'cost':
          return pickNum(x => (x.metrics.cost ?? 0))
        case 'introductionYear':
          return pickNum(x => x.introductionYear)
        default:
          return a.name.localeCompare(b.name) * dir
      }
    }

    filtered.sort(cmp)

    // paginate
    const totalCount = filtered.length
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    const currentPage = Math.min(Math.max(1, page), totalPages)
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    const items = filtered.slice(start, end)

    return {
      items,
      totalCount,
      currentPage,
      pageSize,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1
    }
  }
}