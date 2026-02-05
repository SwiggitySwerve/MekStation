/**
 * Weighted random selection table adapted from MekHQ
 * @see E:\Projects\mekhq\MekHQ\src\mekhq\campaign\againstTheBot\WeightedTable.java
 */
export class WeightedTable<T> {
  private readonly weights: number[] = [];
  private readonly values: T[] = [];

  add(weight: number, value: T): void {
    this.weights.push(weight);
    this.values.push(value);
  }

  select(random: () => number, rollMod: number = 0): T | null {
    const total = this.weights.reduce((sum, w) => sum + w, 0);

    if (total <= 0) {
      return null;
    }

    const rawRoll = Math.floor(random() * total);
    const modifiedRoll = Math.min(
      rawRoll + Math.floor(total * rollMod + 0.5),
      total - 1,
    );

    let roll = Math.max(0, modifiedRoll);

    for (let i = 0; i < this.weights.length; i++) {
      if (roll < this.weights[i]) {
        return this.values[i];
      }
      roll -= this.weights[i];
    }

    return null;
  }
}
