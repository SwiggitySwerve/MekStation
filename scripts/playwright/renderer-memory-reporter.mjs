// Public reporter hooks only; native test results, retries and fixture code stay intact.
import fs from 'node:fs';
import path from 'node:path';

import { observationPhase, processSnapshot } from './renderer-memory.mjs';

export default class RendererMemoryReporter {
  constructor({ observe = processSnapshot, emit } = {}) {
    this.observe = observe;
    this.emit =
      emit ??
      ((row) => {
        const root = process.env.MEKSTATION_E2E_MEMORY_ROOT;
        const suite = process.env.MEKSTATION_E2E_MEMORY_SUITE;
        if (
          !root ||
          !path.isAbsolute(root) ||
          !['gates', 'library', 'smoke', 'probe'].includes(suite)
        )
          throw new Error('Diagnostic output/suite missing');
        fs.mkdirSync(root, { recursive: true });
        fs.appendFileSync(
          path.join(root, `${suite}-${process.pid}.jsonl`),
          JSON.stringify(row) + '\n',
        );
      });
  }
  record(phase, test, result, extra = {}) {
    this.emit({
      schema: 'mekstation-renderer-memory/v1',
      phase,
      at: new Date().toISOString(),
      run: process.env.GITHUB_RUN_ID,
      attempt: process.env.GITHUB_RUN_ATTEMPT,
      head: process.env.GITHUB_SHA,
      runId: process.env.PLAYWRIGHT_E2E_RUN_ID,
      port: process.env.MEKSTATION_E2E_PORT,
      suite: process.env.MEKSTATION_E2E_MEMORY_SUITE,
      reporterPid: process.pid,
      testId: test?.id,
      location: test?.location,
      titles: test?.titlePath(),
      retry: result?.retry,
      worker: result?.workerIndex,
      ...extra,
      observation: this.observe(),
    });
  }
  onBegin(config, suite) {
    this.record('suite-begin', undefined, undefined, {
      workers: config.workers,
      tests: suite.allTests().map((t) => ({
        id: t.id,
        location: t.location,
        titles: t.titlePath(),
      })),
    });
  }
  onTestBegin(test, result) {
    this.record('test-begin', test, result);
  }
  onTestEnd(test, result) {
    this.record('test-end', test, result, { status: result.status });
  }
  onStepBegin(test, result, step) {
    this.step(test, result, step, 'begin');
  }
  onStepEnd(test, result, step) {
    this.step(test, result, step, 'end');
  }
  step(test, result, step, edge) {
    const phase = observationPhase(test, step, edge);
    if (phase)
      this.record(phase, test, result, {
        step: { title: step.title, category: step.category },
      });
  }
  onError(error) {
    this.record('runner-error', undefined, undefined, {
      message: error.message,
    });
  }
  onEnd(result) {
    this.record('suite-end', undefined, undefined, { status: result.status });
  }
  printsToStdio() {
    return false;
  }
}
