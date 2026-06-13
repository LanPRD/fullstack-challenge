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
COPY services/games/src ./services/games/src
COPY services/games/prisma ./services/games/prisma
COPY services/games/tsconfig.json ./services/games/
COPY services/games/prisma.config.ts ./services/games/

WORKDIR /app/services/games
EXPOSE 4001

CMD ["sh", "-c", "bunx prisma migrate deploy && bun run src/main.ts"]
