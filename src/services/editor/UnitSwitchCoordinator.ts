/**
 * Unit Switch Coordinator - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

export class UnitSwitchCoordinator {
  private currentUnitId: string | null = null;

  async switchToUnit(unitId: string): Promise<boolean> {
    this.currentUnitId = unitId;
    return true;
  }

  getCurrentUnitId(): string | null {
    return this.currentUnitId;
  }

  async saveCurrentUnit(): Promise<boolean> {
    return true;
  }

  async discardChanges(): Promise<void> {
    // Stub
  }
}

export const unitSwitchCoordinator = new UnitSwitchCoordinator();


