# Federated Healthcare AI — FastAPI production image
# Compatible with FastAPI, PyTorch, SHAP, SQLAlchemy

FROM python:3.12-slim AS builder

WORKDIR /build

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# CPU-only PyTorch (smaller image; no GPU required for inference)
RUN pip install --upgrade pip \
    && pip install torch==2.12.0 --index-url https://download.pytorch.org/whl/cpu \
    && pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt


FROM python:3.12-slim AS runtime

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000
# Secrets (DATABASE_URL, JWT_SECRET_KEY, etc.) are injected via docker-compose / .env — not baked into the image.

# libgomp1: PyTorch CPU; non-root user for production
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1000 appuser \
    && useradd --system --uid 1000 --gid appuser --home-dir /app appuser

COPY --from=builder /wheels /wheels
RUN pip install --upgrade pip \
    && pip install --no-cache-dir /wheels/* \
    && rm -rf /wheels

# Application code, models, scalers, and processed data for SHAP background
COPY --chown=appuser:appuser . .

WORKDIR /app/api

RUN mkdir -p /app/reports \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Liveness: home endpoint (model loads on first predict/explain request)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/')" || exit 1

# Single worker: shared in-memory PyTorch model + lazy SHAP explainer
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
