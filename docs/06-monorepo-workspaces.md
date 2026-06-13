# Monorepo com Bun Workspaces

## O que é um monorepo

Um monorepo coloca múltiplos projetos (serviços, pacotes, frontend) em um único repositório git. A alternativa é um repositório por projeto (polyrepo).

```
fullstack-challenge/          ← um único git repo
  services/
    games/                    ← serviço NestJS
    wallets/                  ← serviço NestJS
  packages/
    events/                   ← tipos compartilhados
    eslint-config/            ← config compartilhada
  frontend/                   ← app React
  package.json                ← raiz do workspace
```

Vantagens:
- Compartilhar código sem publicar pacotes no npm
- Um único `bun install` instala tudo
- Mudanças em tipos compartilhados são imediatamente visíveis para todos os consumidores
- Histórico unificado no git

---

## Configuração no Bun

O `package.json` raiz declara os workspaces:

```json
// package.json (raiz)
{
  "name": "crash-game",
  "private": true,
  "workspaces": [
    "services/*",      // todos os pacotes dentro de services/
    "packages/*",      // todos os pacotes dentro de packages/
    "frontend"         // o frontend diretamente
  ]
}
```

O glob `services/*` inclui qualquer pasta com `package.json` dentro de `services/`. Novos serviços são incluídos automaticamente.

---

## Como os packages se referenciam

Cada package tem um `package.json` com um `name`:

```json
// packages/events/package.json
{
  "name": "@crash/events",
  "version": "0.0.1",
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  }
}
```

```json
// packages/eslint-config/package.json
{
  "name": "@crash/eslint-config",
  "version": "0.0.1",
  "private": true,
  "exports": {
    "./node.mjs": "./node.mjs",
    "./react.mjs": "./react.mjs",
    "./prettier.cjs": "./prettier.cjs"
  },
  "dependencies": {
    "@prdev-solutions/eslint-config": "^2.6.3"
  }
}
```

Os consumidores referenciam por nome com `workspace:*`:

```json
// services/games/package.json
{
  "dependencies": {
    "@crash/events": "workspace:*"    // ← referencia o package local
  },
  "devDependencies": {
    "@crash/eslint-config": "workspace:*"
  }
}
```

`workspace:*` instrui o Bun a resolver esse pacote pelo workspace local em vez de baixar do npm. Após `bun install`, ele cria um symlink em `node_modules/@crash/events` apontando para `packages/events/`.

---

## `packages/events` — tipos compartilhados

Sem esse package, os tipos dos eventos RabbitMQ ficavam duplicados em `games` e `wallets`:

```
services/games/src/infrastructure/messaging/contracts/commands.ts   ← cópia
services/wallets/src/infrastructure/messaging/contracts/commands.ts ← cópia
```

Com o package, ambos importam da fonte única:

```typescript
// packages/events/src/commands.ts
export interface DebitWalletCommand {
  correlationId: string;
  userId: string;
  amount: number; // in cents
  roundId: string;
  betId: string;
}

export interface CreditWalletCommand {
  correlationId: string;
  userId: string;
  amount: number;
  roundId: string;
  betId: string;
  reason: "cashout" | "refund";
}

export const WALLET_COMMANDS = {
  DEBIT: "wallet.debit",
  CREDIT: "wallet.credit",
} as const;
```

```typescript
// packages/events/src/index.ts
export * from "./commands";
export * from "./events";
```

Os arquivos de contrato nos serviços viram re-exports:

```typescript
// services/games/src/infrastructure/messaging/contracts/commands.ts
export {
  type DebitWalletCommand,
  type CreditWalletCommand,
  WALLET_COMMANDS
} from "@crash/events";
```

O restante do código (`wallet-client.service.ts`, testes, etc.) continua importando do caminho local `./contracts` — nenhum outro arquivo precisou mudar.

---

## `packages/eslint-config` — config centralizada

Centraliza as regras de ESLint e Prettier para não repetir as mesmas dependências em cada workspace.

```
packages/eslint-config/
  node.mjs       ← config para serviços Node/NestJS
  react.mjs      ← config para o frontend React
  prettier.cjs   ← re-exporta as regras de Prettier
  package.json   ← depende de @prdev-solutions/eslint-config
```

```javascript
// packages/eslint-config/node.mjs
import NodeConfig from "@prdev-solutions/eslint-config/node.mjs";

export default [
  ...NodeConfig,
  { ignores: ["./**/generated/*"] }   // ignora código gerado pelo Prisma
];
```

```javascript
// packages/eslint-config/react.mjs
import ReactConfig from "@prdev-solutions/eslint-config/react.mjs";

export default [
  ...ReactConfig,
  { ignores: ["dist/**"] }
];
```

```javascript
// packages/eslint-config/prettier.cjs
module.exports = require("@prdev-solutions/eslint-config/prettier.cjs");
```

Cada workspace importa a config centralizada:

```javascript
// services/games/eslint.config.mjs
import config from "@crash/eslint-config/node.mjs";
export default config;

// frontend/eslint.config.mjs
import config from "@crash/eslint-config/react.mjs";
export default config;
```

```javascript
// services/games/prettier.config.cjs
const { nodePrettier } = require("@crash/eslint-config/prettier.cjs");
module.exports = { ...nodePrettier };

// frontend/prettier.config.cjs
const { reactPrettier } = require("@crash/eslint-config/prettier.cjs");
module.exports = { ...reactPrettier };
```

Resultado: `@prdev-solutions/eslint-config` instalado **uma vez** em `packages/eslint-config`, disponível para todos via hoisting do workspace.

---

## Como o Bun resolve imports

Quando `services/games` importa `@crash/events`:

```
1. Bun procura em services/games/node_modules/@crash/events  → não existe
2. Sobe um nível: services/node_modules/@crash/events        → não existe
3. Sobe: node_modules/@crash/events                          → symlink para packages/events/
4. Lê packages/events/package.json, campo "exports"
5. Resolve o arquivo: packages/events/src/index.ts
```

Como Bun executa TypeScript nativamente, não precisa de build para o package `@crash/events` — o `.ts` é consumido diretamente.

---

## O `exports` field no package.json

O campo `exports` define quais caminhos são acessíveis de fora do package:

```json
{
  "exports": {
    ".": "./src/index.ts",          // import "@crash/events" → index.ts
    "./commands": "./src/commands.ts" // import "@crash/events/commands" → commands.ts
  }
}
```

Paths não listados no `exports` são privados — qualquer tentativa de importá-los direto gera erro. Isso é encapsulamento de módulo.

---

## Para projetos próprios

Estrutura mínima para um monorepo com Bun:

```
meu-projeto/
  package.json          ← workspaces: ["apps/*", "packages/*"]
  apps/
    api/
      package.json      ← { "name": "@meu-projeto/api" }
    web/
      package.json      ← { "name": "@meu-projeto/web" }
  packages/
    types/
      package.json      ← { "name": "@meu-projeto/types", "exports": { ".": "./src/index.ts" } }
      src/index.ts
```

```json
// apps/api/package.json
{
  "dependencies": {
    "@meu-projeto/types": "workspace:*"
  }
}
```

Um `bun install` na raiz instala tudo e linka os packages locais.
