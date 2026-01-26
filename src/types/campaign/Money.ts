/**
 * Money class for campaign finances
 * Immutable value object representing currency amounts in C-bills
 * Stores internally as cents to avoid floating-point arithmetic errors
 */

/**
 * Immutable Money class
 * All operations return new Money instances
 * Internal storage is in cents (1 C-bill = 100 cents)
 */
export class Money {
  private readonly cents: number;

  /**
   * Create a Money instance from C-bills
   * @param amount Amount in C-bills (can be decimal)
   */
  constructor(amount: number = 0) {
    // Convert to cents and round to avoid floating point errors
    this.cents = Math.round(amount * 100);
  }

  /**
   * Get the amount in C-bills
   */
  get amount(): number {
    return this.cents / 100;
  }

  /**
   * Get the amount in cents
   */
  get centsValue(): number {
    return this.cents;
  }

  /**
   * Add another Money amount
   * @param other Money to add
   * @returns New Money instance with sum
   */
  add(other: Money): Money {
    return new Money((this.cents + other.cents) / 100);
  }

  /**
   * Subtract another Money amount
   * @param other Money to subtract
   * @returns New Money instance with difference
   */
  subtract(other: Money): Money {
    return new Money((this.cents - other.cents) / 100);
  }

  /**
   * Multiply by a scalar
   * @param multiplier Number to multiply by
   * @returns New Money instance with product
   */
  multiply(multiplier: number): Money {
    return new Money((this.cents * multiplier) / 100);
  }

  /**
   * Divide by a scalar
   * @param divisor Number to divide by
   * @returns New Money instance with quotient
   * @throws Error if divisor is zero
   */
  divide(divisor: number): Money {
    if (divisor === 0) {
      throw new Error('Cannot divide Money by zero');
    }
    return new Money((this.cents / divisor) / 100);
  }

  /**
   * Format as currency string with thousand separators
   * @returns Formatted string like "1,234.56 C-bills"
   */
  format(): string {
    const amount = this.amount;
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formatted} C-bills`;
  }

  /**
   * Check if amount is zero
   */
  isZero(): boolean {
    return this.cents === 0;
  }

  /**
   * Check if amount is positive
   */
  isPositive(): boolean {
    return this.cents > 0;
  }

  /**
   * Check if amount is negative
   */
  isNegative(): boolean {
    return this.cents < 0;
  }

  /**
   * Check if amount is positive or zero
   */
  isPositiveOrZero(): boolean {
    return this.cents >= 0;
  }

  /**
   * Get absolute value
   */
  absolute(): Money {
    return new Money(Math.abs(this.cents) / 100);
  }

  /**
   * Compare with another Money amount
   * @returns -1 if less, 0 if equal, 1 if greater
   */
  compareTo(other: Money): number {
    if (this.cents < other.cents) return -1;
    if (this.cents > other.cents) return 1;
    return 0;
  }

  /**
   * Check equality with another Money amount
   */
  equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.format();
  }

  /**
   * JSON serialization
   */
  toJSON(): number {
    return this.amount;
  }

  /**
   * Zero constant
   */
  static readonly ZERO = new Money(0);

  /**
   * Create Money from cents
   * @param cents Amount in cents
   */
  static fromCents(cents: number): Money {
    // Convert cents to C-bills by dividing by 100
    return new Money(Math.round(cents) / 100);
  }
}
