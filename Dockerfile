# Second Nature as one container: the built React app + the FastAPI backend (with the CNN) on one URL.
# Used by Render (see deploy/README.md). To try it locally with Docker Desktop running:
#   docker build -t second-nature . && docker run -p 10000:10000 second-nature   → http://localhost:10000

# 1. Build the frontend
FROM node:22-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2. Run the backend, which also serves the built frontend
FROM python:3.12-slim
RUN useradd -m -u 1000 user
# CPU-only PyTorch keeps the image small. Runtime deps only (requirements.txt also has training-only packages).
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch torchvision \
 && pip install --no-cache-dir fastapi "uvicorn[standard]" python-multipart pillow
WORKDIR /app
COPY --chown=user backend/ ./backend/
COPY --from=web --chown=user /web/dist ./frontend/dist
USER user
# Render's free plan has 512 MB of RAM and a fraction of a CPU: one thread and fewer malloc arenas keep memory down.
ENV SN_STATIC_DIR=/app/frontend/dist \
    OMP_NUM_THREADS=1 \
    MALLOC_ARENA_MAX=2 \
    PORT=10000
WORKDIR /app/backend
EXPOSE 10000
# Render sets PORT; shell form so it's expanded.
CMD python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
