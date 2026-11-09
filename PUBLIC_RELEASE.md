# Public release preparation

Prepared locally on 2026-11-09. The private remote and visibility have not been changed.

## Included cleanup

- README explains the sample workflow, real integrations and local verification.
- Fictional seed emails use reserved .example domains.
- Development server and Compose database bind to loopback by default.
- Production mode disables passwordless sample-studio authentication regardless of OAuth configuration. A regression test covers this boundary.
- GitHub Actions configures disposable Postgres, seeds the studio, and runs lint, type checks, tests and build.
- Security notes explain secrets, database tokens and the local-only demo boundary.

## History and ownership review

A pattern scan inspected all 15 reachable commits and 167 unique historical blobs. No provider-token or private-key patterns were found. Two historical .env.example blobs contain the documented local-only AUTH_SECRET placeholder; do not use that value on a hosted server. Pattern scans cannot guarantee the absence of secrets.

Existing commit author metadata includes a personal email address. Publishing a source-only archive with a new history avoids carrying historical metadata and earlier sample email domains into the public repository. Keep the private history as the development record.

No repository licence was present and none has been invented. Confirm rights to publish the code and assets, then choose a licence before presenting this as reusable open-source software.

## Validation

Lint and TypeScript checks passed after the dependency updates. All 10 tests passed, including the production authentication regression and database-backed booking, ownership and delivery-lock tests. Docker Desktop was unavailable; verification used a disposable portable PostgreSQL 18.6 instance bound to localhost, outside the repository. CI continues to target Postgres 16.

The production build passed on Next.js 16.4.5 with network access for Google Fonts. The first restricted-network attempt failed fetching fonts; a fresh build therefore requires Google Fonts access. A genuine 18-second browser walkthrough and five screenshots were captured using fictional sample data and inspected.

Next.js and matching lint configuration were updated to 16.4.5, resolving the critical framework advisory. Compatible dependency fixes reduced npm audit findings from 26 (including 1 critical and 7 high) to 17 (2 low, 15 moderate), with no remaining high or critical findings at review time. Remaining advisory chains involve shadcn registry tooling (deepmerge/minimatch), Drizzle Kit tooling (esbuild) and ESLint tooling (minimatch). npm proposed breaking downgrades for those chains; they were not applied. Reassess advisories before hosting production traffic.

## Before public launch

1. Confirm rights and licence choice.
2. Run the GitHub workflow, including database tests and full build, successfully.
3. Refresh screenshots and the short walkthrough whenever the UI materially changes.
4. Use only sample data in a public demo. Configure real OAuth, fresh secrets and production deployment separately.
