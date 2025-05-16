FROM node:latest AS builder

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies) for building
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN npm run build

CMD [ "tail", "-f", "/dev/null" ]

# --- Production Stage ---
FROM node:18-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

# Copy package files again for installing only production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy the built application from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE ${BACKEND_PORT:-3000}

CMD ["node", "dist/main"]
