FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY shared/package.json shared/package.json
COPY backend/package.json backend/package.json
RUN npm install

FROM deps AS build
COPY shared shared
COPY backend backend
COPY tsconfig.base.json tsconfig.base.json
RUN npm run build -w @opensource-compass/shared
RUN npm run build -w @opensource-compass/backend

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "backend/dist/server.js"]
