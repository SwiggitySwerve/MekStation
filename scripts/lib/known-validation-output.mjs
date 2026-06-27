export const staleNextBaselineWarning =
  '[baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`';

export function pipeFilteredOutput(stream, target) {
  let pending = '';

  stream.on('data', (chunk) => {
    pending += chunk.toString();
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? '';

    for (const line of lines) {
      if (line.includes(staleNextBaselineWarning)) {
        continue;
      }

      target.write(`${line}\n`);
    }
  });

  stream.on('end', () => {
    if (pending.length > 0 && !pending.includes(staleNextBaselineWarning)) {
      target.write(pending);
    }
  });
}
