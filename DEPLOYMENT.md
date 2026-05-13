# Deployment instructions

This repository contains a static frontend in `web/` and a SWI-Prolog backend in `server/server.pl`.

Vercel (frontend)
- The `vercel.json` at the project root is configured to serve the `web/` folder as a static site.
- To deploy from your repository using Vercel's UI, import the repo and deploy — no code changes required.
- To deploy with the Vercel CLI from the project root:

```bash
cd web
vercel --prod
```

Railway (server)
- The server is a SWI-Prolog script that listens on port 8080 (see `server/server.pl`).
- Railway can deploy the service using the provided `Dockerfile` in `server/`.

Quick Docker-based deploy (Railway or other hosts):

```bash
# From repository root
cd server
# Build the image
docker build -t bahir-server:latest .
# Run exposing port 8080
docker run -p 8080:8080 bahir-server:latest
```

Notes and tips
- Do not change `server/server.pl` (keeps the same behavior). The service listens on port 8080; when creating a Railway service, configure the internal port mapping to 8080 or use the Dockerfile.
- If you prefer Railway CLI, run `railway init` and then `railway up` from `server/` (Railway will detect the `Dockerfile`).
- The frontend should be configured to call the backend's production URL (Railway service URL). Update `web/js/app.js` or environment variables on Vercel if you need to point to the deployed backend.
