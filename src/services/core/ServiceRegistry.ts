/**
 * Service Registry - Dependency Injection Container
 * 
 * Type-safe service registration and resolution system that enables
 * proper SOLID refactoring by implementing dependency inversion.
 * 
 * This registry replaces direct instantiation with interface-based
 * dependency injection, allowing for better testing and modularity.
 */

import { 
  IService, 
  IServiceRegistry, 
  Result, 
  success, 
  failure,
  EntityId 
} from '../../types/core';

/**
 * Service lifecycle management
 */
export enum ServiceLifetime {
  SINGLETON = 'singleton',
  TRANSIENT = 'transient',
  SCOPED = 'scoped'
}

/**
 * Service registration metadata
 */
export interface IServiceRegistration {
  readonly name: string;
  readonly lifetime: ServiceLifetime;
  readonly factory: () => any;
  readonly dependencies: string[];
  readonly version: string;
  readonly description?: string;
}

/**
 * Service resolution context for scoped services
 */
export interface IServiceScope {
  readonly id: EntityId;
  readonly services: Map<string, any>;
  readonly created: Date;
}

/**
 * Service registry implementation with full lifecycle management
 */
export class ServiceRegistry implements IServiceRegistry {
  private registrations = new Map<string, IServiceRegistration>();
  private singletons = new Map<string, any>();
  private scopes = new Map<EntityId, IServiceScope>();
  private initializationOrder: string[] = [];
  private isInitialized = false;

  /**
   * Register a service with the container
   */
  register<T>(
    name: string, 
    factory: () => T, 
    lifetime: ServiceLifetime = ServiceLifetime.SINGLETON,
    dependencies: string[] = [],
    version: string = '1.0.0',
    description?: string
  ): void {
    if (this.registrations.has(name)) {
      console.warn(`Service '${name}' is already registered. Overwriting.`);
    }

    const registration: IServiceRegistration = {
      name,
      lifetime,
      factory,
      dependencies,
      version,
      description
    };

    this.registrations.set(name, registration);
    this.updateInitializationOrder();
  }

  /**
   * Resolve a service from the container
   */
  resolve<T>(name: string, scopeId?: EntityId): T | null {
    const registration = this.registrations.get(name);
    if (!registration) {
      console.error(`Service '${name}' is not registered`);
      return null;
    }

    try {
      switch (registration.lifetime) {
        case ServiceLifetime.SINGLETON:
          return this.resolveSingleton<T>(registration);
        
        case ServiceLifetime.TRANSIENT:
          return this.resolveTransient<T>(registration);
        
        case ServiceLifetime.SCOPED:
          return this.resolveScoped<T>(registration, scopeId);
        
        default:
          throw new Error(`Unknown service lifetime: ${registration.lifetime}`);
      }
    } catch (error) {
      console.error(`Failed to resolve service '${name}':`, error);
      return null;
    }
  }

  /**
   * Check if a service is registered
   */
  isRegistered(name: string): boolean {
    return this.registrations.has(name);
  }

  /**
   * Unregister a service
   */
  unregister(name: string): boolean {
    const removed = this.registrations.delete(name);
    if (removed) {
      this.singletons.delete(name);
      this.updateInitializationOrder();
    }
    return removed;
  }

  /**
   * Get all registered service names
   */
  getRegisteredServices(): string[] {
    return Array.from(this.registrations.keys());
  }

  /**
   * Get service registration metadata
   */
  getServiceInfo(name: string): IServiceRegistration | null {
    return this.registrations.get(name) || null;
  }

  /**
   * Initialize all registered services in dependency order
   */
  async initializeAll(): Promise<Result<void>> {
    if (this.isInitialized) {
      return success(undefined);
    }

    try {
      console.log('🔧 Initializing service registry...');
      
      for (const serviceName of this.initializationOrder) {
        const service = this.resolve<IService>(serviceName);
        if (service && typeof service.initialize === 'function') {
          console.log(`  ⚡ Initializing ${serviceName}...`);
          await service.initialize();
        }
      }

      this.isInitialized = true;
      console.log('✅ Service registry initialization complete');
      
      return success(undefined);
    } catch (error) {
      console.error('❌ Service registry initialization failed:', error);
      return failure(error instanceof Error ? error : new Error('Unknown initialization error'));
    }
  }

  /**
   * Cleanup all services and clear the registry
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up service registry...');

    // Cleanup in reverse initialization order
    const cleanupOrder = [...this.initializationOrder].reverse();
    
    for (const serviceName of cleanupOrder) {
      try {
        const service = this.singletons.get(serviceName) as IService;
        if (service && typeof service.cleanup === 'function') {
          console.log(`  🧹 Cleaning up ${serviceName}...`);
          await service.cleanup();
        }
      } catch (error) {
        console.error(`Failed to cleanup service '${serviceName}':`, error);
      }
    }

    // Clear all scopes
    Array.from(this.scopes.values()).forEach(scope => {
      scope.services.clear();
    });

    this.singletons.clear();
    this.scopes.clear();
    this.isInitialized = false;
    
    console.log('✅ Service registry cleanup complete');
  }

  /**
   * Create a new service scope for scoped services
   */
  createScope(): EntityId {
    const scopeId = `scope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const scope: IServiceScope = {
      id: scopeId,
      services: new Map<string, any>(),
      created: new Date()
    };
    
    this.scopes.set(scopeId, scope);
    return scopeId;
  }

  /**
   * Dispose a service scope and cleanup scoped services
   */
  async disposeScope(scopeId: EntityId): Promise<void> {
    const scope = this.scopes.get(scopeId);
    if (!scope) return;

    // Cleanup scoped services
    Array.from(scope.services.entries()).forEach(async ([serviceName, service]) => {
      try {
        if (service && typeof service.cleanup === 'function') {
          await service.cleanup();
        }
      } catch (error) {
        console.error(`Failed to cleanup scoped service '${serviceName}':`, error);
      }
    });

    scope.services.clear();
    this.scopes.delete(scopeId);
  }

  /**
   * Get service registry statistics
   */
  getStatistics(): {
    totalRegistrations: number;
    singletonCount: number;
    scopeCount: number;
    initializationOrder: string[];
    isInitialized: boolean;
  } {
    return {
      totalRegistrations: this.registrations.size,
      singletonCount: this.singletons.size,
      scopeCount: this.scopes.size,
      initializationOrder: [...this.initializationOrder],
      isInitialized: this.isInitialized
    };
  }

  /**
   * Resolve singleton service
   */
  private resolveSingleton<T>(registration: IServiceRegistration): T {
    let instance = this.singletons.get(registration.name);
    if (!instance) {
      instance = registration.factory();
      this.singletons.set(registration.name, instance);
    }
    return instance;
  }

  /**
   * Resolve transient service (new instance every time)
   */
  private resolveTransient<T>(registration: IServiceRegistration): T {
    return registration.factory();
  }

  /**
   * Resolve scoped service
   */
  private resolveScoped<T>(registration: IServiceRegistration, scopeId?: EntityId): T {
    if (!scopeId) {
      throw new Error(`Scoped service '${registration.name}' requires a scope ID`);
    }

    const scope = this.scopes.get(scopeId);
    if (!scope) {
      throw new Error(`Scope '${scopeId}' not found`);
    }

    let instance = scope.services.get(registration.name);
    if (!instance) {
      instance = registration.factory();
      scope.services.set(registration.name, instance);
    }
    
    return instance;
  }

  /**
   * Update initialization order based on dependencies
   */
  private updateInitializationOrder(): void {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (serviceName: string): void => {
      if (visiting.has(serviceName)) {
        throw new Error(`Circular dependency detected involving service '${serviceName}'`);
      }
      
      if (visited.has(serviceName)) {
        return;
      }

      visiting.add(serviceName);
      
      const registration = this.registrations.get(serviceName);
      if (registration) {
        for (const dependency of registration.dependencies) {
          if (this.registrations.has(dependency)) {
            visit(dependency);
          }
        }
      }
      
      visiting.delete(serviceName);
      visited.add(serviceName);
      order.push(serviceName);
    };

    Array.from(this.registrations.keys()).forEach(serviceName => {
      visit(serviceName);
    });

    this.initializationOrder = order;
  }
}

/**
 * Global service registry instance
 */
export const serviceRegistry = new ServiceRegistry();

/**
 * Service registration decorators for easier registration
 */
export function Service(
  name: string, 
  lifetime: ServiceLifetime = ServiceLifetime.SINGLETON,
  dependencies: string[] = []
) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    serviceRegistry.register(
      name,
      () => new constructor(),
      lifetime,
      dependencies,
      '1.0.0',
      `Auto-registered service: ${constructor.name}`
    );
    return constructor;
  };
}

/**
 * Dependency injection helper for getting services
 */
export function inject<T>(serviceName: string, scopeId?: EntityId): T {
  const service = serviceRegistry.resolve<T>(serviceName, scopeId);
  if (!service) {
    throw new Error(`Unable to inject service '${serviceName}'. Make sure it's registered.`);
  }
  return service;
}

/**
 * Service factory helper for creating services with dependencies
 */
export function createServiceFactory<T>(
  factory: (...dependencies: any[]) => T,
  dependencyNames: string[]
): () => T {
  return () => {
    const dependencies = dependencyNames.map(name => inject(name));
    return factory(...dependencies);
  };
}

/**
 * Helper to register multiple services at once
 */
export function registerServices(services: Array<{
  name: string;
  factory: () => any;
  lifetime?: ServiceLifetime;
  dependencies?: string[];
  version?: string;
  description?: string;
}>): void {
  for (const service of services) {
    serviceRegistry.register(
      service.name,
      service.factory,
      service.lifetime || ServiceLifetime.SINGLETON,
      service.dependencies || [],
      service.version || '1.0.0',
      service.description
    );
  }
}

/**
 * Development helper to validate service registrations
 */
export function validateServiceRegistrations(): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const registrations = serviceRegistry.getRegisteredServices();

  for (const serviceName of registrations) {
    const info = serviceRegistry.getServiceInfo(serviceName);
    if (!info) continue;

    // Check dependencies exist
    for (const dependency of info.dependencies) {
      if (!serviceRegistry.isRegistered(dependency)) {
        issues.push(`Service '${serviceName}' depends on unregistered service '${dependency}'`);
      }
    }

    // Try to resolve (dry run)
    try {
      const service = serviceRegistry.resolve(serviceName);
      if (!service) {
        issues.push(`Service '${serviceName}' factory returns null/undefined`);
      }
    } catch (error) {
      issues.push(`Service '${serviceName}' factory throws error: ${error}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}




