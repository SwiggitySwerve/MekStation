export interface DeprecatedTerm {
  id: string;
  deprecated: string;
  canonical: string;
  severity: 'error' | 'warning';
  category: string;
  pattern: string;
  flags?: string;
  preserveCase?: boolean;
  context?: string;
  note?: string;
  skipContexts?: string[];
}

export interface PropertyViolation {
  id: string;
  pattern: string;
  canonical: string;
  severity: 'error' | 'warning';
  context?: string;
}

export interface CapitalizationRule {
  id: string;
  pattern: string;
  canonical: string;
  severity: 'error' | 'warning';
  context?: string;
}

export interface SkipPatterns {
  lines: string[];
  contexts: Record<string, string[]>;
}

export interface FilePatterns {
  specs: string[];
  source: string[];
  exclude: string[];
}

export interface SmartReplacements {
  [key: string]: Record<string, string>;
}

export interface TerminologyConfig {
  version: string;
  description: string;
  lastUpdated: string;
  deprecatedTerms: DeprecatedTerm[];
  propertyViolations: PropertyViolation[];
  capitalizationRules: CapitalizationRule[];
  skipPatterns: SkipPatterns;
  filePatterns: FilePatterns;
  smartReplacements: SmartReplacements;
}

export interface Violation {
  file: string;
  line: number;
  column: number;
  type: 'deprecated-term' | 'property-naming' | 'capitalization';
  severity: 'error' | 'warning';
  ruleId: string;
  found: string;
  canonical: string;
  context?: string;
  lineText: string;
  fixable: boolean;
}

export interface FileResult {
  file: string;
  violations: Violation[];
  fixed: number;
  wasModified: boolean;
}

export interface RunResult {
  filesScanned: number;
  filesWithViolations: number;
  totalViolations: number;
  totalErrors: number;
  totalWarnings: number;
  totalFixed: number;
  results: FileResult[];
}

export interface CliOptions {
  command: 'validate' | 'fix' | 'report';
  fix: boolean;
  dryRun: boolean;
  json: boolean;
  changedOnly: boolean;
  source: boolean;
  specsOnly: boolean;
  strict: boolean;
  verbose: boolean;
  configPath?: string;
  targetPath?: string;
}

export interface LineContext {
  inCodeBlock: boolean;
  inTypeScriptBlock: boolean;
  isComment: boolean;
  isDeprecatedExample: boolean;
  isComparison: boolean;
  isRuleDescription: boolean;
  isRationale: boolean;
  isChangelog: boolean;
  isWhenClause: boolean;
  isUserAction: boolean;
}
