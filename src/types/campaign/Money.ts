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

  add(other: Money): Money {
    return new Money((this.centsValue + other.centsValue) / 100);
  }

  subtract(other: Money): Money {
    return new Money((this.centsValue - other.centsValue) / 100);
  }

  multiply(multiplier: number): Money {
    return new Money((this.centsValue * multiplier) / 100);
  }

  divide(divisor: number): Money {
    if (divisor === 0) {
      throw new Error('Cannot divide Money by zero');
    }
    return new Money(this.centsValue / divisor / 100);
  }

  format(): string {
    const formatted = this.amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formatted} C-bills`;
  }

  isZero(): boolean {
    return this.centsValue === 0;
  }

  isPositive(): boolean {
    return this.centsValue > 0;
  }

  isNegative(): boolean {
    return this.centsValue < 0;
  }

  isPositiveOrZero(): boolean {
    return this.centsValue >= 0;
  }

  absolute(): Money {
    return new Money(Math.abs(this.centsValue) / 100);
  }

  compareTo(other: Money): number {
    if (this.centsValue < other.centsValue) return -1;
    if (this.centsValue > other.centsValue) return 1;
    return 0;
  }

  equals(other: Money): boolean {
    return this.centsValue === other.centsValue;
  }

  toString(): string {
    return this.format();
  }

  toJSON(): number {
    return this.amount;
  }
}
