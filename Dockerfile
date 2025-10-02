# Build stage
FROM node:18.19.0-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
# Install ALL dependencies (needed for building TypeScript)
RUN npm ci --silent && \
    npm cache clean --force
COPY . .
RUN npm run build

# Test stage
FROM node:18.19.0-alpine AS test
# Install security updates and utilities
RUN apk add --no-cache \
    dumb-init \
    curl \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001
WORKDIR /usr/src/app
COPY --from=builder --chown=nodejs:nodejs /usr/src/app ./
USER nodejs
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]

# Production stage
FROM node:18.19.0-alpine AS prod
# Install security updates and utilities
RUN apk add --no-cache \
    dumb-init \
    curl \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production --silent && \
    npm cache clean --force && \
    rm -rf /tmp/*
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/dist ./dist
USER nodejs
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
