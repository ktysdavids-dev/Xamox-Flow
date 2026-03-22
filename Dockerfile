FROM node:20-bullseye AS frontend_builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
COPY frontend/scripts ./scripts
RUN npm install --legacy-peer-deps --force --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Backend dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Application code
COPY backend /app/backend
COPY frontend /app/frontend

# Replace frontend build with production artifacts from builder stage
COPY --from=frontend_builder /app/frontend/build /app/frontend/build

CMD ["/bin/sh", "-c", "PYTHONPATH=. uvicorn backend.server:app --host 0.0.0.0 --port ${PORT:-10000}"]
