import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import ts from 'typescript';

import {
  CONTRACT_LIFECYCLE_RULES,
  CURRENT_LIFECYCLE_RULES_WRITER,
  getContractLifecyclePolicy,
  hasContractLifecycleRule,
} from '../ContractLifecycleRules';

describe('contract lifecycle version owner', () => {
  it('keeps the writer dark and every new rule off legacy', () => {
    expect(CURRENT_LIFECYCLE_RULES_WRITER).toBe(1);
    expect(getContractLifecyclePolicy(2)).toEqual({
      kind: 'staged',
      version: 2,
    });
    for (const rule of Object.keys(
      CONTRACT_LIFECYCLE_RULES,
    ) as (keyof typeof CONTRACT_LIFECYCLE_RULES)[]) {
      expect(CONTRACT_LIFECYCLE_RULES[rule].introducedIn).toBe(2);
      for (const version of [undefined, 1, 3])
        expect(
          hasContractLifecycleRule({ lifecycleRulesVersion: version }, rule),
        ).toBe(false);
      expect(hasContractLifecycleRule({ lifecycleRulesVersion: 2 }, rule)).toBe(
        true,
      );
    }
  });

  it('forbids numeric lifecycle cutoffs outside the owner', () => {
    const root = join(process.cwd(), 'src');
    const violations: string[] = [];
    function scan(dir: string): void {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '__tests__') continue;
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(path);
          continue;
        }
        if (
          !/\.tsx?$/.test(path) ||
          /\.(test|spec)\.tsx?$/.test(path) ||
          entry.name === 'ContractLifecycleRules.ts'
        )
          continue;
        const source = readFileSync(path, 'utf8');
        if (/from\s+['"][^'"]*contractCompletion['"]/.test(source)) {
          violations.push(
            `${relative(root, path)}: production completion caller in S1`,
          );
        }
        if (!source.includes('lifecycleRulesVersion')) continue;
        const file = ts.createSourceFile(
          path,
          source,
          ts.ScriptTarget.Latest,
          true,
        );
        function visit(node: ts.Node): void {
          if (
            ts.isBinaryExpression(node) &&
            /lifecycleRulesVersion/.test(node.getText(file)) &&
            ((ts.isNumericLiteral(node.left) &&
              node.right.getText(file).includes('lifecycleRulesVersion')) ||
              (ts.isNumericLiteral(node.right) &&
                node.left.getText(file).includes('lifecycleRulesVersion')))
          ) {
            violations.push(
              `${relative(root, path)}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1}`,
            );
          }
          ts.forEachChild(node, visit);
        }
        visit(file);
      }
    }
    scan(root);
    expect(violations).toEqual([]);
  });
});
