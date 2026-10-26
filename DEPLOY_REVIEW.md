# SkyMetrics review deployment

This repository contains application code and a simulated data generator. It does **not** contain the local MySQL database, account passwords, or `.env` files. Do not commit those files.

## Free hosting arrangement

Use one Render Free **Web Service** for the combined React frontend and Spring API, and an Aiven **MySQL Free** database. The root `Dockerfile` builds both apps into one service, so login sessions and API calls use the same domain. Render Free may sleep when idle, making the first request slower. The database has a small storage limit, so export a connected 90-day simulated snapshot for review instead of the full local database.

## Set up the database

1. In Aiven, create a **MySQL Free** service. Save its host, port, database name, username and password privately.
2. In Render, create a Web Service from this GitHub repository. Choose **Docker**, the root `Dockerfile`, and the **Free** instance type.
3. Set these Render environment variables in the dashboard (never in GitHub):

   | Name | Value |
   | --- | --- |
   | `DB_URL` | `jdbc:mysql://HOST:PORT/DATABASE?sslMode=REQUIRED&connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true` |
   | `DB_USERNAME` | Aiven username |
   | `DB_PASSWORD` | Aiven password |
   | `SKYMETRICS_BOOTSTRAP_ADMIN_EMAIL` | Your private administrator email |
   | `SKYMETRICS_BOOTSTRAP_ADMIN_PASSWORD` | A new, unique password of at least 16 characters |
   | `COOKIE_SECURE` | `true` (Render serves the public site over HTTPS) |

   Render sets `PORT` automatically. Leave email delivery variables unset unless you have configured an SMTP account.
4. Deploy once and wait for the health endpoint, `/api/v1/health`, to return `UP`. This first start creates the database tables using Flyway.

## Import the simulated review data

From the local SkyMetrics folder, with its local MySQL server running:

```bash
python3 tools/export_review_snapshot.py
```

The resulting `review-snapshot.sql.gz` contains linked fare records needed by the 90-day route views and the 30-day government index. To fit the free database, it retains one generated flight service per route, airline and time-of-day group consistently across the period. It excludes all users, sessions and passwords and is ignored by Git. Import it into Aiven using its MySQL connection details:

```bash
gunzip -c review-snapshot.sql.gz | mysql --ssl-mode=REQUIRED \
  --host=YOUR_AIVEN_HOST --port=YOUR_AIVEN_PORT \
  --user=YOUR_AIVEN_USER --password YOUR_AIVEN_DATABASE
```

The command prompts for the Aiven database password. Do not put it in a shell command or commit the snapshot. Check Aiven storage use after import; the free plan is limited.

## Reviewer access

Create a separate traveller account through `/login`. Sign in as the owner at `/admin/login` and create a `GOV_ANALYST` account in Admin for the government reviewer. Give reviewers only those two demo accounts, with unique passwords, through a private channel. The public review links are:

- `https://YOUR-RENDER-SERVICE.onrender.com/users`
- `https://YOUR-RENDER-SERVICE.onrender.com/government/login`

The government API and page still require the analyst or admin role. The dataset is simulated and is not an official government index or live flight quote.
