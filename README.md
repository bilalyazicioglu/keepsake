# outofmatrix

A home for your photos, music, and videos. Hosted by you.

outofmatrix is a personal media library with a Go backend and a React interface. Upload your files, organize them into albums and playlists, and browse or play them from your browser.

## Status

Early development. Expect changes to the API and deployment setup. Keep a separate backup of original media.

## What it does

- Uploads media in resumable chunks.
- Extracts media metadata and generates thumbnails and BlurHash placeholders.
- Processes video into HLS renditions for browser playback.
- Organizes media with albums, playlists, favorites, and title search.
- Reports upload and processing progress in the interface.

## Try it locally

Requires Docker with Compose and OpenSSL for generating a secret.

```sh
git clone https://github.com/bilalyazicioglu/outofmatrix.git outofmatrix
cd outofmatrix
cp .env.example .env
openssl rand -hex 32
```

Set `JWT_SECRET` in `.env` to the generated value, and keep that value across restarts. Review the other configuration values, then start the stack:

```sh
docker compose up --build -d
```

Open **http://localhost:8080**, create an account, and upload a sample file.

The current Compose file is a development setup: it publishes ports 8080 and 5432 and contains development database credentials. Review its bindings, credentials, and TLS setup before exposing an instance outside your machine.

The `pgdata` volume holds the database and `mediadata` holds uploaded media. Back up both; do not remove these volumes when updating.

## Development

Use the Go version declared in `go.mod` and a Node version supported by the frontend's installed Vite version. Local backend development also needs PostgreSQL and FFmpeg/ffprobe.

```sh
make db-up
make web
```

Configure and export the environment variables from `.env.example` for a locally running server, then:

```sh
make run
```

For frontend work, use `make web-dev` in another terminal. The Vite development server proxies API requests to the Go server.

## How it fits together

```text
Browser → Go API → PostgreSQL
             ↓
       media storage
             ↓
       FFmpeg workers → thumbnails and HLS renditions
```

The Go server serves the built frontend. PostgreSQL and FFmpeg remain runtime dependencies; this is not a dependency-free single-binary deployment.

| Path | Responsibility |
|---|---|
| `cmd/server` | Application startup and lifecycle |
| `internal/domain` | Domain models and repository interfaces |
| `internal/usecase` | Application logic |
| `internal/repository` | PostgreSQL adapters |
| `internal/delivery/http` | HTTP handlers and middleware |
| `internal/worker` | Background processing |
| `pkg/ffmpeg` | FFmpeg and ffprobe integration |
| `web` | React frontend |
| `migrations` | Database schema |

See [configuration and API notes](docs/reference.md) for the current endpoints and settings.

## Contributing

Bug reports, focused fixes, and documentation improvements are welcome. For larger changes, open a proposal first so we can agree on scope. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

A license has not yet been selected. Public source availability alone does not grant permission to reuse or redistribute the code.
