# Crash Game

Jogo multiplayer de crash em tempo real. Um multiplicador sobe a partir de `1.00×` e pode crashar a qualquer momento — cada jogador aposta antes da rodada e deve sacar antes do crash para garantir os ganhos.

Construído como solução completa para um desafio técnico sênior de fullstack. O foco estava nas decisões de arquitetura: microserviços com comunicação assíncrona, DDD aplicado, provably fair e sincronização em tempo real.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Bun |
| Backend | NestJS · TypeScript strict |
| ORM | Prisma |
| Banco | PostgreSQL 18 |
| Mensageria | RabbitMQ |
| API Gateway | Kong (DB-less) |
| Auth | Keycloak 26 (OIDC + PKCE) |
| WebSocket | Socket.io via `@nestjs/websockets` |
| Frontend | React · Vite · TypeScript |
| Estado | TanStack Query · Zustand |
| Estilo | Tailwind CSS |
| Testes | Bun test runner (unit + E2E) |
| Infra | Docker Compose · Bun workspaces |

---

## Arquitetura

```
Frontend (React)
      │
      ▼
  Kong :8000          API Gateway — roteamento e rate limiting
   ├── /games  ──────► Games Service :4001    NestJS · DDD
   └── /wallets ─────► Wallets Service :4002  NestJS · DDD
                              │
                         RabbitMQ              Comunicação assíncrona
                              │
                         PostgreSQL            Schema isolado por serviço

  Keycloak :8080        IdP — emissão e validação de JWT (RS256 + JWKS)
```

O sistema é dividido em dois bounded contexts independentes:

**Games Service** — ciclo de vida das rodadas, apostas, motor de jogo, WebSocket e algoritmo provably fair.

**Wallets Service** — carteira do jogador, débito e crédito. Dinheiro armazenado em centavos (`BIGINT`) — sem ponto flutuante.

---

## Decisões técnicas relevantes

**Débito síncrono via RabbitMQ request-response**

A arquitetura inicial usava fire-and-forget para débito: o Games Service salvava a aposta e enviava o comando de débito sem aguardar resposta, retornando HTTP 200 imediatamente. Isso criava uma janela onde um usuário podia sacar antes do débito ser processado — recebendo crédito sem saldo suficiente.

A solução foi mudar o padrão de `emit` para `send` (RPC sobre RabbitMQ): o Games Service aguarda a resposta do Wallets antes de confirmar a aposta. Se o débito falhar, a aposta é cancelada sincronicamente e o backend retorna HTTP 400 ao cliente.

**Provably fair**

O crash point de cada rodada é determinado por um seed gerado antes das apostas, usando HMAC-SHA256. O hash do seed é publicado no início da rodada; o seed completo é revelado após o crash — permitindo verificação independente pelo jogador via `GET /rounds/:id/verify`.

**DDD com camadas explícitas**

Cada serviço segue `domain → application → infrastructure → presentation`. Entidades de domínio sem dependências externas, use cases orquestrando a lógica, repositórios abstratos no domínio implementados na infraestrutura com Prisma.

**Monorepo com Bun workspaces**

Tipos dos eventos RabbitMQ compartilhados via `@crash/events` (`packages/events/`), evitando duplicação e garantindo contrato único entre os serviços. O build Docker usa a raiz como contexto para que o `bun install` resolva as referências `workspace:*`.

---

## Como rodar

**Pré-requisitos:** Docker e Docker Compose.

```bash
git clone <repo>
cd fullstack-challenge
docker compose up -d
```

Aguarde todos os serviços ficarem healthy (~60s pelo Keycloak). Acesse `http://localhost:3000`.

**Usuário de teste:** `player` / `player123`

Para adicionar saldo, use o Prisma Studio do serviço wallets:

```bash
cd services/wallets && bunx prisma studio
```

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API (via Kong) | http://localhost:8000 |
| Swagger — Games | http://localhost:4001/docs |
| Swagger — Wallets | http://localhost:4002/docs |
| RabbitMQ UI | http://localhost:15672 (admin/admin) |
| Keycloak | http://localhost:8080 (admin/admin) |

---

## Testes

```bash
# Unitários — Games
cd services/games && bun test tests/unit

# Unitários — Wallets
cd services/wallets && bun test tests/unit

# E2E — requer docker compose up
cd services/games && bun test tests/e2e
```

---

## Estrutura

```
fullstack-challenge/
├── services/
│   ├── games/          NestJS — motor do jogo, apostas, WebSocket
│   └── wallets/        NestJS — carteiras, débito/crédito
├── packages/
│   └── events/         @crash/events — contratos RabbitMQ compartilhados
├── frontend/           React + Vite — UI do jogo
├── docker/
│   ├── kong/           kong.yml — configuração declarativa do gateway
│   ├── keycloak/       realm-export.json — realm importado automaticamente
│   └── postgres/       init-databases.sh — cria os schemas games e wallets
├── docs/               Documentação técnica detalhada
└── docker-compose.yml
```

---

## Documentação técnica

Decisões de infraestrutura documentadas em [`docs/`](./docs/):

- [`01-docker.md`](./docs/01-docker.md) — Build context, multi-stage, workspaces no Docker
- [`02-nginx.md`](./docs/02-nginx.md) — Serving de SPA e estratégia de cache
- [`03-keycloak.md`](./docs/03-keycloak.md) — OIDC, PKCE, validação de JWT no backend
- [`04-kong.md`](./docs/04-kong.md) — API Gateway DB-less, roteamento, plugins
- [`05-rate-limiting.md`](./docs/05-rate-limiting.md) — Throttling por rota no NestJS
- [`06-monorepo-workspaces.md`](./docs/06-monorepo-workspaces.md) — Bun workspaces e pacotes compartilhados
- [`Desafio.md`](./docs/Desafio.md) — Enunciado original do desafio
