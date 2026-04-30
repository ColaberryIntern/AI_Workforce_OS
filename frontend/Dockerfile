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
COPY --from=deps /repo/frontend/node_modules ./frontend/node_modules
COPY package.json ./
COPY frontend ./frontend
WORKDIR /repo/frontend
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1
