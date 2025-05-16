FROM node:18-alpine

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package*.json ./

# Install app dependencies
RUN npm install --only=production

# Copy app source
COPY . .

# Build the application
RUN npm run build

EXPOSE ${BACKEND_PORT:-3000}

CMD ["node", "dist/main"]
