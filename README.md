# Running

## Defining Runtime Environment Variables

```bash
echo "YOUR_SECRET_VALUE" > YOUR_SECRET_NAME.txt
docker secret create scheme_base_url scheme_base_url.txt
```

## Building Image

```bash
DOCKER_BUILDKIT=1 docker compose build --build-arg CACHE_BUSTER=$(date +%s)
```

## Running

```bash
docker stack deploy -c docker-compose.yaml scheme_stack

or

docker compose up -d
```
# DocuMind-AI
