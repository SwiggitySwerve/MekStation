/** Refusals use the sender port, even when new handlers merge cleanly. */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ERROR_FACTORY = /^(?:intentRefusalMessage|errorMessage|errorFrame)$/;
const FANOUT = /broadcast|fanout/i;

function callName(expression: ts.Expression): string {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  if (
    ts.isElementAccessExpression(expression) &&
    expression.argumentExpression &&
    ts.isStringLiteral(expression.argumentExpression)
  )
    return expression.argumentExpression.text;
  return '';
}

function scopeOf(node: ts.Node): ts.Node {
  let scope = node.parent;
  while (
    scope &&
    !ts.isSourceFile(scope) &&
    !ts.isBlock(scope) &&
    !ts.isFunctionLike(scope)
  )
    scope = scope.parent;
  return scope;
}

function isFanout(call: ts.CallExpression): boolean {
  const name = callName(call.expression);
  if (FANOUT.test(name)) return true;
  if (!/^(?:send|safeSend)$/.test(name)) return false;
  for (let node: ts.Node | undefined = call.parent; node; node = node.parent) {
    if (ts.isForOfStatement(node) || ts.isForInStatement(node)) return true;
    if (
      ts.isCallExpression(node) &&
      /^(?:forEach|map)$/.test(callName(node.expression))
    )
      return true;
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) break;
  }
  return false;
}

/** Small syntax/data-flow guard, not a whole-program alias analysis. */
function errorFanouts(source: string, fileName = 'server.ts'): string[] {
  const file = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const bindings = new Map<ts.Node, Map<string, ts.Node>>();
  const factories = new Set<string>();
  const calls: ts.CallExpression[] = [];
  function collect(node: ts.Node): void {
    if (
      (ts.isVariableDeclaration(node) ||
        ts.isParameter(node) ||
        ts.isFunctionDeclaration(node)) &&
      node.name &&
      ts.isIdentifier(node.name)
    ) {
      const scope = scopeOf(node);
      const names = bindings.get(scope) ?? new Map<string, ts.Node>();
      names.set(node.name.text, node);
      bindings.set(scope, names);
    }
    if (
      ts.isImportSpecifier(node) &&
      ERROR_FACTORY.test((node.propertyName ?? node.name).text)
    )
      factories.add(node.name.text);
    if (ts.isCallExpression(node)) calls.push(node);
    ts.forEachChild(node, collect);
  }
  collect(file);

  function binding(name: string, reference: ts.Node): ts.Node | undefined {
    for (let node: ts.Node | undefined = reference; node; node = node.parent) {
      const found = bindings.get(node)?.get(name);
      if (found) return found;
    }
    return undefined;
  }
  function isError(
    node: ts.Node | undefined,
    seen = new Set<ts.Node>(),
  ): boolean {
    if (!node || seen.has(node)) return false;
    const next = new Set(seen).add(node);
    if (ts.isStringLiteral(node)) return node.text === 'Error';
    if (
      ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isNonNullExpression(node)
    )
      return isError(node.expression, next);
    if (ts.isIdentifier(node)) return isError(binding(node.text, node), next);
    if (ts.isVariableDeclaration(node) || ts.isParameter(node))
      return isError(node.initializer, next) || isError(node.type, next);
    if (ts.isTypeLiteralNode(node))
      return node.members.some(
        (member) =>
          ts.isPropertySignature(member) &&
          member.name.getText(file).replace(/['"]/g, '') === 'kind' &&
          isError(member.type, next),
      );
    if (ts.isLiteralTypeNode(node)) return isError(node.literal, next);
    if (
      ts.isTypeReferenceNode(node) &&
      node.typeName.getText(file) === 'Extract'
    )
      return isError(node.typeArguments?.[1], next);
    if (ts.isObjectLiteralExpression(node))
      return node.properties.some((property) =>
        ts.isSpreadAssignment(property)
          ? isError(property.expression, next)
          : ts.isPropertyAssignment(property) &&
            property.name.getText(file).replace(/['"]/g, '') === 'kind' &&
            isError(property.initializer, next),
      );
    if (ts.isConditionalExpression(node))
      return isError(node.whenTrue, next) || isError(node.whenFalse, next);
    if (ts.isArrayLiteralExpression(node))
      return node.elements.some((element) => isError(element, next));
    if (ts.isCallExpression(node)) {
      const name = callName(node.expression);
      if (node.expression.getText(file) === 'JSON.stringify')
        return isError(node.arguments[0], next);
      return (
        ERROR_FACTORY.test(name) ||
        factories.has(name) ||
        isError(binding(name, node), next)
      );
    }
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node)
    ) {
      if (isError(node.type, next)) return true;
      if (!node.body) return false;
      if (!ts.isBlock(node.body)) return isError(node.body, next);
      let found = false;
      function returned(child: ts.Node): void {
        if (ts.isReturnStatement(child))
          found ||= isError(child.expression, next);
        else if (!ts.isFunctionLike(child)) ts.forEachChild(child, returned);
      }
      returned(node.body);
      return found;
    }
    return false;
  }

  return calls
    .filter(
      (call) =>
        isFanout(call) && call.arguments.some((argument) => isError(argument)),
    )
    .map(
      (call) =>
        `${fileName}:${file.getLineAndCharacterOfPosition(call.getStart(file)).line + 1}: ${call.getText(file)}`,
    );
}

function serverFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory())
      return /^(?:__tests__|__mocks__|test|tests|fixtures|__fixtures__)$/.test(
        entry.name,
      )
        ? []
        : serverFiles(full);
    return /\.[cm]?[jt]sx?$/.test(entry.name) &&
      !/\.(?:test|spec|cases|test-helpers|fixtures)\./.test(entry.name) &&
      !entry.name.endsWith('.d.ts')
      ? [full]
      : [];
  });
}

describe('multiplayer server refusal fan-out guard', () => {
  it.each([
    'ctx.broadcast(errorMessage(matchId, code, reason));',
    "const err = { kind: 'Error', reason }; ctx.broadcast(err);",
    'const err = errorMessage(matchId, code, reason); const reply = err; broadcast(reply);',
    "const err = { ...errorMessage(matchId, code, reason), intentId }; ctx['broadcast'](err);",
    "import { intentRefusalMessage as refusal } from './intentRefusal'; fanOut(refusal(id, code, reason));",
    "function refusal() { return { kind: 'Error' }; } ctx.broadcast(refusal());",
    "const refusal = (): Extract<IServerMessage, { kind: 'Error' }> => makeReply(); ctx.broadcast(refusal());",
    "broadcast(matchId, [{ kind: 'Error' }]);",
    'const err = errorMessage(id, code, reason); for (const socket of sockets) socket.send(JSON.stringify(err));',
    "sockets.forEach(socket => safeSend(socket, { kind: 'Error' }));",
  ])('rejects Error fan-out: %s', (source) => {
    expect(errorFanouts(source)).toHaveLength(1);
  });

  it('allows public broadcasts, sender replies, comments and unrelated scoped bindings', () => {
    expect(
      errorFanouts(`
      // ctx.broadcast(errorMessage(...)) is forbidden.
      const example = "broadcast({ kind: 'Error' })";
      ctx.broadcast({ kind: 'Event', event });
      broadcast(matchId, { kind: 'LobbyUpdated', meta });
      ctx.broadcast({ kind: 'MatchPaused', pendingSlots });
      ctx.broadcast({ kind: 'Close', reason: 'shutdown' });
      sockets.forEach(socket => safeSend(socket, { kind: 'Close' }));
      for (const socket of sockets) socket.send(JSON.stringify({ kind: 'Event', event }));
      for (let attempt = 0; attempt < 3; attempt++) safeSend(sender, { kind: 'Error' });
      ctx.sendRefusal(errorMessage(matchId, code, reason));
      function refuse() { const message = { kind: 'Error' }; ctx.sendRefusal(message); }
      function publish() { const message = { kind: 'Event' }; ctx.broadcast(message); }
    `),
    ).toEqual([]);
  });

  it('contains zero Error broadcasts or fan-outs in non-test server source', () => {
    const files = serverFiles(path.resolve(__dirname, '..'));
    expect(files.length).toBeGreaterThan(0);
    expect(
      files.some((file) => path.basename(file) === 'ServerMatchHostIntent.ts'),
    ).toBe(true);
    expect(
      files.flatMap((file) => errorFanouts(readFileSync(file, 'utf8'), file)),
    ).toEqual([]);
  });
});
