FROM oven/bun:1.3 AS builder
WORKDIR /app

# Root workspace manifest + lockfile
COPY package.json bun.lock ./

# All workspace package.json files (Bun needs to discover every workspace member)
COPY packages/events/package.json ./packages/events/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY services/games/package.json ./services/games/
COPY services/wallets/package.json ./services/wallets/
COPY frontend/package.json ./frontend/

RUN bun install

# Frontend source (eslint-config source not needed — Vite build doesn't run ESLint)
COPY frontend/src ./frontend/src
COPY frontend/public ./frontend/public
COPY frontend/index.html ./frontend/
COPY frontend/tsconfig.json ./frontend/
COPY frontend/tsconfig.app.json ./frontend/
COPY frontend/vite.config.ts ./frontend/

WORKDIR /app/frontend
RUN bun run build

FROM nginx:1.27-alpine
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
