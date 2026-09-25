# Contributing to Keepsake

Start with a reproducible bug or a concrete use case. Small fixes can go straight to a pull request; discuss larger changes in an issue first.

## Working on a change

1. Fork the repository and branch from current `main`.
2. Use a short descriptive branch such as `fix/upload-retry`, `feat/album-sort`, or `docs/local-setup`.
3. Keep the pull request focused on one outcome.
4. Update relevant documentation and add regression coverage for behavior changes where practical.
5. Explain what you tested and what remains untested. Attach screenshots for interface changes.

Follow existing formatting and naming conventions. Avoid unrelated refactors and generated frontend output unless the change requires it.

## Local checks

CI runs these on every pull request. Run them locally first.

Backend:

```sh
gofmt -l .
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

Use Node 22 and `npm ci` to install exactly what the lockfile pins. A successful test command with no test files is not regression coverage. The current frontend package does not define `npm test`; do not report a nonexistent suite as passing.

For upload or playback changes, also exercise the flow with a small non-sensitive sample file and describe the environment. Do not attach personal media or credentials to reports.

## Review and merge

The maintainer reviews external contributions. Pull requests merge into `main` by squash merge, so the pull request title becomes the commit message: make it describe the change. The Backend, Frontend and Docker image checks must pass.

Follow the [code of conduct](CODE_OF_CONDUCT.md) and keep feedback about the work. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md). Unclear reports are welcome; we can narrow them down together.
