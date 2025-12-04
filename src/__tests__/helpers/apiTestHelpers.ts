/**
 * API Test Helpers
 * 
 * Provides type-safe utilities for testing API endpoints.
 * Resolves ESLint no-unsafe-* warnings by providing proper typing.
 */
import type { MockResponse } from 'node-mocks-http';

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
 * Parse response data with type safety
 * 
 * @param res - Mock response object
 * @returns Parsed JSON data with the specified type
 */
export function parseApiResponse<T = ApiResponse>(res: MockResponse<unknown>): T {
  const rawData = res._getData() as string;
  return JSON.parse(rawData) as T;
}

/**
 * Parse response and assert success
 * 
 * @param res - Mock response object
 * @returns Parsed response asserted as success type
 */
export function parseSuccessResponse<T = unknown>(res: MockResponse<unknown>): ApiSuccessResponse<T> {
  const data = parseApiResponse<ApiSuccessResponse<T>>(res);
  return data;
}

/**
 * Parse response and assert error
 * 
 * @param res - Mock response object
 * @returns Parsed response asserted as error type
 */
export function parseErrorResponse(res: MockResponse<unknown>): ApiErrorResponse {
  const data = parseApiResponse<ApiErrorResponse>(res);
  return data;
}

/**
 * Parse deprecated API response
 */
export function parseDeprecatedResponse(res: MockResponse<unknown>): DeprecatedApiResponse {
  return parseApiResponse<DeprecatedApiResponse>(res);
}

/**
 * Parse unit list response
 */
export function parseUnitListResponse(res: MockResponse<unknown>): UnitListResponse {
  return parseApiResponse<UnitListResponse>(res);
}

/**
 * Parse unit response
 */
export function parseUnitResponse(res: MockResponse<unknown>): UnitResponse {
  return parseApiResponse<UnitResponse>(res);
}

/**
 * Parse import response
 */
export function parseImportResponse(res: MockResponse<unknown>): ImportResponse {
  return parseApiResponse<ImportResponse>(res);
}

/**
 * Parse filter response
 */
export function parseFilterResponse(res: MockResponse<unknown>): FilterResponse {
  return parseApiResponse<FilterResponse>(res);
}

/**
 * Parse category/meta response
 */
export function parseCategoryResponse(res: MockResponse<unknown>): CategoryResponse {
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

