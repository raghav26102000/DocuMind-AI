# Stage 1: Build the Next.js application
FROM node:20-alpine AS build-stage
WORKDIR /app
COPY . .
RUN npm install --force

ARG CACHE_BUSTER
# Copy Docker secrets to environment variables for it to pack inside build
RUN --mount=type=secret,id=scheme_base_url \
    echo "$CACHE_BUSTER" && \
    echo "NEXT_PUBLIC_API_BASE_URL=$(cat /run/secrets/scheme_base_url)" >> .env

RUN npm run build

# Stage 2: Serve the Next.js application
FROM node:20-alpine AS production-stage
WORKDIR /app

# Copy app and install only production deps
COPY --from=build-stage /app /app
RUN npm install --omit=dev

# Set production environment
ENV NODE_ENV=production

# ARG NEXT_PUBLIC_BASE_API_URL
# ENV NEXT_PUBLIC_BASE_API_URL=${NEXT_PUBLIC_API_BASE_URL}
#

# Expose Next.js default port
EXPOSE 9000

# Start the Next.js server
CMD ["npm", "start"]
