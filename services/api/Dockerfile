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
COPY --from=deps /repo/services/api/node_modules ./services/api/node_modules
COPY package.json tsconfig.base.json ./
COPY services/api ./services/api
WORKDIR /repo/services/api
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/services/api/dist ./dist
COPY --from=build /repo/services/api/node_modules ./node_modules
COPY --from=build /repo/services/api/prisma ./prisma
COPY --from=build /repo/services/api/package.json ./
EXPOSE 4000
USER node
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/api/health/live').then(r => process.exit(r.ok ? 0 : 1))"
CMD ["node", "dist/services/api/src/index.js"]
