# Maintainer workflow

This file documents settings to apply in GitHub. Adding it does not activate branch protection, create labels, or create issues.

## Branching

Keep `main` as the integration branch. Work on short-lived `feat/*`, `fix/*`, `docs/*`, or `chore/*` branches and open focused pull requests. Do not introduce `develop` or permanent release branches until maintaining multiple supported release lines requires them.

- Prefer squash merges with descriptive titles.
- Require PRs into main, resolve conversations, block force pushes and branch deletion.
- Add required CI checks only after the corresponding jobs exist and pass.
- For a solo maintainer, do not require an independent approval on every self-authored PR: it would block normal work. Review external PRs yourself.
- Tag releases as `v0.x.y` after the release acceptance checks pass. Tags identify releases; they do not replace release notes or a backup/migration policy.

## Labels and triage

Use `bug`, `enhancement`, `documentation`, `help wanted`, `good first issue`, and `blocked`. Add `area:uploads`, `area:playback`, `area:library`, and `area:infra` only where useful.

Issue forms use the standard bug/enhancement labels; create them first if missing. Reserve `good first issue` for tasks with a clear expected result, relevant files, and a small scope. Do not apply it to security, migrations, or resumable upload correctness.

Start with one board: Backlog → Ready → In progress → Done. Use milestones for outcomes, not a calendar of promised dates.

## Release readiness

1. Decide and add a real license before advertising the project as open source.
2. Capture a real screenshot or demo using sample media you can redistribute.
3. Run a fresh-install check and a backup/restore check.
4. Verify persistence through restarts and upload recovery through interruption.
5. Record supported platforms, actual checks, known limitations, and breaking changes.

