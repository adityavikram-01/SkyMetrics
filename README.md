# SkyMetrics Platform

SkyMetrics is a prototype for exploring **simulated Indian domestic airfare**. The React frontend, Spring Boot API, MySQL schema and data generator are kept in separate folders. See [DEPLOY_REVIEW.md](DEPLOY_REVIEW.md) for the public review deployment.

## Start it

1. On the original Mac, open the SkyMetrics project folder in Finder. The repository does not include the local MySQL data directory.
2. Double-click **START_SKYMETRICS.command**. The first backend run downloads Maven dependencies if needed; the frontend installs npm dependencies if missing.
3. When the script says **SkyMetrics is ready**, open <http://127.0.0.1:5174/>. The command opens this address automatically.
4. To stop it, double-click **STOP_SKYMETRICS.command**. This keeps the database and saved accounts.

If macOS blocks a `.command` file, right-click it and choose **Open**. Keep the Terminal window open if it shows an error; its message tells you what failed. The local MySQL installation is expected at `/usr/local/mysql/bin/mysqld` and Java/Maven and Node/npm must be available. The database is bound to `127.0.0.1:3309`; the backend uses `127.0.0.1:8081`; the site uses `127.0.0.1:5174`. None of these ports belongs to the older APIx project.

## Your owner/admin access

The owner account is configured through the private `SKYMETRICS_BOOTSTRAP_ADMIN_EMAIL` and `SKYMETRICS_BOOTSTRAP_ADMIN_PASSWORD` environment variables. Never commit these values. Changing the bootstrap password after the account exists does not change its stored password. The owner role is protected from being reassigned in the admin workspace.

Public signup creates a **traveller** account only. After owner sign-in, go to **Operations** to create government analyst or data partner accounts, review accounts, and assign roles, including administrator. Only the original owner can make role changes, and they apply immediately. Your owner account can open every workspace, including the developer area.

Travellers cannot request administrator access. The original owner assigns roles directly in **Operations**. The owner account cannot be reassigned there.

### Email delivery

The backend can send a sign-in notice to the user's account email when SMTP is configured. Put the following in the **private** `apix-backend/.env` file (never in the frontend or Git):

Configure a mail provider in the private backend environment if sign-in notices are needed. Do not paste mail credentials into a chat:

```properties
SKYMETRICS_OWNER_EMAIL=owner@example.com
SKYMETRICS_MAIL_FROM=owner@example.com
SKYMETRICS_SMTP_HOST=smtp.gmail.com
SKYMETRICS_SMTP_PORT=587
SKYMETRICS_SMTP_USERNAME=owner@example.com
SKYMETRICS_SMTP_PASSWORD=YOUR_GMAIL_APP_PASSWORD
```

Use a Gmail **App Password**, not your normal Google password. Google explains how to create one at <https://support.google.com/accounts/answer/2461835>. Restart the backend after adding it. Until that password is configured, **no sign-in email is sent**. Public deployment also needs email verification and abuse controls before relying on account email ownership.

## The four workspaces

The government workspace is a research demonstration based on simulated observations.

| Area | URL | Who can use it | Purpose |
|---|---|---|---|
| Flights | `/flights` | Signed-in users | Compare a simulated fare with similar past fares and decide whether to book. |
| Route insights | `/insights` | Signed-in users | Compare dates, airlines and route price patterns. |
| Fare trends | `/market` | Signed-in users | Inspect route and city fare movement. |
| Your account | `/account` | Signed-in users | Saved trips, watchlist, recent searches, price alerts and notifications. |
| Profile | `/profile` | Signed-in users | Name, home airport, preferred airline and password. |
| Government | `/government` | Government analysts and owner | Fixed-base simulated airfare index, analyst brief, route drivers, coverage, booking lead time, and exports. |
| Developers | `/developers` | Approved partners and owner/admin | Ten working endpoint examples, live responses, copyable JavaScript, and partner access status. API keys/exports are not yet enabled. |
| Operations | `/admin` | Owner/admin | Account roles, dataset health, collection runs and manual alert evaluation. |

The flight analytics, policy, partner and operations API responses are protected on the backend. Hiding a frontend link alone is not used as security. Login uses server sessions, BCrypt password hashes and CSRF protection; account records and alerts are owned by the signed-in user.

## What the data and methods mean

The imported local database contains **2,382,543 simulated fare observations** across **2,430,900 collection results** and **730 collection runs**. The bundled data was generated for 24 directional domestic routes across 10 Indian cities, with morning/afternoon/evening/night flights, multiple airlines and booking horizons. Each flight keeps its identity over the observation period, so charts can follow realistic holds, small changes, promotions, route shocks, holiday demand, last-minute pressure and recovery. It is useful for demonstrating analytics and building the application, but it is **not scraped live airfare**, cannot confirm actual ticket availability, and is **not official government CPI**.

The underlying APIs include fare search, price intelligence, deal score, manual fare evaluation, same-flight history, fare calendar, route statistics, booking-window analysis, airline comparison, volatility, route heatmap, anomaly detection, festival impact, short-term statistical prediction, and the experimental airfare index. The prediction uses observed transition patterns; it is not a guaranteed forecast. The policy index compares a fixed basket of route, airline, and departure-time groups quoted 18–24 days before departure, targeting a 21-day booking horizon. It uses a simulated scheduled-service proxy rather than official passenger expenditure weights. Coverage and exclusions are shown in the Government workspace. The API reports insufficient data when a comparison cannot be supported.

The account API stores saved trips, watched routes, search history, user preferences and threshold alerts in MySQL. Price-alert notifications are currently **in-app only**. The owner can run the alert evaluation from Operations. Account email notices need the SMTP setup above. Push delivery, production API keys, quotas and billing are future work; the UI does not present them as active features.

## Project layout

- `apix-backend/`: Spring Boot REST API, analytics, security, JPA entities and Flyway migrations.
- `apix-frontend/`: React app with separate route components for each workspace.
- `airfare_mimic/`: reproducible synthetic data generator and audit utilities.
- `docker/mysql/init/01-apix.sql.gz`: packaged database seed used for fresh Docker setup.
- `.runtime/mysql/`: the independent local MySQL data directory created for this project.
- `.env` and `apix-backend/.env`: private local credentials; never publish these.
- `IMPLEMENTATION_PLAN.md`: architecture and staged implementation decisions.

## Optional Docker run

If Docker Desktop works on your computer, `docker compose up -d --build` starts the same separate project on the same local ports. Docker uses a separate named volume, `skymetrics_mysql_data`, and imports the packaged SQL seed on its first run. Avoid running local and Docker modes at the same time because they use the same ports. See `DOCKER.md`. On this Mac, Docker Desktop could not be opened during verification, so the local launch script is the tested route.

## Verification and limits

Frontend production build and backend unit tests pass. The local end-to-end check is performed against the isolated MySQL instance. The product is a **well-separated prototype**, not a production deployment: simulated data, manual alert evaluation, no production email delivery or API key issuance, and no public hosting setup. Keep it local until those are addressed.
