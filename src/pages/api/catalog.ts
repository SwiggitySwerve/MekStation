import type { NextApiRequest, NextApiResponse } from 'next'
import { CatalogGateway } from '../../services/catalog/CatalogGateway'
import { SearchCriteria, TechContext, UnitType, SortBy } from '../../services/catalog/types'

function isUnitType(value: string): value is UnitType {
  return ['BattleMech', 'IndustrialMech', 'ProtoMech', 'BattleArmor', 'Vehicle'].includes(value)
}

function isSortBy(value: string): value is SortBy {
  return ['name', 'weight', 'crits', 'techBase', 'damage', 'heat', 'battleValue', 'cost', 'introductionYear'].includes(value)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { techBase, unitType, year, rulesLevel } = req.query

    const ctx: Partial<TechContext> = {}
    if (techBase === 'Inner Sphere' || techBase === 'Clan') ctx.techBase = techBase
    if (typeof unitType === 'string' && isUnitType(unitType)) ctx.unitType = unitType
    if (typeof year === 'string') ctx.year = parseInt(year, 10)
    if (
      rulesLevel === 'Introductory' ||
      rulesLevel === 'Standard' ||
      rulesLevel === 'Advanced' ||
      rulesLevel === 'Experimental'
    ) ctx.rulesLevel = rulesLevel

    if (Object.keys(ctx).length) {
      await CatalogGateway.setContext(ctx)
    }

    const criteria: SearchCriteria = {}
    if (typeof req.query.text === 'string') criteria.text = req.query.text
    if (typeof req.query.page === 'string') criteria.page = parseInt(req.query.page, 10)
    if (typeof req.query.pageSize === 'string') criteria.pageSize = Math.min(parseInt(req.query.pageSize, 10), 100)
    if (typeof req.query.sortBy === 'string' && isSortBy(req.query.sortBy)) criteria.sortBy = req.query.sortBy
    if (typeof req.query.sortOrder === 'string' && (req.query.sortOrder === 'ASC' || req.query.sortOrder === 'DESC')) criteria.sortOrder = req.query.sortOrder

    if (typeof req.query.requiresAmmo === 'string') criteria.requiresAmmo = req.query.requiresAmmo === 'true'

    // Optional metric ranges
    const metrics: NonNullable<SearchCriteria['metrics']> = {}
    if (typeof req.query.minWeight === 'string' || typeof req.query.maxWeight === 'string')
      metrics.weight = [parseFloat(req.query.minWeight as string) || 0, parseFloat(req.query.maxWeight as string) || Number.MAX_SAFE_INTEGER]
    if (typeof req.query.minCrits === 'string' || typeof req.query.maxCrits === 'string')
      metrics.crits = [parseInt(req.query.minCrits as string) || 0, parseInt(req.query.maxCrits as string) || Number.MAX_SAFE_INTEGER]
    if (typeof req.query.minHeat === 'string' || typeof req.query.maxHeat === 'string')
      metrics.heat = [parseInt(req.query.minHeat as string) || -Number.MAX_SAFE_INTEGER, parseInt(req.query.maxHeat as string) || Number.MAX_SAFE_INTEGER]
    if (typeof req.query.minDamage === 'string' || typeof req.query.maxDamage === 'string')
      metrics.damage = [parseInt(req.query.minDamage as string) || 0, parseInt(req.query.maxDamage as string) || Number.MAX_SAFE_INTEGER]
    if (Object.keys(metrics).length) criteria.metrics = metrics

    const result = await CatalogGateway.search(criteria)
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Catalog API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ message: 'Catalog API error', error: message })
  }
}
