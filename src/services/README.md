# Services Layer

This directory contains the service layer for MekStation, providing business logic, data access, and domain operations.

## Architecture

Services are organized by domain:

- **`core/`** - Shared utilities and interfaces (singleton factory, repository interface)
- **`vault/`** - Vault sharing, permissions, contacts, versioning
- **`units/`** - Unit management, factory, type registry
- **`equipment/`** - Equipment catalog, loading, name mapping
- **`pilots/`** - Pilot management and progression
- **`validation/`** - Unit construction validation rules
- **`conversion/`** - MTF/BLK import/export
- **`construction/`** - Unit building and customization
- **`persistence/`** - SQLite database access

## Service Patterns

### Singleton Management

**Problem**: Repetitive boilerplate for singleton patterns across 40+ services.

**Solution**: `createSingleton<T>` factory function provides lazy initialization, reset capability, and optional cleanup.

**Usage**:

```typescript
import {
  createSingleton,
  type SingletonFactory,
} from '@/services/core/createSingleton';

// Create factory
const serviceFactory: SingletonFactory<MyService> = createSingleton(
  (): MyService => new MyService(),
);

// Export getter
export function getMyService(): MyService {
  return serviceFactory.get();
}

// Export reset for testing
export function resetMyService(): void {
  serviceFactory.reset();
}
```

**With cleanup callback**:

```typescript
const serviceFactory = createSingleton(
  (): MyService => new MyService(),
  (instance) => instance.cleanup(), // Called on reset
);
```

**Migrated Services** (10 services):

- VaultService, PermissionService, ContactService, OfflineQueueService, VersionHistoryService
- EquipmentRegistry, EquipmentLoaderService, EquipmentNameMapper
- UnitFactoryService, UnitTypeRegistry

**Benefits**:

- ✅ 55% code reduction in singleton patterns
- ✅ Consistent API across all services
- ✅ Built-in test isolation via reset()
- ✅ Optional cleanup callback support

### Repository Interface

**Problem**: No standard contract for CRUD repositories, leading to inconsistent APIs.

**Solution**: `ICrudRepository<T>` interface defines standard CRUD operations with flexible return types.

**Usage**:

```typescript
import { ICrudRepository } from '@/services/core/ICrudRepository';

export class EntityRepository implements ICrudRepository<Entity> {
  async create(data: Partial<Entity>): Promise<Entity> {
    // Implementation
  }

  async getById(id: string): Promise<Entity | null> {
    // Implementation
  }

  async getAll(): Promise<Entity[]> {
    // Implementation
  }

  async update(id: string, data: Partial<Entity>): Promise<Entity> {
    // Implementation
  }

  async delete(id: string): Promise<boolean> {
    // Implementation
  }

  // Optional methods
  async exists(id: string): Promise<boolean> {
    return (await this.getById(id)) !== null;
  }

  async count(): Promise<number> {
    return (await this.getAll()).length;
  }
}
```

**Implementing Repositories** (3 repositories):

- ContactRepository (`ICrudRepository<IContact>`)
- PermissionRepository (`ICrudRepository<IPermissionGrant>`)
- VaultFolderRepository (`ICrudRepository<IVaultFolder>`)

**When to use**:

- ✅ Pure CRUD repositories (create, read, update, delete)
- ✅ Standard entity persistence
- ✅ Repositories with simple query patterns

**When NOT to use**:

- ❌ Repositories with complex domain logic (e.g., PilotRepository with `addAbility`, `recordKill`)
- ❌ Repositories with versioning/snapshot logic (e.g., UnitRepository)
- ❌ Repositories with specialized query builders

**Benefits**:

- ✅ Consistent API across repositories
- ✅ Type-safe CRUD operations
- ✅ Flexible async/sync implementations
- ✅ Optional methods for extended functionality

## Migration Guide

### Migrating Services to createSingleton

**Before**:

```typescript
let myService: MyService | null = null;

export function getMyService(): MyService {
  if (!myService) {
    myService = new MyService();
  }
  return myService;
}

export function resetMyService(): void {
  myService = null;
}
```

**After**:

```typescript
import {
  createSingleton,
  type SingletonFactory,
} from '@/services/core/createSingleton';

const myServiceFactory: SingletonFactory<MyService> = createSingleton(
  (): MyService => new MyService(),
);

export function getMyService(): MyService {
  return myServiceFactory.get();
}

export function resetMyService(): void {
  myServiceFactory.reset();
}
```

**Steps**:

1. Import `createSingleton` and `SingletonFactory` type
2. Replace module-level variable with factory constant
3. Update getter to call `factory.get()`
4. Update reset to call `factory.reset()`
5. Make constructor public (not private)
6. Run tests to verify

### Adopting ICrudRepository

**Steps**:

1. Import `ICrudRepository` from `@/services/core`
2. Add `implements ICrudRepository<EntityType>` to class
3. Ensure all required methods exist (create, getById, getAll, update, delete)
4. Add optional methods if needed (exists, count)
5. Match method signatures to interface contract
6. Run tests to verify

### Remaining Services

**~30 services** could adopt `createSingleton` pattern:

- Validation services (StructureValidationService, ArmorValidationService, etc.)
- Construction services (BlkExportService, MtfExportService, etc.)
- Gameplay services (CampaignService, EncounterService, etc.)

**Additional repositories** could implement `ICrudRepository`:

- VaultFolderRepository (hierarchical CRUD)
- Custom variant repositories
- Campaign/encounter repositories

## Testing

All services include comprehensive test coverage:

- **Unit tests**: Service-level logic and business rules
- **Integration tests**: Cross-service interactions
- **Test isolation**: Reset functions for clean test state

Run service tests:

```bash
npm test -- --testPathPattern="services"
```

## Performance

- **Lazy initialization**: Services created only when first accessed
- **Singleton pattern**: Single instance per service (memory efficient)
- **Async operations**: Non-blocking database and file I/O
- **Connection pooling**: SQLite connections managed by persistence layer

## Contributing

When adding new services:

1. Use `createSingleton` for singleton services
2. Implement `ICrudRepository` for pure CRUD repositories
3. Add comprehensive tests (unit + integration)
4. Document public API with JSDoc
5. Follow existing patterns in the domain directory
