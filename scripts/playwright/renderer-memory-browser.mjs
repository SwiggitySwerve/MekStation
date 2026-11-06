import { chromium } from '@playwright/test';
import crypto from 'node:crypto';
// Scratch diagnostic only. GNU time receives the original browser argv unchanged.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BROWSER_MAIN_MAXRSS_MEANING } from './renderer-memory.mjs';

const quote = (text) => "'" + text.replaceAll("'", "'\\''") + "'";

export function writeBrowserWrapper({
  root,
  binary,
  timeExecutable = '/usr/bin/time',
}) {
  if (
    !root ||
    !binary ||
    !path.isAbsolute(root) ||
    !path.isAbsolute(binary) ||
    !path.isAbsolute(timeExecutable)
  )
    throw new Error(
      'Diagnostic output, browser and GNU time must use absolute paths',
    );
  fs.mkdirSync(path.join(root, 'kernel'), { recursive: true });
  const wrapper = path.join(root, 'browser-wrapper.sh');
  const format =
    '{"schema":"mekstation-browser-rusage/v1","maxRssKiB":%M,"exitStatus":%x,"wallSeconds":"%e"}';
  const script = [
    '#!/bin/sh',
    'case "$MEKSTATION_E2E_MEMORY_SUITE" in gates|library|smoke|probe) ;; *) exit 64 ;; esac',
    `exec ${quote(timeExecutable)} -f ${quote(format)} -o ${quote(path.join(root, 'kernel'))}/"$MEKSTATION_E2E_MEMORY_SUITE-$$.jsonl" ${quote(binary)} "$@"`,
    '',
  ].join('\n');
  fs.writeFileSync(wrapper, script, { mode: 0o755 });
  return wrapper;
}

export function prepareInstalledBrowser(root) {
  if (process.platform !== 'linux' || process.arch !== 'x64')
    throw new Error('This diagnostic is Linux x64 only');
  const require = createRequire(import.meta.url);
  const metadata = JSON.parse(
    fs.readFileSync(
      path.join(
        path.dirname(require.resolve('playwright-core/package.json')),
        'browsers.json',
      ),
      'utf8',
    ),
  );
  const browser = metadata.browsers.find(
    (b) => b.name === 'chromium-headless-shell',
  );
  if (!browser || !/^\d+$/.test(browser.revision) || browser.revisionOverrides)
    throw new Error('Unknown headless-shell build layout');
  const cache = path.dirname(
    path.dirname(path.dirname(chromium.executablePath())),
  );
  const binary = fs.realpathSync(
    path.join(
      cache,
      `chromium_headless_shell-${browser.revision}`,
      'chrome-headless-shell-linux64/chrome-headless-shell',
    ),
  );
  fs.accessSync(binary, fs.constants.X_OK);
  fs.accessSync('/usr/bin/time', fs.constants.X_OK);
  const wrapper = writeBrowserWrapper({ root, binary });
  fs.writeFileSync(
    path.join(root, 'browser-manifest.json'),
    JSON.stringify(
      {
        browser,
        binary,
        wrapper,
        binarySHA256: crypto
          .createHash('sha256')
          .update(fs.readFileSync(binary))
          .digest('hex'),
        kernelPeakMeaning: BROWSER_MAIN_MAXRSS_MEANING,
      },
      null,
      2,
    ),
  );
  return wrapper;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  prepareInstalledBrowser(process.env.MEKSTATION_E2E_MEMORY_ROOT);
