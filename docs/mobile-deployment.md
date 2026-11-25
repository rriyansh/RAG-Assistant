# Static hosting, mobile releases, and local backend tunnel

## Cloudflare Workers static frontend

The root [`wrangler.toml`](../wrangler.toml) builds `frontend/out` and deploys it
as a static-assets Worker. Deploy from the repository root with:

```sh
npx wrangler deploy
```

In Cloudflare Workers Builds settings, set the install command to
`npm --prefix frontend install` and the build/deploy command to
`npx wrangler deploy`; leave the dashboard output directory empty. This overrides
root `requirements.txt` detection, and Wrangler runs the frontend build from the
config's `build.command`. This deployment does not install or start Python.

## Vercel static frontend

The root [`vercel.json`](../vercel.json) runs npm only under `frontend/` and
publishes `frontend/out`. In the Vercel project settings, leave Root Directory at
the repository root and do not override its install/build/output commands.

Set these build configuration values in Vercel and in GitHub repository
**Settings → Secrets and variables → Actions → Secrets**:

- `NEXT_PUBLIC_BACKEND_CONFIG_URL`: the stable raw URL of a public Gist named
  `reso-backend.json` (recommended for changing Quick Tunnel URLs).
- `NEXT_PUBLIC_BACKEND_URL`: optional fixed HTTPS backend URL. Leave empty when
  using auto-sync.

These values are embedded in the public frontend bundle and are not confidential;
GitHub Secrets are used here only to centralize workflow configuration. Never put
a token or API key in either URL.

## Start the backend and a free Quick Tunnel

Install `cloudflared`, install the Python and frontend dependencies, then run
`scripts/dev.sh` (macOS/Linux/Git Bash) or `scripts/dev.ps1` (PowerShell). The
script starts FastAPI, starts `cloudflared tunnel --url
http://localhost:8000`, waits for `/health`, prints the ephemeral
`*.trycloudflare.com` URL, publishes it to the optional Gist, and starts the web
UI. Set `PORT` to override the local backend port (default `8000`). Quick Tunnel
URLs change between runs.

For automatic discovery across devices and deployments, create a **public
Gist** with an empty `reso-backend.json` file and create a GitHub token with Gist
write access. Put these local-only values in the root `.env`:

```dotenv
GH_GIST_ID=your_gist_id
GH_GIST_TOKEN=your_gist_write_token
NEXT_PUBLIC_BACKEND_CONFIG_URL=https://gist.githubusercontent.com/OWNER/GIST_ID/raw/reso-backend.json
```

Copy the Gist's stable raw URL into Vercel's and GitHub's
`NEXT_PUBLIC_BACKEND_CONFIG_URL` variable. The local dev scripts use the token
only to update the Gist. The Gist contains only the current public tunnel URL;
it must never contain credentials. `.env` and the local SQLite database are
ignored by Git.

The mobile app checks the configured discovery URL in the background, stores
the current backend URL on-device, and probes `/health`. You can override it for
one device from **Settings → Backend Connection** or by opening the app with
`?backend=https://your-name.trycloudflare.com`. Clearing the override returns
that device to auto-sync. The bundled UI stays available when the backend is
offline; API features resume when it responds.

## App branding and OTA

`frontend/assets/icon.png`, `frontend/assets/splash.png`, PWA icons, and the
in-app logo use the selected Dino image. The build workflow uses
`@capacitor/assets` to create all Android densities/adaptive icons and the iOS
AppIcon set. The Capacitor app name is **Reso Agent**.

The `build-mobile` workflow uploads the static bundle to Capgo on every push to
`main` when the `CAPGO_TOKEN` Actions secret is set. Without it, OTA is skipped
and native builds/releases continue. The updater checks on app launch; Capgo
updates web assets, while native plugin/configuration changes still require a
new binary. Register `com.rriyansh.ressoagent` in Capgo once and create/set the
default `production` channel before the first upload; the CI upload version is
automatically incremented for every run.

For a local development setup, keep API provider keys and `GH_GIST_TOKEN` in the
ignored root `.env`. For cloud hosting, configure provider keys as runtime
environment variables on the backend host (for example `OPENAI_API_KEY`,
`NVIDIA_API_KEY`, and `LLM_PROVIDER`). Do not put backend provider keys into the
frontend build or mobile bundle. New device sessions use the configured hosted
provider unless the user chooses a provider in Settings.

The API container listens on `0.0.0.0:$PORT` (`8000` by default), exposes
`/health`, and persists `data/` through the Compose bind mount. Railway/Render
must provide a persistent volume mounted at `/app/data` if local vector indexes
and settings need to survive restarts. The static frontend container is served
by Nginx and does not start Python. Set `CORS_ALLOW_ORIGINS` for custom frontend
domains; Vercel, Cloudflare Pages/Workers, and Quick Tunnel origins are included
in the default allowlist pattern.

Release assets are published at:

- `https://github.com/rriyansh/RAG-Assistant/releases/latest/download/resso-agent-android.apk`
- `https://github.com/rriyansh/RAG-Assistant/releases/latest/download/resso-agent-ios-unsigned.ipa`

The iOS IPA is unsigned and must be signed by an iOS sideloading tool before it
can be installed. Free personal provisioning expires and must be renewed
periodically.
