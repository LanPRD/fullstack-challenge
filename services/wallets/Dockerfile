FROM oven/bun:1-alpine
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

# Runtime workspace sources (@crash/events is imported at runtime; eslint-config is not)
COPY packages/events/src ./packages/events/src

# Service source and Prisma config
COPY services/wallets/src ./services/wallets/src
COPY services/wallets/prisma ./services/wallets/prisma
COPY services/wallets/tsconfig.json ./services/wallets/
COPY services/wallets/prisma.config.ts ./services/wallets/

WORKDIR /app/services/wallets
EXPOSE 4002

CMD ["sh", "-c", "bunx prisma migrate deploy && bun run src/main.ts"]
