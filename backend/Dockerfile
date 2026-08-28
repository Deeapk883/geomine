# Use Python 3.11 slim image for a lightweight container
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Install system dependencies required for geospatial libraries and image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgdal-dev \
    gdal-bin \
    curl \
    && rm -rf /var/lib/apt-get/lists/*

# Set working directory
WORKDIR /app

# Install CPU version of PyTorch first (drastically reduces image size from 4GB+ to ~700MB)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install remaining dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY . .

# Expose the default Google Cloud Run port
EXPOSE 8080

# Start Uvicorn bound to 0.0.0.0 and the PORT environment variable provided by Cloud Run
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
