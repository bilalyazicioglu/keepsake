# Security policy

## Supported versions

Keepsake has not had a release yet. Security fixes land on `main`; run the latest commit.

## Reporting a vulnerability

Please don't open a public issue for a vulnerability.

Report it privately through [GitHub's vulnerability reporting](https://github.com/bilalyazicioglu/keepsake/security/advisories/new). Include:

- what an attacker can do, and what they need first (an account, network access, a crafted file)
- steps to reproduce, using a small non-sensitive sample file
- the commit you tested

You'll get an acknowledgement within a week. Once a fix is merged, the advisory is published with credit to you unless you prefer otherwise.

## Scope

In scope: the Go server, the web interface, the Dockerfile and Compose setup in this repository.

Known and tracked in public:

- Media URLs carry the session token as a query parameter, because `<img>`, `<video>` and HLS requests can't send headers ([#14](https://github.com/bilalyazicioglu/keepsake/issues/14)). Treat copied media URLs as credentials.
- The Compose file uses development database credentials and publishes PostgreSQL on port 5432. Change both before exposing an instance.
