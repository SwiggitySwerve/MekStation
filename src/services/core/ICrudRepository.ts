/**
 * Generic CRUD Repository Interface
 *
 * Defines a standard contract for repository implementations that handle
 * Create, Read, Update, Delete operations on entities.
 *
 * This interface is flexible enough to support various implementations:
 * - Synchronous or asynchronous operations
 * - Different return types (Result<T>, T, null, boolean, etc.)
 * - Custom query methods beyond standard CRUD
 *
 * @example
 * ```typescript
 * // Example: Synchronous repository returning Result<T>
 * class UserRepository implements ICrudRepository<User, CreateUserDTO, UpdateUserDTO> {
 *   create(dto: CreateUserDTO): Result<User> {
 *     // Implementation
 *   }
 *
 *   getById(id: string): Result<User | null> {
 *     // Implementation
 *   }
 *
 *   getAll(): Result<User[]> {
 *     // Implementation
 *   }
 *
 *   update(id: string, dto: UpdateUserDTO): Result<User> {
 *     // Implementation
 *   }
 *
 *   delete(id: string): Result<boolean> {
 *     // Implementation
 *   }
 * }
 *
 * // Example: Async repository returning Promise<T>
 * class ContactRepository implements ICrudRepository<Contact, CreateContactDTO, UpdateContactDTO> {
 *   async create(dto: CreateContactDTO): Promise<Contact> {
 *     // Implementation
 *   }
 *
 *   async getById(id: string): Promise<Contact | null> {
 *     // Implementation
 *   }
 *
 *   async getAll(): Promise<Contact[]> {
 *     // Implementation
 *   }
 *
 *   async update(id: string, dto: UpdateContactDTO): Promise<Contact> {
 *     // Implementation
 *   }
 *
 *   async delete(id: string): Promise<boolean> {
 *     // Implementation
 *   }
 *
 *   // Optional: Custom query methods
 *   async search(query: string): Promise<Contact[]> {
 *     // Implementation
 *   }
 * }
 * ```
 *
 * @typeParam T - The entity type managed by this repository
 * @typeParam CreateDTO - DTO type for create operations (defaults to Partial<T>)
 * @typeParam UpdateDTO - DTO type for update operations (defaults to Partial<T>)
 */
export interface ICrudRepository<
  T,
  CreateDTO = Partial<T>,
  UpdateDTO = Partial<T>,
> {
  /**
   * Create a new entity
   *
   * @param dto - Data transfer object containing entity data
   * @returns The created entity (with generated ID and timestamps)
   * @throws May throw or return error depending on implementation
   */
  create(dto: CreateDTO): T | Promise<T>;

  /**
   * Retrieve an entity by its ID
   *
   * @param id - The entity's unique identifier
   * @returns The entity if found, null if not found
   * @throws May throw or return error depending on implementation
   */
  getById(id: string): T | null | Promise<T | null>;

  /**
   * Retrieve all entities
   *
   * @returns Array of all entities (may be empty)
   * @throws May throw or return error depending on implementation
   */
  getAll(): T[] | Promise<T[]>;

  /**
   * Update an existing entity
   *
   * @param id - The entity's unique identifier
   * @param dto - Partial data to update
   * @returns The updated entity
   * @throws May throw or return error depending on implementation
   */
  update(id: string, dto: UpdateDTO): T | Promise<T>;

  /**
   * Delete an entity
   *
   * @param id - The entity's unique identifier
   * @returns true if deleted, false if not found
   * @throws May throw or return error depending on implementation
   */
  delete(id: string): boolean | Promise<boolean>;

  /**
   * Optional: Check if an entity exists
   *
   * @param id - The entity's unique identifier
   * @returns true if entity exists, false otherwise
   */
  exists?(id: string): boolean | Promise<boolean>;

  /**
   * Optional: Get total count of entities
   *
   * @returns Total number of entities
   */
  count?(): number | Promise<number>;
}
