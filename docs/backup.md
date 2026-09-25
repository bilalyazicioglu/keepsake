# Backing up and restoring

A Keepsake instance keeps its state in two places, and a backup needs both:

- the PostgreSQL database (accounts, library, albums, upload sessions), in the `pgdata` volume
- the media directory (originals, thumbnails, HLS renditions), in the `mediadata` volume

Also keep your `.env` file. If `JWT_SECRET` changes, everyone has to sign in again.

The commands below assume the Docker Compose setup from the README, run from the repository directory. Compose names volumes after the project, which is `outofmatrix` unless you override it; check with `docker volume ls`.

## Back up

Stop the app so no upload or processing job writes while you copy. The database can stay up.

```sh
mkdir -p backup
docker compose stop app

docker compose exec -T db \
  pg_dump -U mediauser -d mediacloud --clean --if-exists > backup/keepsake.sql

docker run --rm \
  -v outofmatrix_mediadata:/data:ro \
  -v "$PWD/backup":/backup \
  alpine tar czf /backup/media.tgz -C /data .

docker compose start app
```

`--clean --if-exists` makes the dump drop and recreate each table, so it restores cleanly into a database that already has the schema.

## Restore

On a new machine, or after removing the volumes:

```sh
docker compose create            # creates empty volumes

docker run --rm \
  -v outofmatrix_mediadata:/data \
  -v "$PWD/backup":/backup:ro \
  alpine tar xzpf /backup/media.tgz -C /data

docker compose up -d --wait db
docker compose exec -T db \
  psql -q -v ON_ERROR_STOP=1 -U mediauser -d mediacloud < backup/keepsake.sql

docker compose up -d app
```

`tar -p` keeps file ownership, so the app's non-root user can still read and write the media.

## What was verified

Before v0.1.0, the steps above were run against a fresh install that had 3 photos, 1 video, 1 audio track, and 1 video uploaded in resumable parts across a server restart:

- all volumes were removed, then restored from the backup
- all 6 items came back as ready, with thumbnails and HLS playback working
- the restored original of the resumed video had the same SHA-256 as the source file
- a session token issued before the backup kept working, because `JWT_SECRET` was unchanged
