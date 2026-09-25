# Changelog

Notable changes to Keepsake. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Keepsake has no tagged release yet.

## Unreleased

### Added

- New interface: sidebar with Library, Favorites and albums, month-grouped library, window-wide drop target and upload tray, and the Keepsake logo ([#34](https://github.com/bilalyazicioglu/keepsake/pull/34)).
- Continuous integration for the backend, the web interface and the Docker image ([#15](https://github.com/bilalyazicioglu/keepsake/pull/15)).
- Licensed under AGPL-3.0.

### Changed

- The server refuses to start when an environment variable can't be parsed, instead of silently using the default ([#17](https://github.com/bilalyazicioglu/keepsake/pull/17)).

### Fixed

- Opening an uploaded SVG or other active file directly no longer runs its scripts on the Keepsake origin ([#18](https://github.com/bilalyazicioglu/keepsake/pull/18)).
- An expired session returns to the sign-in screen instead of showing repeated errors ([#29](https://github.com/bilalyazicioglu/keepsake/pull/29)).
- Uploads fail fast on errors that can't succeed on retry, and show the server's message ([#31](https://github.com/bilalyazicioglu/keepsake/pull/31)).
- A slow response for a previous filter or search no longer replaces the current view ([#32](https://github.com/bilalyazicioglu/keepsake/pull/32)).

### Renamed

- The project was renamed from outofmatrix to Keepsake ([#6](https://github.com/bilalyazicioglu/keepsake/pull/6)).
