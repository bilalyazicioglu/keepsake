# Configuration and API notes

These notes preserve the current repository documentation while the README becomes shorter. Implementation details should be verified when changing behavior.

## Configuration

See `.env.example` and `docker-compose.yml` together; Compose may override application defaults.

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Persistent signing secret |
| `MAX_WORKERS` | Concurrent processing jobs; Compose currently sets 2 |
| `JOB_QUEUE_SIZE` | Processing queue capacity |
| `HWACCEL` | Encoder selection: auto, videotoolbox, or none |
| `MAX_UPLOAD_BYTES` | Upload size limit; Compose currently sets 10 GiB |
| `UPLOAD_TTL` | Lifetime of abandoned upload sessions |
| `PROCESS_TIMEOUT` | Maximum processing time per job |
| `STORAGE_PATH` | Media storage location |
| `DATABASE_URL` | PostgreSQL connection |

## API groups

All paths below have the `/api/v1` prefix.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | Account creation and login |
| GET | `/ws` | Processing events |
| POST | `/uploads` | Open a resumable upload session |
| GET | `/uploads/{id}` | Query received chunks |
| PUT | `/uploads/{id}/chunks/{index}` | Upload a chunk |
| POST | `/uploads/{id}/complete` | Complete upload and queue processing |
| DELETE | `/uploads/{id}` | Abort an upload |
| POST | `/media/upload` | Legacy multipart upload |
| GET | `/media` | Paginated library with filters and sorting |
| GET, PATCH, DELETE | `/media/{id}` | Read, update title/favorite, or delete an item |
| GET | `/media/raw/{id}` | Original media with HTTP Range support |
| GET | `/media/thumb/{id}` | Thumbnail |
| GET | `/media/stream/{id}/master.m3u8` | HLS master playlist |
| GET | `/media/stream/{id}/index_1080p.m3u8` | Rendition playlist example |
| GET | `/media/stream/{id}/{segment}.ts` | HLS segment |
| POST, GET | `/collections` | Create or list albums/playlists |
| GET, DELETE | `/collections/{id}` | Collection details |
| POST | `/collections/{id}/items` | Add an item with position |
| DELETE | `/collections/{id}/items/{mediaID}` | Remove an item |

Media and collection routes use bearer authentication. The existing documentation also describes query-string JWTs for image/video/HLS requests. Treat these URLs as credentials and redact them from reports; improving playback token scope is a proposed backlog item.

## Processing

The documented pipeline writes upload chunks to a staging file, queues completed uploads, probes metadata, produces thumbnails and video renditions, and reports progress over WebSocket. The current README describes restart recovery and a hardware-encoder fallback; regression tests for these paths belong in the reliability milestone.
