import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CatalogGateway } from '../../services/catalog/CatalogGateway'
import { CatalogItem, EquipmentCategory, ComponentCategory, PaginatedResult, SearchCriteria, TechContext } from '../../services/catalog/types'

export interface UseCatalogBrowserOptions {
  initialPageSize?: number
  debounceMs?: number
  initialContext?: Partial<TechContext>
}

export interface CatalogFilters {
  text: string
  categories: EquipmentCategory[]
  componentCategories: ComponentCategory[]
  requiresAmmo?: boolean
  rulesLevel?: 'Introductory' | 'Standard' | 'Advanced' | 'Experimental'
  eraRange?: [number, number]
  metrics?: {
    weight?: [number, number]
    crits?: [number, number]
    heat?: [number, number]
    damage?: [number, number]
  }
  sortBy?: SearchCriteria['sortBy']
  sortOrder?: SearchCriteria['sortOrder']
}

const DEFAULT_FILTERS: CatalogFilters = {
  text: '',
  categories: [],
  componentCategories: [],
  sortBy: 'name',
  sortOrder: 'ASC'
}

export interface UseCatalogBrowserResult {
  items: CatalogItem[]
  totalCount: number
  totalPages: number
  currentPage: number
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean

  filters: CatalogFilters
  setFilters: (partial: Partial<CatalogFilters>) => void
  clearFilters: () => void

  isLoading: boolean
  error: string | null

  setPage: (page: number) => void
  setPageSize: (size: number) => void
  refresh: () => void

  setContext: (ctx: Partial<TechContext>) => Promise<void>
}

export function useCatalogBrowser(options: UseCatalogBrowserOptions = {}): UseCatalogBrowserResult {
  const { initialPageSize = 25, debounceMs = 250, initialContext } = options

  const [filters, setFiltersState] = useState<CatalogFilters>(DEFAULT_FILTERS)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [result, setResult] = useState<PaginatedResult<CatalogItem> | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const lastFilters = useRef<CatalogFilters>(DEFAULT_FILTERS)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const criteria: SearchCriteria = {
        text: filters.text,
        categories: filters.categories.length ? filters.categories : undefined,
        componentCategories: filters.componentCategories.length ? filters.componentCategories : undefined,
        requiresAmmo: typeof filters.requiresAmmo === 'boolean' ? filters.requiresAmmo : undefined,
        rulesLevel: filters.rulesLevel,
        eraRange: filters.eraRange,
        metrics: filters.metrics,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page: currentPage,
        pageSize
      }
      const res = await CatalogGateway.search(criteria)
      setResult(res)
    } catch (e: any) {
      setError(e?.message || 'Failed to load catalog')
    } finally {
      setIsLoading(false)
    }
  }, [filters, currentPage, pageSize])

  const debouncedReload = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      if (JSON.stringify(filters) !== JSON.stringify(lastFilters.current)) {
        setCurrentPage(1)
        lastFilters.current = filters
      }
      void load()
    }, debounceMs)
  }, [filters, load, debounceMs])

  useEffect(() => {
    if (initialContext) void CatalogGateway.setContext(initialContext)
    // initial load
    void load()
  }, [])

  useEffect(() => {
    debouncedReload()
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [debouncedReload])

  useEffect(() => {
    if (result) void load()
  }, [currentPage, pageSize])

  const setFilters = useCallback((partial: Partial<CatalogFilters>) => {
    setFiltersState(prev => ({ ...prev, ...partial }))
  }, [])

  const clearFilters = useCallback(() => setFiltersState(DEFAULT_FILTERS), [])

  const setPage = useCallback((page: number) => {
    if (result && page >= 1 && page <= result.totalPages && page !== currentPage) {
      setCurrentPage(page)
    }
  }, [result, currentPage])

  const setPageSizeSafe = useCallback((size: number) => {
    if (size > 0 && size !== pageSize) {
      setPageSize(size)
      setCurrentPage(1)
    }
  }, [pageSize])

  const refresh = useCallback(() => { void load() }, [load])

  const setContext = useCallback(async (ctx: Partial<TechContext>) => {
    await CatalogGateway.setContext(ctx)
    await load()
  }, [load])

  return {
    items: result?.items || [],
    totalCount: result?.totalCount || 0,
    totalPages: result?.totalPages || 0,
    currentPage,
    pageSize,
    hasNextPage: !!result?.hasNextPage,
    hasPreviousPage: !!result?.hasPreviousPage,

    filters,
    setFilters,
    clearFilters,

    isLoading,
    error,

    setPage,
    setPageSize: setPageSizeSafe,
    refresh,

    setContext
  }
}