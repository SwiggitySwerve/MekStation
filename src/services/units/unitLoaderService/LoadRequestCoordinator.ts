export interface ILoadRequestTicket {
  readonly key: string;
}

/** Owns which in-flight result may open an editor; source reads may finish independently. */
export class LoadRequestCoordinator {
  private current: ILoadRequestTicket | null = null;
  private releaseSource: (() => void) | undefined;

  begin(key: string, releaseSource?: () => void): ILoadRequestTicket | null {
    if (this.current?.key === key) return null;
    this.cancel();
    const ticket = { key };
    this.current = ticket;
    this.releaseSource = releaseSource;
    return ticket;
  }

  isCurrent(ticket: ILoadRequestTicket): boolean {
    return this.current === ticket;
  }

  finish(ticket: ILoadRequestTicket): void {
    if (!this.isCurrent(ticket)) return;
    this.current = null;
    this.releaseSource = undefined;
  }

  cancel(): void {
    const release = this.releaseSource;
    this.current = null;
    this.releaseSource = undefined;
    release?.();
  }
}
