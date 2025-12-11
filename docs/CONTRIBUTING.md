# Contributing to MekStation

Thank you for your interest in contributing to the MekStation project!

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions. We're all here to build something great together.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Follow the [Getting Started](./development/getting-started.md) guide
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Workflow

### Before Making Changes

1. Check [`openspec/specs/`](../openspec/specs/) for relevant domain specifications
2. Review [`.cursorrules`](../.cursorrules) for coding standards
3. Run `npx openspec list` to see any active changes

### Making Changes

1. Follow the [Coding Standards](./development/coding-standards.md)
2. For significant features, create an OpenSpec change proposal first
3. Write tests for new functionality
4. Ensure `npm run build` passes without errors
5. Ensure `npm run lint` passes

### Submitting Changes

1. Commit with clear, descriptive messages
2. Push to your fork
3. Open a Pull Request with:
   - Clear description of what changed
   - Link to any related OpenSpec proposal
   - Screenshots if UI changes are involved

## OpenSpec Workflow

For significant changes, use the OpenSpec proposal process:

```bash
# Check existing specs
npx openspec list --specs

# Create a change proposal
mkdir -p openspec/changes/your-change-id/specs

# Validate your proposal
npx openspec validate your-change-id --strict
```

See [`openspec/AGENTS.md`](../openspec/AGENTS.md) for the complete workflow.

## Questions?

Open a GitHub issue for questions or clarifications before starting work on large features.

