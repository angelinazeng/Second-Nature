# Deploying to Render (free)

The whole app (React frontend + FastAPI backend + CNN) runs as one Docker web service on Render's free
plan. The `Dockerfile` at the repo root builds the frontend and serves it from the backend, so the app
and `/api` share one URL. The trained model (`backend/models/classifier.pt`) is committed so Render can
build it.

## First deploy

1. Make sure `main` on GitHub has the `Dockerfile` and `backend/models/classifier.pt`.
2. Sign up at https://render.com with **GitHub**.
3. **New → Web Service**, then pick the `Second-Nature` repository. If it isn't listed, click
   **Configure account** and give Render access to it. The repo owner has to approve that.
4. Settings:
   - **Language:** Docker
   - **Branch:** main
   - **Region:** Ohio (US East), or whichever is closest
   - **Instance type:** Free
   - **Advanced → Health Check Path:** `/api/health`
5. **Deploy Web Service.** The first build takes about 10 minutes. When the log says
   "Your service is live", the app is at `https://<service-name>.onrender.com`.

## Updating

Render redeploys automatically on every push to `main`.

## Good to know

- Free services sleep after 15 minutes without visits. The next visit takes about a minute to wake
  it, plus a few seconds the first time a photo is checked while the model loads. Open the URL before
  a demo or grading.
- The model needs about 400 MB of the free plan's 512 MB of RAM. If the logs show the service ran out
  of memory, that's why.
- Questions, stories and shared guides live in SQLite inside the container, so they reset whenever the
  service sleeps, restarts or redeploys. Saved guide items live in each visitor's browser and are unaffected.
- If a deploy fails, the **Logs** tab shows the error.
