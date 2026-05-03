# Use an official Python 3.13 slim image
FROM python:3.13-slim

# Set working directory
WORKDIR /usr/src/app

# Install system dependencies required for Python packages
RUN apt-get update && apt-get install -y \
    gcc \
    texlive-latex-base \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first (better caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app
COPY . .


EXPOSE 9001
CMD ["fastapi", "run", "main.py", "--port", "9001", "--host", "0.0.0.0"]
