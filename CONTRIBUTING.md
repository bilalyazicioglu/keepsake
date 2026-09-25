# Contributing to outofmatrix

Start with a reproducible bug or a concrete use case. Small fixes can go straight to a pull request; discuss larger changes in an issue first.

## Working on a change

1. Fork the repository and branch from current `main`.
2. Use a short descriptive branch such as `fix/upload-retry`, `feat/album-sort`, or `docs/local-setup`.
3. Keep the pull request focused on one outcome.
4. Update relevant documentation and add regression coverage for behavior changes where practical.
5. Explain what you tested and what remains untested. Attach screenshots for interface changes.

Follow existing formatting and naming conventions. Avoid unrelated refactors and generated frontend output unless the change requires it.

## Local checks

Backend:

```sh
go test ./...
go vet ./...
go build ./cmd/server
```

Frontend, from `web/`:

```sh
npm install
npm run lint
npm run build
```

Use `npm ci` instead of `npm install` when the committed lockfile has been verified. A successful test command with no test files is not regression coverage. The current frontend package does not define `npm test`; do not report a nonexistent suite as passing.

For upload or playback changes, also exercise the flow with a small non-sensitive sample file and describe the environment. Do not attach personal media or credentials to reports.

## Review and merge

The maintainer reviews external contributions. Pull requests merge into `main`, normally by squash merge, and merged branches can be removed. Required checks must refer to CI jobs that actually exist and pass.

Be respectful and keep feedback about the work. Unclear reports are welcome; we can narrow them down together.
