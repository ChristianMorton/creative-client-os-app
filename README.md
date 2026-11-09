# Creative Client OS

A dark, fast desk for freelance photographers, cinematographers, and editors. One job record runs the arc: lead, booking, folders, delivery, paid.

It organises work that already lives in Google Calendar and Drive. It does not replace Frame.io, Photoshop, Premiere, or After Effects.

## Portfolio overview

A working prototype built with Next.js, TypeScript, Drizzle and Postgres. The sample studio and clients are fictional. Explore the booking-to-paid workflow locally without connecting external accounts. Payments are manually recorded; Google and Dropbox integrations require your own credentials.

See [SECURITY.md](SECURITY.md) for deployment boundaries and [PUBLIC_RELEASE.md](PUBLIC_RELEASE.md) for verification and release notes.

## Screenshots and walkthrough

![Sample studio pipeline](docs/media/pipeline.png)

[Watch the 18-second studio walkthrough](docs/media/studio-walkthrough.webm) · [Today’s call sheet](docs/media/studio-today.png) · [Job details and delivery lock](docs/media/job-detail.png) · [Jobs list](docs/media/jobs.png)

Captured from the actual local application with the fictional seeded Field Studio. The walkthrough opens Today, Pipeline, a contacted job and the job list; no external accounts are connected. Dates and overdue indicators reflect the fixed sample schedule. Google Drive/Calendar and Dropbox connections are not demonstrated.

## Run locally

Requires Node 22+ and Postgres 16.

```bash
docker compose up -d
cp .env.example .env
npm ci
npm run db:setup
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123) and choose **Continue as studio**. That signs in as Avery Chen at Field Studio, with a handful of photo and video jobs already on the desk.

Next.js blocks its dev socket unless the browser host is allowed. `next.config.ts` allows `127.0.0.1`. If you open the dev server from another host, add it to `allowedDevOrigins` and restart. Without that, the page renders and clicks do nothing.

`npm run db:setup` pushes the schema and reseeds that studio. Re-running it replaces Avery’s jobs.

If you already have Postgres, create the database and user from `.env.example` and skip Docker. The default URL is `postgres://creative:creative@127.0.0.1:5432/creative_client_os`.

## Env vars

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | Auth.js session secret. The example value is for local dev only |
| `AUTH_URL` | Public URL of the app, `http://127.0.0.1:43123` locally |
| `AUTH_GOOGLE_ID` | Google OAuth client id. Leave empty to use the dev studio sign-in |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `AUTH_DEV_MODE` | In development, set `true` to also show **Continue as studio** alongside Google. Production always disables dev sign-in |

The sign-in screen stays to a brand line, one headline, and the sign-in button. Dev sign-in is Avery Chen at Field Studio (`avery@fieldstudio.test`). Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` before Calendar and Drive run against a real Google account. With both set, `AUTH_DEV_MODE=true` keeps the sample desk available beside Google in development only.

| `DROPBOX_ACCESS_TOKEN` | Optional. Used as-is when the refresh trio below is not set. Leave empty to keep Dropbox unconfigured |
| `DROPBOX_APP_KEY` | Dropbox app key. Required only with the secret and refresh token |
| `DROPBOX_APP_SECRET` | Dropbox app secret |
| `DROPBOX_REFRESH_TOKEN` | Offline refresh token. With the key and secret, this is preferred over a bare access token |

Google OAuth scopes, when configured: `openid`, `email`, `profile`, `calendar.events`, `drive.file`.

Dropbox scopes, when you create the app: `files.metadata.read` and `files.metadata.write`. Request `token_access_type=offline` so the token response includes a refresh token. The app boots with these four variables empty. No Dropbox request is made until one of the token setups above is present.

Do not ship the example `AUTH_SECRET` to a public server. Dev sign-in has no password and is disabled in production, regardless of `AUTH_DEV_MODE`. Configure Google OAuth for a production build.

## What is real, what is stubbed

| Piece | With Google connected | Without |
| --- | --- | --- |
| Jobs, notes, packing, quotes, reminders, board, list, statuses | Postgres | Postgres |
| Deposit | Manual “received” timestamp | Same. Stripe is not built |
| Sign-in | Google OAuth | Dev studio session |
| Folders on Booked | Real Drive folders under `/Client/Job/{01-admin,02-raw,03-exports,04-client-delivery}` | Mock links stored on the job, labeled local |
| Shoot and delivery events | Real Google Calendar events | Mock events stored on the job, labeled local |
| Dropbox | Same tree, real folders, when a Dropbox token is set. Both trees are kept if Drive is connected too | Unconfigured. The job page says so. No API call and no fake folders |

Booking still creates the Drive folder rows and calendar rows when Google is absent, so the pipeline can be walked end to end. Dropbox is separate: without a token, booking does not write Dropbox rows. After a token is added, **Add Dropbox folders** on a booked job creates that tree. It is not the status button. New bookings create it on their own.

The client delivery link stays hidden until the job is **Paid**, unless you unlock it for a trusted client. That unlock asks you to type the client name and confirm. It is not the primary button.

## Verification

Use a disposable local database and the sample `.env`. `db:setup` changes the schema and replaces the sample studio. Never run it against production.

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

The booking tests require Postgres and seeded jobs; run `npm run db:setup` first.

## Scripts

- `npm run dev` — app on port 43123
- `npm run db:setup` — schema + seed
- `npm test` — status rules, delivery lock, and a booked-job flow against Postgres
- `npm run lint`

## Out of scope

Frame.io-style review, marketing email, Adobe plugins, Xero or QuickBooks, multi-team permissions, client galleries, gear inventory, and Stripe. A later kit library (Available / On job / Repair) is noted in the architecture doc and is not in this build.
