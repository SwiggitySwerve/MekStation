/**
 * Custom Jest Assertions
 * 
 * Extends Jest's expect with BattleTech-specific matchers.
 */

import { roundToHalfTon } from '@/utils/physical/weightUtils';

/**
 * Weight tolerance for BattleTech calculations (0.5 tons)
 */
const WEIGHT_TOLERANCE = 0.5;

/**
 * Custom matcher: toBeValidWeight
 * 
 * Checks if a weight is within half-ton tolerance of expected value.
 */
function toBeValidWeight(
  this: jest.MatcherContext,
  received: number,
  expected: number
): jest.CustomMatcherResult {
  const pass = Math.abs(received - expected) <= WEIGHT_TOLERANCE;
  
  return {
    pass,
    message: () =>
      pass
        ? `expected ${received} not to be within ${WEIGHT_TOLERANCE} tons of ${expected}`
        : `expected ${received} to be within ${WEIGHT_TOLERANCE} tons of ${expected}`,
  };
}

/**
 * Custom matcher: toBeHalfTonIncrement
 * 
 * Checks if a weight is a valid half-ton increment (0.5, 1.0, 1.5, etc.)
 */
function toBeHalfTonIncrement(
  this: jest.MatcherContext,
  received: number
): jest.CustomMatcherResult {
  const isHalfTon = received === roundToHalfTon(received);
  
  return {
    pass: isHalfTon,
    message: () =>
      isHalfTon
        ? `expected ${received} not to be a half-ton increment`
        : `expected ${received} to be a half-ton increment, got ${received} (nearest: ${roundToHalfTon(received)})`,
  };
}

/**
 * Custom matcher: toBeWithinRange
 * 
 * Checks if a number is within a specified range (inclusive).
 */
function toBeWithinRange(
  this: jest.MatcherContext,
  received: number,
  min: number,
  max: number
): jest.CustomMatcherResult {
  const pass = received >= min && received <= max;
  
  return {
    pass,
    message: () =>
      pass
        ? `expected ${received} not to be within range [${min}, ${max}]`
        : `expected ${received} to be within range [${min}, ${max}]`,
  };
}

/**
 * Custom matcher: toBeMultipleOf
 * 
 * Checks if a number is a multiple of another number.
 */
function toBeMultipleOf(
  this: jest.MatcherContext,
  received: number,
  multiple: number
): jest.CustomMatcherResult {
  const pass = received % multiple === 0;
  
  return {
    pass,
    message: () =>
      pass
        ? `expected ${received} not to be a multiple of ${multiple}`
        : `expected ${received} to be a multiple of ${multiple}`,
  };
}

/**
 * Custom matcher: toHaveValidationError
 * 
 * Checks if a validation result contains a specific error code.
 */
function toHaveValidationError(
  this: jest.MatcherContext,
  received: { errors: Array<{ code: string }> },
  errorCode: string
): jest.CustomMatcherResult {
  const hasError = received.errors.some(e => e.code === errorCode);
  
  return {
    pass: hasError,
    message: () =>
      hasError
        ? `expected validation result not to have error '${errorCode}'`
        : `expected validation result to have error '${errorCode}', found: ${received.errors.map(e => e.code).join(', ')}`,
  };
}

/**
 * Custom matcher: toBeValidEngineRating
 * 
 * Checks if an engine rating is valid (10-500, multiple of 5).
 */
function toBeValidEngineRating(
  this: jest.MatcherContext,
  received: number
): jest.CustomMatcherResult {
  const isValid = 
    Number.isInteger(received) &&
    received >= 10 &&
    received <= 500 &&
    received % 5 === 0;
  
  const issues: string[] = [];
  if (!Number.isInteger(received)) issues.push('not an integer');
  if (received < 10) issues.push('below minimum 10');
  if (received > 500) issues.push('above maximum 500');
  if (received % 5 !== 0) issues.push('not a multiple of 5');
  
  return {
    pass: isValid,
    message: () =>
      isValid
        ? `expected ${received} not to be a valid engine rating`
        : `expected ${received} to be a valid engine rating: ${issues.join(', ')}`,
  };
}

/**
 * Custom matcher: toBeValidSlotCount
 * 
 * Checks if a slot count is valid (non-negative integer).
 */
function toBeValidSlotCount(
  this: jest.MatcherContext,
  received: number
): jest.CustomMatcherResult {
  const isValid = Number.isInteger(received) && received >= 0;
  
  return {
    pass: isValid,
    message: () =>
      isValid
        ? `expected ${received} not to be a valid slot count`
        : `expected ${received} to be a non-negative integer slot count`,
  };
}

/**
 * Register custom matchers with Jest
 */
export function registerBattleTechMatchers(): void {
  expect.extend({
    toBeValidWeight,
    toBeHalfTonIncrement,
    toBeWithinRange,
    toBeMultipleOf,
    toHaveValidationError,
    toBeValidEngineRating,
    toBeValidSlotCount,
  });
}

/**
 * TypeScript declarations for custom matchers
 */
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidWeight(expected: number): R;
      toBeHalfTonIncrement(): R;
      toBeWithinRange(min: number, max: number): R;
      toBeMultipleOf(multiple: number): R;
      toHaveValidationError(errorCode: string): R;
      toBeValidEngineRating(): R;
      toBeValidSlotCount(): R;
    }
  }
}

// Auto-register matchers when this module is imported
registerBattleTechMatchers();

