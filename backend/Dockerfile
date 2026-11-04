FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency specifications
COPY requirements.txt .

# Install python dependencies (including FastAPI, RDKit, scikit-learn, pandas)
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code and model artifacts
COPY app/ app/
COPY idh1_qsar_artifacts/ idh1_qsar_artifacts/

# Set runtime environment
ENV PYTHONUNBUFFERED=1 \
    PORT=8000 \
    UPLOAD_DIR=/data/uploads \
    QSAR_ARTIFACTS_DIR=/app/idh1_qsar_artifacts

# Expose port (Railway overrides PORT dynamically)
EXPOSE 8000

# Start FastAPI production server via Uvicorn
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

