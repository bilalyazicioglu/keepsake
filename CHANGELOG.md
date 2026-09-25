# Changelog

Notable changes to Keepsake. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/). Until 1.0, minor versions may include breaking changes.

## Unreleased

## [0.1.0] - 2026-09-25

The first tagged release. Keepsake stores photos, videos and music on your own server, with resumable uploads, HLS streaming, albums and favorites.

### Tested

Checked on a fresh clone of this version, with the Docker Compose setup on macOS (Apple silicon, Docker Desktop 28, `linux/arm64` image) and Chromium:

- Fresh install following the README: healthy in about 30 seconds; photos, video and audio upload and process; video streams over HLS.
- Data survives a full `docker compose down` and `up`, including signed-in sessions.
- An upload interrupted by killing the server resumes from the parts already received, and the stored original matches the source byte for byte.
- Backup and restore following [docs/backup.md](docs/backup.md) onto empty volumes brings back every item, thumbnail and stream.

CI builds and tests on `linux/amd64`. Safari, Firefox and hardware encoding (VideoToolbox) were not tested for this release.

### Known limitations

- Media URLs carry the session token as a query parameter ([#14](https://github.com/bilalyazicioglu/keepsake/issues/14)).
- Upload and processing edge cases under failure are still open ([#7](https://github.com/bilalyazicioglu/keepsake/issues/7) to [#12](https://github.com/bilalyazicioglu/keepsake/issues/12)).
- Anyone who can reach the server can create an account, and there is no admin screen ([#41](https://github.com/bilalyazicioglu/keepsake/issues/41)).
- Failed sign-ins are not rate-limited ([#39](https://github.com/bilalyazicioglu/keepsake/issues/39)).
- The Compose file is a development setup with default database credentials.

### Upgrading from an untagged build

- The server now refuses to start if an environment variable can't be parsed. Fix the variable named in the error.
- Building from source needs Go 1.26.
- Your volumes and `.env` carry over; no manual migration is needed.

### Added

- New interface: sidebar with Library, Favorites and albums, month-grouped library, window-wide drop target and upload tray, and the Keepsake logo ([#34](https://github.com/bilalyazicioglu/keepsake/pull/34)).
- Continuous integration for the backend, the web interface and the Docker image ([#15](https://github.com/bilalyazicioglu/keepsake/pull/15)).
- Licensed under AGPL-3.0 ([#35](https://github.com/bilalyazicioglu/keepsake/pull/35)).
- Backup and restore guide ([#44](https://github.com/bilalyazicioglu/keepsake/pull/44)).

### Changed

- The server refuses to start when an environment variable can't be parsed, instead of silently using the default ([#17](https://github.com/bilalyazicioglu/keepsake/pull/17)).
- Dependencies updated, including chi, pgx, jwt and x/crypto; the server now builds with Go 1.26 ([#24](https://github.com/bilalyazicioglu/keepsake/pull/24), [#42](https://github.com/bilalyazicioglu/keepsake/pull/42), [#43](https://github.com/bilalyazicioglu/keepsake/pull/43)).

### Fixed

- Fresh Docker installs applied every database migration twice ([#44](https://github.com/bilalyazicioglu/keepsake/pull/44)).
- Opening an uploaded SVG or other active file directly no longer runs its scripts on the Keepsake origin ([#18](https://github.com/bilalyazicioglu/keepsake/pull/18)).
- An expired session returns to the sign-in screen instead of showing repeated errors ([#29](https://github.com/bilalyazicioglu/keepsake/pull/29)).
- Uploads fail fast on errors that can't succeed on retry, and show the server's message ([#31](https://github.com/bilalyazicioglu/keepsake/pull/31)).
- A slow response for a previous filter or search no longer replaces the current view ([#32](https://github.com/bilalyazicioglu/keepsake/pull/32)).

### Renamed

- The project was renamed from outofmatrix to Keepsake ([#6](https://github.com/bilalyazicioglu/keepsake/pull/6)).

[0.1.0]: https://github.com/bilalyazicioglu/keepsake/releases/tag/v0.1.0
