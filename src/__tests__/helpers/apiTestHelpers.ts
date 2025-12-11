/**
 * API Test Helpers
 * 
 * Provides type-safe utilities for testing API endpoints.
 * Resolves ESLint no-unsafe-* warnings by providing proper typing.
 */

/**
 * Standard API response structure for success cases
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  count?: number;
  message?: string;
}

/**
 * Standard API response structure for error cases
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: string;
}

/**
 * Combined API response type
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Deprecated API response with redirect info
 */
export interface DeprecatedApiResponse {
  success: boolean;
  deprecated: boolean;
  message?: string;
  redirect?: string;
  newApi?: string;
}

/**
 * Unit list response
 */
export interface UnitListResponse {
  units: unknown[];
  count: number;
}

/**
 * Unit response with parsed data
 */
export interface UnitResponse {
  id: string;
  chassis?: string;
  model?: string;
  parsedData?: unknown;
  version?: number;
  success?: boolean;
  error?: string;
}

/**
 * Import response
 */
export interface ImportResponse {
  success: boolean;
  error?: string;
  validationErrors?: unknown[];
  unitId?: string;
  suggestedName?: string;
}

/**
 * Filter response item
 */
export interface FilterItem {
  value: string;
  label: string;
  count?: number;
}

/**
 * Filter response
 */
export interface FilterResponse {
  success: boolean;
  data: FilterItem[];
  error?: string;
}

/**
 * Category response
 */
export interface CategoryResponse {
  categories?: string[];
  eras?: string[];
  techBases?: string[];
  weightClasses?: string[];
  length?: number;
}

/**
 * Mock response type that works with node-mocks-http
 * Using a generic interface to avoid ResponseType constraint issues
 */
interface MockResponseLike {
  _getData(): string | Buffer | object;
}

/**
 * Parse response data with type safety
 * 
 * @param res - Mock response object
 * @returns Parsed JSON data with the specified type
 */
export function parseApiResponse<T = ApiResponse>(res: MockResponseLike): T {
  const rawData = res._getData();
  const jsonString = typeof rawData === 'string'
    ? rawData
    : rawData instanceof Buffer
      ? rawData.toString()
      : JSON.stringify(rawData);
  return JSON.parse(jsonString) as T;
}

/**
 * Parse response and assert success
 * 
 * @param res - Mock response object
 * @returns Parsed response asserted as success type
 */
export function parseSuccessResponse<T = unknown>(res: MockResponseLike): ApiSuccessResponse<T> {
  const data = parseApiResponse<ApiSuccessResponse<T>>(res);
  return data;
}

/**
 * Parse response and assert error
 * 
 * @param res - Mock response object
 * @returns Parsed response asserted as error type
 */
export function parseErrorResponse(res: MockResponseLike): ApiErrorResponse {
  const data = parseApiResponse<ApiErrorResponse>(res);
  return data;
}

/**
 * Parse deprecated API response
 */
export function parseDeprecatedResponse(res: MockResponseLike): DeprecatedApiResponse {
  return parseApiResponse<DeprecatedApiResponse>(res);
}

/**
 * Parse unit list response
 */
export function parseUnitListResponse(res: MockResponseLike): UnitListResponse {
  return parseApiResponse<UnitListResponse>(res);
}

/**
 * Parse unit response
 */
export function parseUnitResponse(res: MockResponseLike): UnitResponse {
  return parseApiResponse<UnitResponse>(res);
}

/**
 * Parse import response
 */
export function parseImportResponse(res: MockResponseLike): ImportResponse {
  return parseApiResponse<ImportResponse>(res);
}

/**
 * Parse filter response
 */
export function parseFilterResponse(res: MockResponseLike): FilterResponse {
  return parseApiResponse<FilterResponse>(res);
}

/**
 * Parse category/meta response
 */
export function parseCategoryResponse(res: MockResponseLike): CategoryResponse {
  return parseApiResponse<CategoryResponse>(res);
}

/**
 * Type guard to check if response is an error
 */
export function isApiError(response: ApiResponse): response is ApiErrorResponse {
  return response.success === false;
}

/**
 * Type guard to check if response is successful
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

// =============================================================================
// Mock Factory Types
// =============================================================================

/**
 * Creates a type-safe mock that implements the required interface methods.
 * This avoids the need for `as unknown as T` double casting.
 * 
 * Usage:
 * ```typescript
 * const mockService = createMockImplementation<ISQLiteService>({
 *   initialize: jest.fn(),
 *   getDatabase: jest.fn(),
 *   // other required methods...
 * });
 * ```
 */
export type MockImplementation<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? jest.Mock<R, A>
    : T[K];
};

/**
 * Partial mock that satisfies the interface constraint.
 * Use when you only need some methods mocked.
 */
export type PartialMock<T> = Partial<MockImplementation<T>> & Record<string, jest.Mock | unknown>;

/**
 * Helper to create a mock object that TypeScript accepts as the target type.
 * This is type-safe because we declare the return type explicitly.
 * 
 * NOTE: This function uses a single type assertion which is acceptable
 * for test mocks. It avoids the dangerous `as unknown as T` pattern
 * by relying on the PartialMock constraint to ensure type compatibility.
 */
export function createMock<T>(implementation: PartialMock<T>): T {
  return implementation as T;
}

/**
 * Helper to create mock DOM elements for testing.
 * DOM mocks require special handling because the actual DOM interfaces
 * are complex and test mocks only need a subset of methods.
 * 
 * @param implementation - Object with the mock method implementations
 * @returns The mock typed as the DOM element type
 */
export function createDOMMock<T extends Element>(
  implementation: Record<string, unknown>
): T {
  // Single assertion is acceptable for test mocks
  // The implementation provides the needed methods
  return implementation as T;
}

