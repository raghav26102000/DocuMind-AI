FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y libxml2-dev libxslt1-dev build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip setuptools

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire schemerpipe package into the /app directory
COPY schemerpipe/ schemerpipe/

COPY .env .

EXPOSE 9002
# CMD ["fastapi", "run", "schemerpipe.main:app", "--port", "9002", "--host", "0.0.0.0"]
CMD ["uvicorn", "schemerpipe.main:app", "--host", "0.0.0.0", "--port", "9002"]
