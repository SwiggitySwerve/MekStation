export function applyFixes(content, violations, config) {
  let modifiedContent = content;
  let fixedCount = 0;

  for (const violation of sortViolationsForFix(violations)) {
    if (!violation.fixable) continue;

    const lines = modifiedContent.split('\n');
    const lineIndex = violation.line - 1;
    if (lineIndex < 0 || lineIndex >= lines.length) continue;

    const fixedLine = fixViolationLine(lines[lineIndex], violation, config);
    if (!fixedLine) continue;

    lines[lineIndex] = fixedLine;
    modifiedContent = lines.join('\n');
    fixedCount++;
  }

  return { content: modifiedContent, fixed: fixedCount };
}

function sortViolationsForFix(violations) {
  return [...violations].sort((a, b) => {
    if (a.line !== b.line) return b.line - a.line;
    return b.column - a.column;
  });
}

function fixViolationLine(line, violation, config) {
  return (
    fixDeprecatedTermLine(line, violation, config) ??
    fixPropertyViolationLine(line, violation, config) ??
    fixCapitalizationLine(line, violation, config)
  );
}

function fixDeprecatedTermLine(line, violation, config) {
  const term = config.deprecatedTerms.find((item) => item.id === violation.ruleId);
  if (!term) return undefined;

  const smartFixed = applySmartReplacement(line, term, config);
  if (smartFixed) return smartFixed;

  const regex = new RegExp(term.pattern, term.flags || 'gi');
  return regex.test(line) ? line.replace(regex, term.canonical) : undefined;
}

function applySmartReplacement(line, term, config) {
  if (!term.preserveCase) return undefined;

  const replacements = config.smartReplacements[term.deprecated.toLowerCase()];
  if (!replacements) return undefined;

  let fixedLine = line;
  let changed = false;
  for (const [search, replace] of Object.entries(replacements)) {
    if (!fixedLine.includes(search)) continue;
    fixedLine = fixedLine.replace(new RegExp(escapeRegex(search), 'g'), replace);
    changed = true;
  }
  return changed ? fixedLine : undefined;
}

function fixPropertyViolationLine(line, violation, config) {
  const prop = config.propertyViolations.find((item) => item.id === violation.ruleId);
  const propMatch = violation.found.match(/^(\s*(?:readonly\s+)?)\w+:/);
  if (!prop || !propMatch) return undefined;

  const prefix = propMatch[1];
  return line.replace(violation.found, `${prefix}${prop.canonical}`);
}

function fixCapitalizationLine(line, violation, config) {
  const rule = config.capitalizationRules.find(
    (item) => item.id === violation.ruleId,
  );
  if (!rule || rule.canonical.includes(' or ')) return undefined;

  return line.replace(new RegExp(rule.pattern, 'g'), rule.canonical);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
