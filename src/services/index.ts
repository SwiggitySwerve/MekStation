/**
 * Service Layer Registry
 *
 * Central access point for all application services.
 * Services are instantiated as singletons.
 *
 * @spec openspec/specs/unit-services/spec.md
 * @spec openspec/specs/equipment-services/spec.md
 * @spec openspec/specs/construction-services/spec.md
 * @spec openspec/specs/persistence-services/spec.md
 */

// Re-export common types and errors
export * from './common';

// Re-export persistence services
export * from './persistence';

// Re-export equipment services
export * from './equipment';

// Re-export unit services
export * from './units';

// Re-export construction services
export * from './construction';

// Re-export conversion services
export * from './conversion';

// Re-export asset services
export * from './assets';

// Re-export pilot services
export * from './pilots';

// Re-export game resolution services
export * from './game-resolution';

export {
  initializeServices,
  services,
  shutdownServices,
} from './serviceRegistry';
