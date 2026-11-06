import fs from 'node:fs';

import { listingRows, record } from './g6-042-state.mjs';
export default class G6Reporter {
  onBegin(config, suite) {
    if (process.env.MEKSTATION_G6_042_LISTING)
      fs.writeFileSync(
        process.env.MEKSTATION_G6_042_LISTING,
        JSON.stringify(listingRows(suite), null, 2),
      );
    record('suite-begin', {
      workers: config.workers,
      tests: listingRows(suite),
    });
  }
  onTestBegin(test, result) {
    record('test-begin', { retry: result.retry }, { testId: test.id });
  }
  onTestEnd(test, result) {
    record(
      'test-end',
      { status: result.status, retry: result.retry },
      { testId: test.id },
    );
  }
  onStepBegin(test, result, step) {
    this.step(test, step, 'begin');
  }
  onStepEnd(test, result, step) {
    this.step(test, step, 'end');
  }
  step(test, step, edge) {
    if (
      !test.location.file.endsWith(
        'seam-roster-materialization-handoff.spec.ts',
      )
    )
      return;
    let kind;
    if (step.title === 'After Hooks' && edge === 'begin') kind = 'pre-teardown';
    else if (/close context/i.test(step.title)) kind = `context-close-${edge}`;
    else if (step.category === 'pw:api' && edge === 'end') {
      for (let parent = step.parent; parent; parent = parent.parent)
        if (
          parent.category === 'fixture' ||
          ['Before Hooks', 'After Hooks'].includes(parent.title)
        )
          return;
      kind = 'body-api-end';
    }
    if (kind)
      record(
        kind,
        { title: step.title, category: step.category },
        { testId: test.id },
      );
  }
  onError(error) {
    record('runner-error', { error: error.message });
  }
  onEnd(result) {
    record('suite-end', { status: result.status });
  }
  printsToStdio() {
    return false;
  }
}
