# Maintainer workflow

The repository uses the following GitHub configuration. Keep this document in sync with repository settings.

## Branching

Keep `main` as the integration branch. Work on short-lived `feat/*`, `fix/*`, `docs/*`, or `chore/*` branches and open focused pull requests. Do not introduce `develop` or permanent release branches until maintaining multiple supported release lines requires them.

- Squash merge is the enabled merge method; merged branches are deleted automatically.
- Main requires pull requests, resolved conversations, and linear history. Force pushes and branch deletion are blocked. The owner retains administrator bypass for maintenance.
- Add required CI checks only after the corresponding jobs exist and pass.
- No independent approval is required for self-authored PRs. Review external contributions before merging.
- Tag releases as `v0.x.y` after the release acceptance checks pass. Tags identify releases; they do not replace release notes or a backup/migration policy.

## Labels and triage

Use `bug`, `enhancement`, `documentation`, `help wanted`, `good first issue`, and `blocked`. Add `area:uploads`, `area:playback`, `area:library`, and `area:infra` only where useful.

Issue forms use the standard bug/enhancement labels; create them first if missing. Reserve `good first issue` for tasks with a clear expected result, relevant files, and a small scope. Do not apply it to security, migrations, or resumable upload correctness.

The initial tracked work is [first-run setup](https://github.com/bilalyazicioglu/keepsake/issues/2), [baseline CI](https://github.com/bilalyazicioglu/keepsake/issues/3), and [a reproducible demo](https://github.com/bilalyazicioglu/keepsake/issues/4). CI checks are not required yet; enable them after the first workflows pass.

## Release readiness

1. Decide and add a real license before advertising the project as open source.
2. Capture a real screenshot or demo using sample media you can redistribute.
3. Run a fresh-install check and a backup/restore check.
4. Verify persistence through restarts and upload recovery through interruption.
5. Record supported platforms, actual checks, known limitations, and breaking changes.

