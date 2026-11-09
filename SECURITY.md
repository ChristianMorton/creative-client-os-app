# Security and deployment

The sample desk is for local evaluation with fictional data. Its sign-in has no password. Do not expose it to the internet or connect real client data. Configure Google OAuth, disable AUTH_DEV_MODE and generate a fresh AUTH_SECRET before hosting real accounts.

Keep .env, OAuth refresh tokens, database dumps and client files outside version control. Google tokens are stored in the accounts table: protect database access and backups accordingly. Use HTTPS for hosted deployments and configure OAuth redirect URLs for your own host.

The Compose database uses public example credentials and binds to loopback only. Replace the credentials for hosted use. Schema-push and seed commands are for disposable local databases, not production migration.

For suspected credential exposure, revoke or rotate the credential first and remove it from public history. Contact the repository owner privately about vulnerabilities rather than posting sensitive details in an issue.
