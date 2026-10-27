/** Pinned upstream input and deliberately limited Java metadata parser. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

export const revision = 'fd2edfb36ac4bb06a0aa3fbfbdd38d79b7d62a60';
export const sourceRoot = `https://github.com/MegaMek/megamek/blob/${revision}/megamek/src/megamek/common/`;

export async function loadSources(root) {
  const cache = new URL(
    `../.cache/equipment-availability/${revision}.json`,
    root,
  );
  try {
    return JSON.parse(await readFile(cache, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const response = await fetch(
    `https://codeload.github.com/MegaMek/megamek/tar.gz/${revision}`,
  );
  if (!response.ok)
    throw new Error(`MegaMek download failed: ${response.status}`);
  const tar = gunzipSync(Buffer.from(await response.arrayBuffer()));
  const sources = {};
  let extendedPath;
  for (let offset = 0; offset + 512 <= tar.length; ) {
    const header = tar.subarray(offset, offset + 512);
    const name = header.toString('utf8', 0, 100).split('\0')[0];
    const size =
      Number.parseInt(
        header.toString('utf8', 124, 136).replace(/\0/g, '').trim(),
        8,
      ) || 0;
    const content = tar.toString('utf8', offset + 512, offset + 512 + size);
    const type = header.toString('utf8', 156, 157);
    if (type === 'x') extendedPath = content.match(/\d+ path=([^\n]+)/)?.[1];
    else if (type === 'L') extendedPath = content.replace(/\0.*$/s, '');
    else {
      const prefix = header.toString('utf8', 345, 500).split('\0')[0];
      const path = (
        extendedPath ?? (prefix ? `${prefix}/${name}` : name)
      ).split('/src/megamek/common/')[1];
      if (path?.endsWith('.java')) sources[path] = content;
      extendedPath = undefined;
    }
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  if (
    !sources['equipment/MiscType.java'] ||
    !sources['equipment/AmmoType.java']
  ) {
    throw new Error('Pinned archive is missing equipment factories');
  }
  await mkdir(new URL('.', cache), { recursive: true });
  await writeFile(cache, JSON.stringify(sources));
  return sources;
}

const stripComments = (java) =>
  java.replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (part) =>
    part.startsWith('"') ? part : ' ',
  );
export const normalize = (value) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

function advancementsIn(metadata, constants, context) {
  const advancements = {};
  for (const advance of metadata.matchAll(
    /\.set(IS|Clan)?Advancement\(([^)]+)\)/g,
  )) {
    const dates = advance[2].split(',').map((v) => {
      const token = v.trim();
      if (token === 'DATE_NONE') return null;
      if (/^\d+$/.test(token)) return Number(token);
      const constant = constants.get(
        token.includes('.') ? token : `ITechnology.${token}`,
      );
      if (constant !== undefined) return Number(constant);
      throw new Error(`Unsupported date ${token} in ${context}`);
    });
    if (advance[1]) advancements[advance[1]] = dates;
    else {
      advancements.IS = dates;
      advancements.Clan = dates;
    }
  }
  return advancements;
}

function bodyAt(java, start) {
  let depth = 1;
  let end = start;
  let quoted = false;
  for (; end < java.length && depth; end++) {
    if (java[end] === '"' && java[end - 1] !== '\\') quoted = !quoted;
    if (!quoted && java[end] === '{') depth++;
    if (!quoted && java[end] === '}') depth--;
  }
  return java.slice(start, end - 1);
}

export function parseSources(sources) {
  const constants = new Map();
  const classes = new Map();
  for (const [path, java] of Object.entries(sources)) {
    const owner = path.split('/').at(-1).replace('.java', '');
    for (const match of stripComments(java).matchAll(
      /\b(?:String|int)\s+(\w+)\s*=\s*("[^"]*"|-?\d+)\s*;/g,
    )) {
      constants.set(`${owner}.${match[1]}`, match[2].replace(/^"|"$/g, ''));
    }
    const clean = stripComments(java);
    const constructor = clean.match(
      new RegExp(`(?:public|protected)\\s+${owner}\\(\\)\\s*\\{`),
    );
    if (constructor)
      classes.set(owner, {
        path,
        parent: clean.match(/\bclass\s+\w+\s+extends\s+(\w+)/)?.[1],
        body: bodyAt(clean, constructor.index + constructor[0].length),
      });
  }
  function inheritedBody(owner, seen = new Set()) {
    if (!classes.has(owner) || seen.has(owner)) return '';
    seen.add(owner);
    const definition = classes.get(owner);
    return inheritedBody(definition.parent, seen) + '\n' + definition.body;
  }
  const records = [];
  for (const [path, raw] of Object.entries(sources)) {
    const factory = /^equipment\/(?:MiscType|AmmoType|ArmorType)\.java$/.test(
      path,
    );
    if (!factory && !path.startsWith('weapons/')) continue;
    const java = stripComments(raw);
    const className = path.split('/').at(-1).replace('.java', '');
    const expression = factory
      ? /(?:public|private|protected)\s+static\s+\w+\s+(create\w+)\(\)\s*\{/g
      : new RegExp(`public\\s+${className}\\(\\)\\s*\\{`, 'g');
    for (const method of java.matchAll(expression)) {
      const body = bodyAt(java, method.index + method[0].length);
      const key = factory ? method[1] : className;
      const names = [];
      for (const value of body.matchAll(
        /(?:\bname\s*=|setInternalName\(|addLookupName\()\s*("[^"\n]*"|[\w.]+)\s*[;)]/g,
      )) {
        const identity = value[1].startsWith('"')
          ? value[1].slice(1, -1)
          : constants.get(value[1]);
        if (identity) names.push(identity);
      }
      if (!names.length) continue;
      const metadata = factory ? body : inheritedBody(className);
      const advancements = advancementsIn(
        metadata,
        constants,
        `${path}#${key}`,
      );
      const tech = [
        ...metadata.matchAll(/\.setTechBase\(TechBase\.(IS|CLAN|ALL)\)/g),
      ].at(-1)?.[1];
      const weight = Number(body.match(/\btonnage\s*=\s*([\d.]+)/)?.[1]);
      const slots = Number(body.match(/\bcriticalSlots\s*=\s*(\d+)/)?.[1]);
      records.push({
        key,
        path,
        names,
        advancements,
        tech,
        weight,
        slots,
        kind: path.includes('AmmoType')
          ? 'ammunition'
          : factory
            ? 'misc'
            : 'weapon',
      });
    }
    if (path === 'equipment/AmmoType.java') {
      for (const mutator of java.matchAll(
        /\bMunitionMutator\s+(\w+)\s*=\s*new MunitionMutator\(/g,
      )) {
        const metadata = java.slice(
          mutator.index,
          java.indexOf(';', mutator.index),
        );
        records.push({
          key: mutator[1],
          path,
          names: [],
          kind: 'ammunition',
          tech: metadata.match(
            /new TechAdvancement\(TechBase\.(IS|CLAN|ALL)\)/,
          )?.[1],
          advancements: advancementsIn(metadata, constants, mutator[1]),
        });
      }
    }
  }
  return records;
}

export function availabilityFor(record, item) {
  const techBase =
    record.tech === 'CLAN'
      ? 'CLAN'
      : record.tech === 'IS'
        ? 'INNER_SPHERE'
        : item.techBase;
  const dates =
    record.advancements[techBase === 'CLAN' ? 'Clan' : 'IS'] ??
    record.advancements.Both;
  if (!dates) return null;
  const introductionYear = dates[1] ?? dates[2] ?? dates[0];
  if (introductionYear == null) return null;
  return {
    techBase,
    introductionYear,
    extinctionYear: dates[3] ?? undefined,
    reintroductionYear: dates[4] ?? undefined,
  };
}
