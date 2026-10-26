# Optional Docker setup

Start Docker Desktop, then from this separate SkyMetrics folder run:

```sh
docker compose up -d --build
docker compose ps
```

The first run imports the packaged simulated airfare database and may take several minutes. Open <http://127.0.0.1:5174/>. Stop with `docker compose down`; the named database volume remains. The local MySQL launcher and Docker Compose cannot run simultaneously because they bind the same local ports. Credentials are read from the private root `.env` file. Do not publish that file or expose these development ports on the internet.
