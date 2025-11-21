/**
 * Unit Orchestrator Facade
 * 
 * Clean, simple interface for the Unit Orchestrator system
 * Hides the complexity of the underlying orchestration architecture
 * 
 * @patterns Facade, Factory, Strategy, Observer
 */

import { CriticalSection, LocationSlotConfiguration } from './CriticalSection'
import { EquipmentAllocation } from './CriticalSlot'
import { 
  UnitOrchestrator,
  UnitConfiguration,
  OrchestratorResult,
  WeightAnalysis,
  UnitValidationResult,
  ComplianceReport,
  AllocationResult,
  PerformanceStatistics,
  StateChangeListener,
  StateChangeEvent,
  StateChangeType,
  OrchestratorConfig,
  UnitOrchestratorDependencies,
  DEFAULT_ORCHESTRATOR_CONFIG
} from './UnitOrchestratorTypes'

/**
 * Main Facade Interface for Unit Orchestrator
 */
export interface UnitOrchestratorFacade {
  // ===== LIFECYCLE METHODS =====
  initialize(): Promise<void>
  dispose(): Promise<void>
  isReady(): boolean
  
  // ===== CONFIGURATION MANAGEMENT =====
  updateConfiguration(newConfiguration: UnitConfiguration): Promise<boolean>
  getConfiguration(): UnitConfiguration
  resetConfiguration(): Promise<void>
  
  // ===== EQUIPMENT MANAGEMENT =====
  allocateEquipment(equipmentGroupId: string, location: string, startSlot: number): Promise<boolean>
  deallocateEquipment(equipmentGroupId: string): Promise<boolean>
  autoAllocateAllEquipment(): Promise<AllocationResult>
  moveEquipment(equipmentGroupId: string, newLocation: string, newSlot: number): Promise<boolean>
  
  // ===== CRITICAL SECTIONS =====
  getSection(location: string): CriticalSection | null
  getAllSections(): CriticalSection[]
  getSectionSummary(location: string): SectionSummary | null
  
  // ===== ANALYSIS AND VALIDATION =====
  getWeightAnalysis(): Promise<WeightAnalysis>
  validateUnit(): Promise<UnitValidationResult>
  getComplianceReport(): Promise<ComplianceReport>
  
  // ===== STATE MANAGEMENT =====
  save(): Promise<string>
  load(serializedState: string): Promise<boolean>
  export(format: 'json' | 'xml' | 'yaml'): Promise<string>
  import(data: string, format: 'json' | 'xml' | 'yaml'): Promise<boolean>
  
  // ===== MONITORING AND OBSERVABILITY =====
  getPerformanceMetrics(): PerformanceStatistics
  subscribe(listener: StateChangeListener): () => void
  subscribeToEvents(eventTypes: StateChangeType[], callback: (event: StateChangeEvent) => void): () => void
  
  // ===== UTILITY METHODS =====
  getSummary(): UnitSummary
  getValidationSummary(): ValidationSummary
  getCriticalSlotUtilization(): CriticalSlotUtilization
  
  // ===== LEGACY COMPATIBILITY =====
  getRemainingTonnage(): number
  getUsedTonnage(): number
  getTotalCriticalSlots(): number
  getUsedCriticalSlots(): number
  getRemainingCriticalSlots(): number
}

/**
 * Concrete Facade Implementation
 */
export class UnitOrchestratorFacadeImpl implements UnitOrchestratorFacade {
  private orchestrator: UnitOrchestrator | null = null
  private isInitialized = false
  private config: OrchestratorConfig
  private dependencies: UnitOrchestratorDependencies
  private eventListeners: Map<string, () => void> = new Map()
  
  constructor(
    config: OrchestratorConfig = DEFAULT_ORCHESTRATOR_CONFIG,
    dependencies: UnitOrchestratorDependencies = {}
  ) {
    this.config = config
    this.dependencies = dependencies
  }

  // ===== LIFECYCLE METHODS =====

  /**
   * Initialize the orchestrator
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }
    
    try {
      // Create orchestrator instance (would be injected by factory)
      this.orchestrator = await this.createOrchestrator()
      
      // Initialize the orchestrator
      await this.orchestrator.initialize()
      
      this.isInitialized = true
      
    } catch (error) {
      console.error('[UnitOrchestratorFacade] Failed to initialize:', error)
      throw error
    }
  }

  /**
   * Dispose of the orchestrator
   */
  async dispose(): Promise<void> {
    if (!this.isInitialized || !this.orchestrator) {
      return
    }
    
    try {
      // Clear event listeners
      this.eventListeners.forEach(unsubscribe => unsubscribe())
      this.eventListeners.clear()
      
      // Dispose orchestrator
      await this.orchestrator.dispose()
      
      this.orchestrator = null
      this.isInitialized = false
      
    } catch (error) {
      console.error('[UnitOrchestratorFacade] Failed to dispose:', error)
      throw error
    }
  }

  /**
   * Check if orchestrator is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.orchestrator !== null
  }

  // ===== CONFIGURATION MANAGEMENT =====

  /**
   * Update unit configuration
   */
  async updateConfiguration(newConfiguration: UnitConfiguration): Promise<boolean> {
    this.ensureInitialized()
    
    try {
      const result = await this.orchestrator!.updateConfiguration(newConfiguration)
      return result.success
    } catch (error) {
      console.error('[UnitOrchestratorFacade] Failed to update configuration:', error)
      return false
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): UnitConfiguration {
    this.ensureInitialized()
    return this.orchestrator!.getConfiguration()
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfiguration(): Promise<void> {
    this.ensureInitialized()
    
    const defaultConfig: UnitConfiguration = {
      tonnage: 20,
      engineType: 'Standard',
      engineRating: 60,
      gyroType: 'Standard',
      structureType: { type: 'Standard', techBase: 'Inner Sphere' },
      armorType: { type: 'Standard', techBase: 'Inner Sphere' },
      heatSinkType: { type: 'Standard', techBase: 'Inner Sphere' },
      techBase: 'Inner Sphere'
    }
    
    await this.updateConfiguration(defaultConfig)
  }

  // ===== EQUIPMENT MANAGEMENT =====

  /**
   * Allocate equipment to specific location and slot
   */
  async allocateEquipment(equipmentGroupId: string, location: string, startSlot: number): Promise<boolean> {
    this.ensureInitialized()
    
    try {
      const result = await this.orchestrator!.allocateEquipment(equipmentGroupId, location, startSlot)
      return result.success
    } catch (error) {
      console.error('[UnitOrchestratorFacade] Failed to allocate equipment:', error)
      return false
    }
  }

  /**
   * Deallocate equipment
   */
  async deallocateEquipment(equipmentGroupId: string): Promise<boolean> {
    this.ensureInitialized()
    
    try {
      const result = await this.orchestrator!.deallocateEquipment(equipmentGroupId)
      return result.success
    } catch (error) {
      console.error('[UnitOrchestratorFacade] Failed to deallocate equipment:', error)
      return false
    }
  }

  /**
   * Auto-allocate all equipment
   */
  async autoAllocateAllEquipment(): Promise<AllocationResult> {
    this.ensureInitialized()
    
    try {
      return await this.orchestrator!.autoAllocateEquipment()
    } catch (error) {
      console.error('[UnitOrchestratorFacade] Failed to auto-allocate equipment:', error)
             return {
         success: false,
         allocated: [],
         failed: [],
         warnings: [`Failed to auto-allocate: ${error instanceof Error ? error.message : 'Unknown error'}`],
         recommendations: []
       }
    }
  }

  /**
   * Move equipment to new location
   */
  async moveEquipment(equipmentGroupId: string, newLocation: string, newSlot: number): Promise<boolean> {
    // This is a convenience method that combines deallocate and allocate
    const deallocated = await this.deallocateEquipment(equipmentGroupId)
    if (!deallocated) {
      return false
    }
    
    return await this.allocateEquipment(equipmentGroupId, newLocation, newSlot)
  }

  // ===== CRITICAL SECTIONS =====

  /**
   * Get section by location
   */
  getSection(location: string): CriticalSection | null {
    this.ensureInitialized()
    // This would delegate to the orchestrator's section manager
    return null // Placeholder
  }

  /**
   * Get all sections
   */
  getAllSections(): CriticalSection[] {
    this.ensureInitialized()
    // This would delegate to the orchestrator's section manager
    return [] // Placeholder
  }

  /**
   * Get section summary
   */
  getSectionSummary(location: string): SectionSummary | null {
    this.ensureInitialized()
    
    const section = this.getSection(location)
    if (!section) {
      return null
    }
    
    return {
      location,
      totalSlots: section.getTotalSlots(),
      usedSlots: section.getAllEquipment().length,
      availableSlots: section.getAvailableSlots().length,
      equipment: section.getAllEquipment(),
      systemComponents: [], // Would be calculated from section data
      weight: 0, // Would be calculated from equipment weights
      isValid: section.validate().isValid
    }
  }

  // ===== ANALYSIS AND VALIDATION =====

  /**
   * Get weight analysis
   */
  async getWeightAnalysis(): Promise<WeightAnalysis> {
    this.ensureInitialized()
    return await this.orchestrator!.getWeightAnalysis()
  }

  /**
   * Validate unit
   */
  async validateUnit(): Promise<UnitValidationResult> {
    this.ensureInitialized()
    return await this.orchestrator!.validateUnit()
  }

  /**
   * Get compliance report
   */
  async getComplianceReport(): Promise<ComplianceReport> {
    this.ensureInitialized()
    return await this.orchestrator!.getComplianceReport()
  }

  // ===== STATE MANAGEMENT =====

  /**
   * Save unit state
   */
  async save(): Promise<string> {
    this.ensureInitialized()
    
    try {
      const result = await this.orchestrator!.serializeState()
      return result.success ? JSON.stringify(result.data) : ''
    } catch (error) {
      console.error('[UnitOrchestratorFacade] Failed to save:', error)
      return ''
    }
  }

  /**
   * Load unit state
   */
  async load(serializedState: string): Promise<boolean> {
    this.ensureInitialized()
    
    try {
      const state = JSON.parse(serializedState)
      const result = await this.orchestrator!.deserializeState(state)
      return result.success
    } catch (error) {
      console.error('[UnitOrchestratorFacade] Failed to load:', error)
      return false
    }
  }

  /**
   * Export unit in specified format
   */
  async export(format: 'json' | 'xml' | 'yaml'): Promise<string> {
    this.ensureInitialized()
    
    const state = await this.save()
    
    switch (format) {
      case 'json':
        return state
      case 'xml':
        return this.convertToXml(JSON.parse(state))
      case 'yaml':
        return this.convertToYaml(JSON.parse(state))
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  /**
   * Import unit from specified format
   */
  async import(data: string, format: 'json' | 'xml' | 'yaml'): Promise<boolean> {
    this.ensureInitialized()
    
    try {
      let state: any
      
      switch (format) {
        case 'json':
          state = JSON.parse(data)
          break
        case 'xml':
          state = this.convertFromXml(data)
          break
        case 'yaml':
          state = this.convertFromYaml(data)
          break
        default:
          throw new Error(`Unsupported import format: ${format}`)
      }
      
      return await this.load(JSON.stringify(state))
    } catch (error) {
      console.error('[UnitOrchestratorFacade] Failed to import:', error)
      return false
    }
  }

  // ===== MONITORING AND OBSERVABILITY =====

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceStatistics {
    this.ensureInitialized()
    return this.orchestrator!.getPerformanceMetrics()
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: StateChangeListener): () => void {
    this.ensureInitialized()
    
    const unsubscribe = this.orchestrator!.subscribe(listener)
    const listenerId = this.generateListenerId()
    this.eventListeners.set(listenerId, unsubscribe)
    
    return () => {
      unsubscribe()
      this.eventListeners.delete(listenerId)
    }
  }

  /**
   * Subscribe to specific event types
   */
  subscribeToEvents(eventTypes: StateChangeType[], callback: (event: StateChangeEvent) => void): () => void {
    const listener: StateChangeListener = {
      onStateChange: callback,
      canHandle: (eventType: StateChangeType) => eventTypes.includes(eventType),
      priority: 0
    }
    
    return this.subscribe(listener)
  }

  // ===== UTILITY METHODS =====

  /**
   * Get unit summary
   */
  getSummary(): UnitSummary {
    this.ensureInitialized()
    
    const config = this.getConfiguration()
    const sections = this.getAllSections()
    
    return {
      configuration: config,
      totalSections: sections.length,
      totalSlots: this.getTotalCriticalSlots(),
      usedSlots: this.getUsedCriticalSlots(),
      availableSlots: this.getRemainingCriticalSlots(),
      totalWeight: this.getUsedTonnage(),
      remainingWeight: this.getRemainingTonnage(),
      isValid: false, // Would be calculated from validation
      equipmentCount: 0, // Would be calculated from sections
      systemSlots: 0 // Would be calculated from system components
    }
  }

  /**
   * Get validation summary
   */
  getValidationSummary(): ValidationSummary {
    this.ensureInitialized()
    
    return {
      isValid: false,
      errorCount: 0,
      warningCount: 0,
      criticalIssues: [],
      recommendations: []
    }
  }

  /**
   * Get critical slot utilization
   */
  getCriticalSlotUtilization(): CriticalSlotUtilization {
    this.ensureInitialized()
    
    const sections = this.getAllSections()
    const sectionUtilization = sections.map(section => ({
      location: section.getLocation(),
      totalSlots: section.getTotalSlots(),
      usedSlots: section.getAllEquipment().length,
      utilization: (section.getAllEquipment().length / section.getTotalSlots()) * 100
    }))
    
    return {
      overall: {
        totalSlots: this.getTotalCriticalSlots(),
        usedSlots: this.getUsedCriticalSlots(),
        utilization: (this.getUsedCriticalSlots() / this.getTotalCriticalSlots()) * 100
      },
      sections: sectionUtilization
    }
  }

  // ===== LEGACY COMPATIBILITY =====

  /**
   * Get remaining tonnage
   */
  getRemainingTonnage(): number {
    this.ensureInitialized()
    const config = this.getConfiguration()
    return config.tonnage - this.getUsedTonnage()
  }

  /**
   * Get used tonnage
   */
  getUsedTonnage(): number {
    this.ensureInitialized()
    // This would sum up all equipment weights
    return 0 // Placeholder
  }

  /**
   * Get total critical slots
   */
  getTotalCriticalSlots(): number {
    this.ensureInitialized()
    return this.getAllSections().reduce((total, section) => total + section.getTotalSlots(), 0)
  }

  /**
   * Get used critical slots
   */
  getUsedCriticalSlots(): number {
    this.ensureInitialized()
    return this.getAllSections().reduce((total, section) => total + section.getAllEquipment().length, 0)
  }

  /**
   * Get remaining critical slots
   */
  getRemainingCriticalSlots(): number {
    return this.getTotalCriticalSlots() - this.getUsedCriticalSlots()
  }

  // ===== PRIVATE METHODS =====

  /**
   * Ensure orchestrator is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.orchestrator) {
      throw new Error('UnitOrchestratorFacade not initialized. Call initialize() first.')
    }
  }

  /**
   * Create orchestrator instance
   */
  private async createOrchestrator(): Promise<UnitOrchestrator> {
    // This would use a factory to create the orchestrator
    // For now, throw an error as we need the actual implementation
    throw new Error('Orchestrator factory not implemented')
  }

  /**
   * Generate unique listener ID
   */
  private generateListenerId(): string {
    return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Convert object to XML
   */
  private convertToXml(obj: any): string {
    // Simple XML conversion - would use a proper XML library
    return `<unit>${JSON.stringify(obj)}</unit>`
  }

  /**
   * Convert XML to object
   */
  private convertFromXml(xml: string): any {
    // Simple XML parsing - would use a proper XML library
    const match = xml.match(/<unit>(.*)<\/unit>/)
    return match ? JSON.parse(match[1]) : {}
  }

  /**
   * Convert object to YAML
   */
  private convertToYaml(obj: any): string {
    // Simple YAML conversion - would use a proper YAML library
    return `unit: ${JSON.stringify(obj, null, 2)}`
  }

  /**
   * Convert YAML to object
   */
  private convertFromYaml(yaml: string): any {
    // Simple YAML parsing - would use a proper YAML library
    const match = yaml.match(/unit: (.*)/)
    return match ? JSON.parse(match[1]) : {}
  }
}

// ===== SUPPORTING INTERFACES =====

export interface SectionSummary {
  location: string
  totalSlots: number
  usedSlots: number
  availableSlots: number
  equipment: EquipmentAllocation[]
  systemComponents: string[]
  weight: number
  isValid: boolean
}

export interface UnitSummary {
  configuration: UnitConfiguration
  totalSections: number
  totalSlots: number
  usedSlots: number
  availableSlots: number
  totalWeight: number
  remainingWeight: number
  isValid: boolean
  equipmentCount: number
  systemSlots: number
}

export interface ValidationSummary {
  isValid: boolean
  errorCount: number
  warningCount: number
  criticalIssues: string[]
  recommendations: string[]
}

export interface CriticalSlotUtilization {
  overall: {
    totalSlots: number
    usedSlots: number
    utilization: number
  }
  sections: Array<{
    location: string
    totalSlots: number
    usedSlots: number
    utilization: number
  }>
}

/**
 * Factory function for creating facade
 */
export const createUnitOrchestratorFacade = (
  config?: OrchestratorConfig,
  dependencies?: UnitOrchestratorDependencies
): UnitOrchestratorFacade => {
  return new UnitOrchestratorFacadeImpl(config, dependencies)
}

/**
 * Simplified factory for common use cases
 */
export const createSimpleUnitOrchestrator = (): UnitOrchestratorFacade => {
  return createUnitOrchestratorFacade()
}

/**
 * Performance-optimized factory
 */
export const createPerformanceOptimizedUnitOrchestrator = (): UnitOrchestratorFacade => {
  const config: OrchestratorConfig = {
    ...DEFAULT_ORCHESTRATOR_CONFIG,
    enablePerformanceMonitoring: true,
    enableCaching: true,
    performanceThresholdMs: 25,
    cacheTtlMs: 600000 // 10 minutes
  }
  
  return createUnitOrchestratorFacade(config)
}

/**
 * Development-friendly factory with enhanced logging
 */
export const createDevelopmentUnitOrchestrator = (): UnitOrchestratorFacade => {
  const config: OrchestratorConfig = {
    ...DEFAULT_ORCHESTRATOR_CONFIG,
    enablePerformanceMonitoring: true,
    enableStateChangeNotifications: true,
    performanceThresholdMs: 10,
    validationThrottleMs: 0 // No throttling in development
  }
  
  return createUnitOrchestratorFacade(config)
}