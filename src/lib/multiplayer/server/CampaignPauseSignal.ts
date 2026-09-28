/** Synchronous GM-pause invalidation shared with active mission hosts. */
export class CampaignPauseSignal {
  private paused = false;
  private readonly listeners = new Set<(paused: boolean) => void>();

  isPaused = (): boolean => this.paused;

  onChange = (listener: (paused: boolean) => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    this.listeners.forEach((listener) => listener(paused));
  }
}
