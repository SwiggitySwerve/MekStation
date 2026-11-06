// Adds observations only; never changes statuses, retries, flags or test bodies.
import fs from 'node:fs';
import path from 'node:path';

import { observeHost } from './ci-diagnostic-observations.mjs';

export default class DiagnosticReporter {
  constructor({ emit, observe = observeHost } = {}) {
    this.observe = observe;
    this.emit =
      emit ??
      ((row) => {
        const directory = process.env.MEKSTATION_E2E_DIAGNOSTIC_DIR;
        if (!directory || !path.isAbsolute(directory))
          throw new Error('Diagnostic output must be an absolute path');
        fs.mkdirSync(directory, { recursive: true });
        const suite = process.env.MEKSTATION_E2E_DIAGNOSTIC_SUITE;
        if (!['gates', 'library', 'smoke'].includes(suite))
          throw new Error('Diagnostic suite missing');
        fs.appendFileSync(
          path.join(directory, `${suite}-${process.pid}.jsonl`),
          JSON.stringify(row) + '\n',
        );
      });
  }
  record(event, data = {}) {
    this.emit({
      schema: 'mekstation-e2e-memory/v1',
      event,
      at: new Date().toISOString(),
      pid: process.pid,
      run: process.env.GITHUB_RUN_ID,
      attempt: process.env.GITHUB_RUN_ATTEMPT,
      suite: process.env.MEKSTATION_E2E_DIAGNOSTIC_SUITE,
      ...data,
      observation: this.observe(),
    });
  }
  onBegin(config, suite) {
    const servers = !config.webServer
      ? []
      : Array.isArray(config.webServer)
        ? config.webServer
        : [config.webServer];
    this.record('suite-begin', {
      workers: config.workers,
      projects: config.projects.map((p) => ({
        name: p.name,
        retries: p.retries,
      })),
      tests: suite.allTests().map((t) => ({
        id: t.id,
        titles: t.titlePath(),
        location: t.location,
      })),
      server: servers.map((s) => ({
        command: s.command,
        url: s.url,
        env: {
          PORT: s.env?.PORT,
          PLAYWRIGHT_E2E_RUN_ID: s.env?.PLAYWRIGHT_E2E_RUN_ID,
          DATABASE_PATH: s.env?.DATABASE_PATH,
          MULTIPLAYER_DB_PATH: s.env?.MULTIPLAYER_DB_PATH,
        },
      })),
    });
  }
  onTestBegin(test, result) {
    this.record('test-begin', this.testData(test, result));
  }
  onTestEnd(test, result) {
    this.record('test-end', {
      ...this.testData(test, result),
      status: result.status,
      durationMs: result.duration,
    });
  }
  onError(error) {
    this.record('runner-error', { message: error.message });
  }
  onEnd(result) {
    this.record('suite-end', { status: result.status });
  }
  testData(test, result) {
    return {
      id: test.id,
      titles: test.titlePath(),
      location: test.location,
      worker: result.workerIndex,
      retry: result.retry,
    };
  }
  printsToStdio() {
    return false;
  }
}
