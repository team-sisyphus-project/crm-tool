# Upstream

This repository is a **private mirror** of [marmelab/atomic-crm](https://github.com/marmelab/atomic-crm).
Because a true GitHub fork becomes public when the original is public, we brought it in by replicating the full history as-is.
Consequently, the `forked from` badge is not shown in the GitHub UI.

- Mirror base commit: `167a4cdb` (upstream `main`, 2026-07-27)
- What was brought in: the full history of the `main` branch (1,634 commits), tags `v1.0.0` / `v1.5.0`
- What was not brought in: upstream's working branches (`feat/*`, `fix/*`, `dependabot/*`, etc.). They can be fetched at any time via the remote below if needed

## Upstream sync

The `upstream` remote is already configured (push is blocked).

```bash
git fetch upstream
git log --oneline main..upstream/main   # check newly landed changes
git merge upstream/main                 # or cherry-pick only the commits you need
```

## License

The original is MIT licensed. Do not remove the original copyright notice (Marmelab) in `LICENSE.md`.
When adding our own code, append to it while keeping the existing notice intact.
