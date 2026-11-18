/** Reconciliation's API/cache boundary and journal of actual status changes. */
export function reconciliationPublisher({
  github,
  core,
  admitSuccess,
  readFailure,
}) {
  const cache = new Map(),
    writes = [];
  let number,
    start = 0;
  const once = (key, read) => {
    if (!cache.has(key))
      cache.set(
        key,
        Promise.resolve()
          .then(read)
          .catch((error) => {
            cache.delete(key);
            throw error;
          }),
      );
    return cache.get(key);
  };
  const repos = github.rest.repos;
  const scope = (context, sha) =>
    writes
      .slice(start)
      .filter((write) => write.context === context && write.sha === sha);
  async function currentStatus(args) {
    for (let page = 1; ; page++) {
      const { data } = await repos.getCombinedStatusForRef({
        owner: args.owner,
        repo: args.repo,
        ref: args.sha,
        per_page: 100,
        page,
      });
      if (!Array.isArray(data.statuses))
        throw new Error('Current status census unavailable');
      const current = data.statuses.find(
        (status) => status.context === args.context,
      );
      if (current || data.statuses.length < 100)
        return current?.state ?? 'missing';
    }
  }
  function settle(records, actual, corrected) {
    for (const write of records) {
      if (
        !write.acknowledged &&
        write.after === actual &&
        write.before !== actual
      )
        write.acknowledged = true;
      write.verified = true;
      write.corrected = corrected;
      delete write.problem;
    }
    if (corrected)
      core.info(
        `PR #${number}: ${records[0].context} (${records[0].sha}) corrected successfully and verified as ${actual}`,
      );
  }
  function observePolicyResult(records, actual, expected, corrected) {
    if (actual === expected) {
      settle(records, actual, corrected);
      return true;
    }
    if (
      expected === 'success' &&
      ['pending', 'failure', 'error'].includes(actual)
    ) {
      // The policy verified our success, then another publisher replaced it
      // with a blocking state. Do not overwrite its pending/error with failure.
      settle(records, actual, false);
      for (const write of records) write.supersededBy = actual;
      core.info(
        `PR #${number}: verified success superseded by ${actual}; no correction write`,
      );
      return true;
    }
    return false;
  }
  const client = {
    ...github,
    rest: {
      ...github.rest,
      repos: {
        ...repos,
        get: (args) =>
          once(`repo:${args.owner}/${args.repo}`, () => repos.get(args)),
        getContent: (args) =>
          /^[a-f0-9]{40}$/.test(args.ref)
            ? once(
                `blob:${args.owner}/${args.repo}/${args.path}@${args.ref}`,
                () => repos.getContent(args),
              )
            : repos.getContent(args),
        createCommitStatus: async (args) => {
          // Infrastructure read failures are not policy verdicts. Before any
          // write, report them as unreached instead of inventing a failure.
          if (readFailure() && writes.length === start) throw readFailure();
          const before = await currentStatus(args);
          if (before === args.state) {
            core.info(
              `PR #${number}: ${args.context} (${args.sha}) ${args.state}: confirmed, no write`,
            );
            return { data: args };
          }
          if (
            args.state === 'success' &&
            !['failure', 'error'].includes(before)
          ) {
            core.info(
              `PR #${number}: ${args.context} (${args.sha}): policy passed; no stale red to clear, no write`,
            );
            return { data: args };
          }
          if (args.state === 'success') admitSuccess();
          const write = {
            number,
            sha: args.sha,
            context: args.context,
            before,
            after: args.state,
            args,
            acknowledged: false,
            verified: false,
          };
          writes.push(write);
          try {
            const response = await repos.createCommitStatus(args);
            write.acknowledged = true;
            core.info(
              `PR #${number}: ${args.context} (${args.sha}) ${before} -> ${args.state}: ${args.description}`,
            );
            return response;
          } catch (error) {
            write.problem = error.message;
            throw error;
          }
        },
      },
    },
  };
  async function verify({ context, sha, state, corrected }) {
    const records = scope(context, sha).filter((write) => !write.verified);
    if (!records.length) return;
    for (const write of records) {
      write.policyState = state;
      write.policyCorrected = corrected;
    }
    try {
      const actual = await currentStatus(records.at(-1).args);
      if (!observePolicyResult(records, actual, state, corrected))
        throw new Error(
          `Status readback is ${actual}; policy required ${state}`,
        );
    } catch (error) {
      for (const write of records) write.problem = error.message;
    }
  }
  async function finish() {
    const groups = new Map();
    for (const write of writes.slice(start).filter((entry) => !entry.verified))
      groups.set(`${write.sha}:${write.context}`, write);
    const problems = [];
    for (const last of groups.values()) {
      try {
        const actual = await currentStatus(last.args);
        const records = scope(last.context, last.sha);
        if (
          last.after === 'success' &&
          observePolicyResult(
            records,
            actual,
            last.policyState,
            last.policyCorrected ?? false,
          )
        )
          continue;
        if (actual === 'failure') {
          settle(
            records,
            actual,
            actual === 'failure' &&
              records.some(
                (write) => write.after === 'success' && write.acknowledged,
              ),
          );
          continue;
        }
        if (
          !records.some((write) => write.acknowledged) &&
          actual === records[0].before
        ) {
          for (const write of records) write.verified = true;
          continue;
        }
        if (actual === last.after) last.acknowledged = true;
        // Only the policy's write/verify/correct path decides a replacement
        // state. Bookkeeping must not invent failure after a lost ACK.
        throw new Error(
          `Issued write remains ${actual} without completed policy verification/correction`,
        );
      } catch (error) {
        const records = scope(last.context, last.sha);
        if (
          records.some(
            (write) => write.acknowledged || write.after === 'success',
          )
        )
          problems.push({
            context: last.context,
            sha: last.sha,
            reason: `${last.problem ?? 'write not verified'}; ${error.message}`,
          });
      }
    }
    return problems;
  }
  return {
    client,
    writes,
    begin(pr) {
      number = pr;
      start = writes.length;
    },
    verify,
    finish,
  };
}
