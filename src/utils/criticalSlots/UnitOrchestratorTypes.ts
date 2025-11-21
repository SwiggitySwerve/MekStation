/**
 * Unit Orchestrator Type System
 * 
 * Comprehensive type definitions for the Unit Orchestrator architecture
 * Created as part of UnitCriticalManager refactoring
 * 
 * @patterns Factory, Strategy, Observer, Command, Facade
 */

import { CriticalSection, LocationSlotConfiguration } from './CriticalSection'
import { EquipmentObject, EquipmentAllocation } from './CriticalSlot'
import { EngineType, GyroType, SystemComponentRules } from './SystemComponentRules'
import { TechBase, ComponentConfiguration } from '../../types/componentConfiguration'

// ===== CORE ORCHESTRATOR TYPES =====

/**
 * Unit Configuration Interface
 */
export interface UnitConfiguration {
  tonnage: number
  engineType: EngineType
  engineRating: number
  gyroType: GyroType
  structureType: ComponentConfiguration
  armorType: ComponentConfiguration
  heatSinkType: ComponentConfiguration
  techBase: TechBase
  [key: string]: any
}

/**
 * Armor Allocation Interface
 */
export interface ArmorAllocation {
  [location: string]: { front: number; rear: number }
}

/**
 * Unit State Interface
 */
export interface UnitState {
  configuration: UnitConfiguration
  sections: Map<string, CriticalSection>
  unallocatedEquipment: EquipmentAllocation[]
  systemAllocations: SystemAllocation
  lastModified: number
}

/**
 * System Allocation Interface
 */
export interface SystemAllocation {
  engine: EngineAllocation
  gyro: GyroAllocation
  cockpit: CockpitAllocation
  lifeSupportSensors: LifeSupportSensorsAllocation
}

/**
 * Engine Allocation Interface
 */
export interface EngineAllocation {
  centerTorso: number[]
  leftTorso: number[]
  rightTorso: number[]
  totalSlots: number
}

/**
 * Gyro Allocation Interface
 */
export interface GyroAllocation {
  centerTorso: number[]
  totalSlots: number
}

/**
 * Cockpit Allocation Interface
 */
export interface CockpitAllocation {
  head: number[]
  totalSlots: number
}

/**
 * Life Support and Sensors Allocation Interface
 */
export interface LifeSupportSensorsAllocation {
  head: number[]
  totalSlots: number
}

// ===== ORCHESTRATOR CONFIGURATION =====

/**
 * Orchestrator Configuration Interface
 */
export interface OrchestratorConfig {
  enableAutoValidation?: boolean
  enablePerformanceMonitoring?: boolean
  enableStateChangeNotifications?: boolean
  enableCaching?: boolean
  validationThrottleMs?: number
  performanceThresholdMs?: number
  cacheTtlMs?: number
  maxCacheSize?: number
}

/**
 * Orchestrator Strategy Interface
 */
export interface OrchestratorStrategy {
  name: string
  description: string
  priority: number
  canHandle(context: OrchestratorContext): boolean
  execute(context: OrchestratorContext): Promise<OrchestratorResult>
}

/**
 * Orchestrator Context Interface
 */
export interface OrchestratorContext {
  operation: string
  configuration: UnitConfiguration
  currentState: UnitState
  parameters: Record<string, any>
  metadata: Record<string, any>
}

/**
 * Orchestrator Result Interface
 */
export interface OrchestratorResult {
  success: boolean
  data?: any
  error?: string
  warnings?: string[]
  metadata?: Record<string, any>
  performanceMetrics?: PerformanceMetrics
}

// ===== PERFORMANCE MONITORING =====

/**
 * Performance Metrics Interface
 */
export interface PerformanceMetrics {
  operationName: string
  startTime: number
  endTime: number
  duration: number
  memoryUsage?: number
  cpuUsage?: number
  cacheHits?: number
  cacheMisses?: number
}

/**
 * Performance Monitor Interface
 */
export interface PerformanceMonitor {
  startOperation(operationName: string): string
  endOperation(operationId: string): PerformanceMetrics
  getMetrics(): PerformanceMetrics[]
  getAverageMetrics(): PerformanceMetrics
  clearMetrics(): void
}

/**
 * Performance Statistics Interface
 */
export interface PerformanceStatistics {
  totalOperations: number
  averageDuration: number
  slowestOperation: PerformanceMetrics | null
  fastestOperation: PerformanceMetrics | null
  recentOperations: PerformanceMetrics[]
  memoryPeak: number
}

// ===== OBSERVER PATTERN =====

/**
 * State Change Event Interface
 */
export interface StateChangeEvent {
  eventType: StateChangeType
  timestamp: number
  previousState: UnitState
  newState: UnitState
  changedFields: string[]
  metadata?: Record<string, any>
}

/**
 * State Change Type Enum
 */
export enum StateChangeType {
  CONFIGURATION_UPDATED = 'configuration_updated',
  EQUIPMENT_ALLOCATED = 'equipment_allocated',
  EQUIPMENT_DEALLOCATED = 'equipment_deallocated',
  SYSTEM_UPDATED = 'system_updated',
  VALIDATION_COMPLETED = 'validation_completed',
  WEIGHT_ANALYSIS_COMPLETED = 'weight_analysis_completed'
}

/**
 * State Change Listener Interface
 */
export interface StateChangeListener {
  onStateChange(event: StateChangeEvent): void
  canHandle(eventType: StateChangeType): boolean
  priority: number
}

/**
 * State Change Notifier Interface
 */
export interface StateChangeNotifier {
  subscribe(listener: StateChangeListener): () => void
  unsubscribe(listener: StateChangeListener): void
  notify(event: StateChangeEvent): void
  clear(): void
}

// ===== COMMAND PATTERN =====

/**
 * Orchestrator Command Interface
 */
export interface OrchestratorCommand {
  name: string
  description: string
  execute(context: OrchestratorContext): Promise<OrchestratorResult>
  undo?(context: OrchestratorContext): Promise<OrchestratorResult>
  canExecute(context: OrchestratorContext): boolean
  validate(context: OrchestratorContext): ValidationResult
}

/**
 * Command Registry Interface
 */
export interface CommandRegistry {
  register(command: OrchestratorCommand): void
  unregister(commandName: string): void
  get(commandName: string): OrchestratorCommand | null
  getAll(): OrchestratorCommand[]
  clear(): void
}

/**
 * Command History Interface
 */
export interface CommandHistory {
  execute(command: OrchestratorCommand, context: OrchestratorContext): Promise<OrchestratorResult>
  undo(): Promise<OrchestratorResult>
  redo(): Promise<OrchestratorResult>
  clear(): void
  getHistory(): CommandHistoryEntry[]
  canUndo(): boolean
  canRedo(): boolean
}

/**
 * Command History Entry Interface
 */
export interface CommandHistoryEntry {
  command: OrchestratorCommand
  context: OrchestratorContext
  result: OrchestratorResult
  timestamp: number
  undoContext?: OrchestratorContext
}

// ===== VALIDATION SYSTEM =====

/**
 * Unit Validation Result Interface
 */
export interface UnitValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  sectionResults: SectionValidationResult[]
  overallScore: number
  metadata?: Record<string, any>
}

/**
 * Validation Error Interface
 */
export interface ValidationError {
  code: string
  message: string
  severity: 'error' | 'warning' | 'info'
  location?: string
  field?: string
  suggestedFix?: string
}

/**
 * Validation Warning Interface
 */
export interface ValidationWarning {
  code: string
  message: string
  location?: string
  field?: string
  recommendation?: string
}

/**
 * Section Validation Result Interface
 */
export interface SectionValidationResult {
  location: string
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  slotsUsed: number
  slotsAvailable: number
  weight: number
}

/**
 * Validation Result Interface
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  details?: Record<string, any>
}

// ===== WEIGHT ANALYSIS =====

/**
 * Weight Analysis Interface
 */
export interface WeightAnalysis {
  totalWeight: number
  maximumWeight: number
  remainingTonnage: number
  isOverweight: boolean
  overweight: number
  weightBreakdown: WeightBreakdown
  warnings: string[]
  recommendations: string[]
}

/**
 * Weight Breakdown Interface
 */
export interface WeightBreakdown {
  structure: number
  engine: number
  gyro: number
  cockpit: number
  armor: number
  heatSinks: number
  equipment: number
  weapons: number
  ammunition: number
  special: number
}

// ===== ALLOCATION SYSTEM =====

/**
 * Allocation Result Interface
 */
export interface AllocationResult {
  success: boolean
  allocated: EquipmentAllocation[]
  failed: EquipmentAllocation[]
  warnings: string[]
  recommendations: string[]
  metadata?: Record<string, any>
}

/**
 * Allocation Strategy Interface
 */
export interface AllocationStrategy {
  name: string
  description: string
  priority: number
  canAllocate(equipment: EquipmentObject, context: AllocationContext): boolean
  allocate(equipment: EquipmentObject, context: AllocationContext): AllocationResult
}

/**
 * Allocation Context Interface
 */
export interface AllocationContext {
  configuration: UnitConfiguration
  sections: Map<string, CriticalSection>
  unallocatedEquipment: EquipmentAllocation[]
  preferences: AllocationPreferences
}

/**
 * Allocation Preferences Interface
 */
export interface AllocationPreferences {
  preferredLocations: string[]
  avoidLocations: string[]
  groupSimilarEquipment: boolean
  minimizeSlotFragmentation: boolean
  optimizeForBalance: boolean
}

// ===== CACHE SYSTEM =====

/**
 * Cache Entry Interface
 */
export interface CacheEntry<T> {
  key: string
  value: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
}

/**
 * Cache Interface
 */
export interface Cache<T> {
  get(key: string): T | null
  set(key: string, value: T, ttl?: number): void
  delete(key: string): boolean
  clear(): void
  size(): number
  keys(): string[]
  values(): T[]
  entries(): CacheEntry<T>[]
  isExpired(key: string): boolean
}

// ===== FACTORY PATTERN =====

/**
 * Orchestrator Factory Interface
 */
export interface OrchestratorFactory {
  createOrchestrator(config: OrchestratorConfig): UnitOrchestrator
  createPerformanceMonitor(): PerformanceMonitor
  createStateNotifier(): StateChangeNotifier
  createCommandRegistry(): CommandRegistry
  createCommandHistory(): CommandHistory
  createCache<T>(): Cache<T>
}

/**
 * Unit Orchestrator Interface
 */
export interface UnitOrchestrator {
  // Configuration Management
  updateConfiguration(newConfiguration: UnitConfiguration): Promise<OrchestratorResult>
  getConfiguration(): UnitConfiguration
  
  // Equipment Management
  allocateEquipment(equipmentGroupId: string, location: string, startSlot: number): Promise<OrchestratorResult>
  deallocateEquipment(equipmentGroupId: string): Promise<OrchestratorResult>
  autoAllocateEquipment(): Promise<AllocationResult>
  
  // Analysis and Validation
  getWeightAnalysis(): Promise<WeightAnalysis>
  validateUnit(): Promise<UnitValidationResult>
  getComplianceReport(): Promise<ComplianceReport>
  
  // State Management
  serializeState(): Promise<OrchestratorResult>
  deserializeState(state: any): Promise<OrchestratorResult>
  
  // Monitoring and Observability
  getPerformanceMetrics(): PerformanceStatistics
  subscribe(listener: StateChangeListener): () => void
  
  // Lifecycle
  initialize(): Promise<void>
  dispose(): Promise<void>
}

// ===== COMPLIANCE REPORTING =====

/**
 * Compliance Report Interface
 */
export interface ComplianceReport {
  overallCompliance: number
  ruleCompliance: RuleCompliance[]
  violations: ComplianceViolation[]
  recommendations: ComplianceRecommendation[]
  summary: ComplianceSummary
}

/**
 * Rule Compliance Interface
 */
export interface RuleCompliance {
  ruleId: string
  ruleName: string
  description: string
  isCompliant: boolean
  severity: 'critical' | 'major' | 'minor'
  score: number
}

/**
 * Compliance Violation Interface
 */
export interface ComplianceViolation {
  ruleId: string
  violationType: string
  description: string
  location?: string
  severity: 'critical' | 'major' | 'minor'
  suggestedFix?: string
}

/**
 * Compliance Recommendation Interface
 */
export interface ComplianceRecommendation {
  type: string
  description: string
  priority: number
  estimatedImpact: string
  implementationSteps: string[]
}

/**
 * Compliance Summary Interface
 */
export interface ComplianceSummary {
  totalRules: number
  compliantRules: number
  nonCompliantRules: number
  criticalViolations: number
  majorViolations: number
  minorViolations: number
  overallScore: number
  grade: string
}

// ===== SECTION MANAGEMENT =====

/**
 * Section Manager Interface
 */
export interface SectionManager {
  initializeSections(configurations: LocationSlotConfiguration[]): void
  getSection(location: string): CriticalSection | null
  getAllSections(): CriticalSection[]
  getSectionSummary(location: string): SectionSummary | null
  getTotalSlots(): number
  getUsedSlots(): number
  getAvailableSlots(): number
}

/**
 * Section Summary Interface
 */
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

// ===== UTILITY TYPES =====

/**
 * Constructor Dependencies for Dependency Injection
 */
export interface UnitOrchestratorDependencies {
  stateManager?: any
  systemComponentService?: any
  weightBalanceService?: any
  equipmentAllocationService?: any
  constructionRulesValidator?: any
  performanceMonitor?: PerformanceMonitor
  stateNotifier?: StateChangeNotifier
  commandRegistry?: CommandRegistry
  commandHistory?: CommandHistory
  cache?: Cache<any>
}

/**
 * Orchestrator Events
 */
export enum OrchestratorEvent {
  INITIALIZED = 'initialized',
  CONFIGURATION_CHANGED = 'configuration_changed',
  EQUIPMENT_ALLOCATED = 'equipment_allocated',
  EQUIPMENT_DEALLOCATED = 'equipment_deallocated',
  VALIDATION_COMPLETED = 'validation_completed',
  WEIGHT_ANALYSIS_COMPLETED = 'weight_analysis_completed',
  ERROR_OCCURRED = 'error_occurred',
  DISPOSED = 'disposed'
}

/**
 * Operation Mode for different orchestration strategies
 */
export enum OperationMode {
  STANDARD = 'standard',
  COMPETITIVE = 'competitive',
  CASUAL = 'casual',
  TOURNAMENT = 'tournament',
  CUSTOM = 'custom'
}

/**
 * Orchestrator Status
 */
export enum OrchestratorStatus {
  INITIALIZING = 'initializing',
  READY = 'ready',
  PROCESSING = 'processing',
  ERROR = 'error',
  DISPOSED = 'disposed'
}

/**
 * Type guards for runtime type checking
 */
export const isUnitConfiguration = (obj: any): obj is UnitConfiguration => {
  return obj && typeof obj.tonnage === 'number' && typeof obj.engineRating === 'number'
}

export const isOrchestratorResult = (obj: any): obj is OrchestratorResult => {
  return obj && typeof obj.success === 'boolean'
}

export const isValidationResult = (obj: any): obj is ValidationResult => {
  return obj && typeof obj.isValid === 'boolean' && Array.isArray(obj.errors)
}

export const isWeightAnalysis = (obj: any): obj is WeightAnalysis => {
  return obj && typeof obj.totalWeight === 'number' && typeof obj.maximumWeight === 'number'
}

/**
 * Default configurations
 */
export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  enableAutoValidation: true,
  enablePerformanceMonitoring: true,
  enableStateChangeNotifications: true,
  enableCaching: true,
  validationThrottleMs: 100,
  performanceThresholdMs: 50,
  cacheTtlMs: 300000, // 5 minutes
  maxCacheSize: 1000
}

export const DEFAULT_ALLOCATION_PREFERENCES: AllocationPreferences = {
  preferredLocations: [],
  avoidLocations: [],
  groupSimilarEquipment: true,
  minimizeSlotFragmentation: true,
  optimizeForBalance: true
}