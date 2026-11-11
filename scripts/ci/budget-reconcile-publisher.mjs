/** Only immutable SHA blobs and repository metadata can be reused. */
export function reconciliationClient(github, core, number, admitSuccess) {
  const cache = new Map();
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
  return {
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
          // Combined status contains the latest state of each context, rather
          // than every historical write. Paginate if there are >100 contexts.
          let current;
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
            current = data.statuses.find(
              (status) => status.context === args.context,
            );
            if (current || data.statuses.length < 100) break;
          }
          if (current?.state === args.state) {
            core.info(
              `PR #${number()}: ${args.context} (${args.sha}) ${args.state}: confirmed, no write`,
            );
            return { data: args };
          }
          if (
            args.state === 'success' &&
            !['failure', 'error'].includes(current?.state)
          ) {
            core.info(
              `PR #${number()}: ${args.context} (${args.sha}): policy passed; no stale red to clear, no write`,
            );
            return { data: args };
          }
          if (args.state === 'success') admitSuccess();
          const response = await repos.createCommitStatus(args);
          core.info(
            `PR #${number()}: ${args.context} (${args.sha}) ${current?.state ?? 'missing'} -> ${args.state}: ${args.description}`,
          );
          return response;
        },
      },
    },
  };
}
