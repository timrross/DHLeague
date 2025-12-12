# Build stage: install dependencies and compile client/server bundles
FROM node:24-slim AS dev
WORKDIR /app
ENV NODE_ENV=development

# Install dependencies using the lockfile for reproducibility
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the repository for local development
COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]

FROM node:24-slim AS build
WORKDIR /app

# Install dependencies using the lockfile for reproducibility
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the repository and build the client + server
COPY . .
RUN npm run build

# Production stage: install only runtime dependencies and copy build output
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the compiled server and client assets from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

# The server always listens on port 5000
EXPOSE 5000

CMD ["node", "dist/index.js"]
