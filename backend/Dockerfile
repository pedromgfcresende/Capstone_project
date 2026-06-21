# XAnge Market Intelligence — backend (FastAPI + Postgres + LangChain)
FROM python:3.12-slim

# uv — fast, reproducible Python installs (copied from the official image)
COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /uvx /usr/local/bin/

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/.venv

WORKDIR /app

# 1) Dependencies first (cached layer — only re-runs when the lockfile changes)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# 2) Chromium + its system libs for the web-research fallback (trafilatura → Playwright)
RUN uv run playwright install --with-deps chromium

# 3) Application code
COPY . .

EXPOSE 8000

# Apply migrations, then serve. DATABASE_URL is injected by compose.
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000"]
