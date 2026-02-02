/**
 * Mulberry32 PRNG implementation for deterministic random number generation
 * @see https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32
 */
export class SeededRandom {
  private state: number;
  private readonly initialSeed: number;

  constructor(seed: number) {
    this.initialSeed = seed >>> 0;
    this.state = this.initialSeed;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Reset the PRNG to its initial seed state
   */
  reset(): void {
    this.state = this.initialSeed;
  }
}
