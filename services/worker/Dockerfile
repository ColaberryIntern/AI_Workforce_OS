# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY services/api/package.json ./services/api/
COPY services/worker/package.json ./services/worker/
COPY frontend/package.json ./frontend/
RUN npm install --workspaces --include-workspace-root --no-audit --no-fund

FROM node:20-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/services/worker/node_modules ./services/worker/node_modules
COPY package.json tsconfig.base.json ./
COPY services/api/prisma ./services/api/prisma
COPY services/worker ./services/worker
WORKDIR /repo/services/worker
RUN cd ../api && npx prisma generate
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/services/worker/dist ./dist
COPY --from=build /repo/services/worker/node_modules ./node_modules
COPY --from=build /repo/services/worker/package.json ./
USER node
CMD ["node", "dist/services/worker/src/index.js"]
