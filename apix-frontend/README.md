# SkyMetrics frontend

From the project root, use `START_SKYMETRICS.command` for the complete local platform. For frontend-only development, run `npm ci && npm run dev` here and open <http://127.0.0.1:5174/>. Vite proxies `/api` to the isolated backend on port 8081. The landing page works without the backend; flight analytics and account pages require it.
