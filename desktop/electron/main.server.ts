import { ChildProcess, spawn, spawnSync } from 'child_process';

/** Printed by server.js once the packaged listener is bound. */
export const SERVER_READY_MARKER = 'MEKSTATION_LISTENER_READY';
export const SERVER_READY_TIMEOUT_MS = 120_000;

interface IEmbeddedServerOptions {
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly serverPath: string;
}

/**
 * Owns the embedded Next.js standalone server. Readiness is the server's own
 * listener-ready marker, so a ~20 s cold start is waited out instead of racing
 * a fixed delay. A crashed server is respawned by the next wait.
 */
export class EmbeddedServer {
  private child: ChildProcess | null = null;
  private ready = false;
  private readonly onReady = new Set<() => void>();

  constructor(private readonly options: IEmbeddedServerOptions) {}

  waitUntilReady(timeoutMs: number = SERVER_READY_TIMEOUT_MS): Promise<void> {
    const child = this.start();
    if (this.ready) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const settle = (failure?: string): void => {
        clearTimeout(timer);
        this.onReady.delete(ready);
        child.off('exit', exited);
        child.off('error', failed);
        if (failure) reject(new Error(`The embedded server ${failure}.`));
        else resolve();
      };
      const ready = (): void => settle();
      const exited = (code: number | null, signal: string | null): void =>
        settle(`exited before it was ready (code ${code}, signal ${signal})`);
      const failed = (error: Error): void =>
        settle(`failed to start: ${error.message}`);
      const timer = setTimeout(
        () =>
          settle(
            `did not become ready within ${Math.round(timeoutMs / 1000)} s`,
          ),
        timeoutMs,
      );
      this.onReady.add(ready);
      child.once('exit', exited);
      child.once('error', failed);
    });
  }

  /** Terminates the server process tree. Idempotent. */
  stop(): void {
    const child = this.child;
    this.child = null;
    this.ready = false;
    if (child) killProcessTree(child);
  }

  private start(): ChildProcess {
    if (this.child) return this.child;
    const child = spawn(process.execPath, [this.options.serverPath], {
      cwd: this.options.cwd,
      env: this.options.env,
      windowsHide: true,
    });
    this.child = child;
    this.ready = false;

    let pending = '';
    child.stdout?.on('data', (data: Buffer) => {
      console.log(`Server: ${data.toString()}`);
      if (this.ready || this.child !== child) return;
      pending = (pending + data.toString()).slice(-4096);
      if (!pending.includes(SERVER_READY_MARKER)) return;
      this.ready = true;
      for (const listener of [...this.onReady]) listener();
    });
    child.stderr?.on('data', (data: Buffer) => {
      console.error(`Server Error: ${data.toString()}`);
    });
    child.on('error', (error: Error) => {
      console.error('Failed to start Next.js server:', error);
      if (this.child === child) this.child = null;
    });
    child.on('exit', (code, signal) => {
      console.log(`Embedded server exited (code ${code}, signal ${signal})`);
      if (this.child !== child) return;
      this.child = null;
      this.ready = false;
    });
    return child;
  }
}

export function killProcessTree(child: ChildProcess): void {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32' && child.pid !== undefined) {
    // /T also ends anything the server spawned; kill() only ends the child.
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
  } else {
    child.kill('SIGTERM');
  }
}

let embeddedServer: EmbeddedServer | null = null;

/** Process-wide server, so a re-created window (macOS) reuses it. */
export function getEmbeddedServer(
  options: IEmbeddedServerOptions,
): EmbeddedServer {
  embeddedServer ??= new EmbeddedServer(options);
  return embeddedServer;
}

export function stopEmbeddedServer(): void {
  embeddedServer?.stop();
}
