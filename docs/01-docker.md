# Docker e Docker Compose

## O que é e por que usar

Docker empacota uma aplicação junto com tudo o que ela precisa (runtime, dependências, variáveis de ambiente) em uma unidade chamada **container**. O resultado é que o ambiente de execução é idêntico na máquina de qualquer desenvolvedor e no servidor de produção.

Docker Compose orquestra múltiplos containers ao mesmo tempo, define como eles se comunicam e em qual ordem sobem.

---

## Dockerfile — receita para construir uma imagem

Um Dockerfile é executado de cima para baixo. Cada instrução cria uma **layer** (camada) que fica em cache. Quando você reconstrói a imagem, só re-executa as camadas que mudaram.

### Serviço Node/Bun (backend)

Este projeto usa Bun Workspaces. O `bun install` precisa conhecer todos os `package.json` do monorepo para resolver referências `workspace:*` — por isso o build context é a **raiz** do projeto, não a pasta do serviço.

```dockerfile
# services/games/Dockerfile

FROM oven/bun:1-alpine
WORKDIR /app

# Copia todos os manifests do monorepo ANTES do código
# Necessário porque bun install precisa resolver workspace:*
COPY package.json bun.lock ./
COPY packages/events/package.json     ./packages/events/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY services/games/package.json      ./services/games/
COPY services/wallets/package.json    ./services/wallets/
COPY frontend/package.json            ./frontend/
RUN bun install                       # layer cacheada enquanto os manifests não mudam

# Copia o código-fonte
COPY packages/events/src              ./packages/events/src
COPY services/games/src               ./services/games/src
COPY services/games/prisma            ./services/games/prisma
COPY services/games/tsconfig.json     ./services/games/
COPY services/games/prisma.config.ts  ./services/games/

WORKDIR /app/services/games
EXPOSE 4001
CMD ["sh", "-c", "bunx prisma migrate deploy && bun run src/main.ts"]
```

**Por que copiar tantos `package.json` separados?**
O Docker re-executa uma camada apenas quando ela ou as anteriores mudam. Copiando só os manifests primeiro, o `bun install` (camada cara) só roda quando dependências mudam — não a cada mudança de código.

O `build context` no `docker-compose.yml` deve ser `.` (raiz) para que esses arquivos existam:

```yaml
games:
  build:
    context: .                          # raiz do monorepo
    dockerfile: services/games/Dockerfile
```

### Frontend — multi-stage build

O frontend usa dois estágios. O primeiro compila os assets, o segundo serve apenas o resultado estático — sem Node, sem código-fonte, sem devDependencies na imagem final. O mesmo padrão de múltiplos `package.json` se aplica aqui.

```dockerfile
# frontend/Dockerfile

# --- Estágio 1: build ---
FROM oven/bun:1.3 AS builder
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/events/package.json     ./packages/events/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY services/games/package.json      ./services/games/
COPY services/wallets/package.json    ./services/wallets/
COPY frontend/package.json            ./frontend/
RUN bun install

COPY packages/events/src              ./packages/events/src
COPY frontend/src                     ./frontend/src
COPY frontend/public                  ./frontend/public
COPY frontend/index.html              ./frontend/
COPY frontend/tsconfig.json           ./frontend/
COPY frontend/vite.config.ts          ./frontend/
WORKDIR /app/frontend
RUN bun run build           # gera /app/frontend/dist com HTML, JS e CSS minificados

# --- Estágio 2: serve ---
FROM nginx:1.27-alpine      # imagem de ~10 MB, só o servidor HTTP
COPY --from=builder /app/frontend/dist /usr/share/nginx/html  # copia os assets compilados
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf       # configura o Nginx
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

A imagem final **não contém** Bun, TypeScript, React nem node_modules. Tem só HTML, CSS e JS estáticos — muito menor e mais segura.

---

## docker-compose.yml — orquestra tudo

```yaml
# docker-compose.yml (simplificado para entender a estrutura)

services:
  postgres:
    image: postgres:18.3-alpine
    ports:
      - "5432:5432" # host:container
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin
      POSTGRES_DB: postgres
      POSTGRES_EXTRA_DATABASES: games,wallets # variável customizada (lida pelo init script)
    volumes:
      - postgres_data:/var/lib/postgresql/data # dados persistentes
      - ./docker/postgres/init-databases.sh:/docker-entrypoint-initdb.d/init-databases.sh:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 5s
      retries: 10

  games:
    build:
      context: .                            # raiz do monorepo (necessário para workspace:*)
      dockerfile: services/games/Dockerfile
    ports:
      - "4001:4001"
    env_file:
      - ./services/games/.env  # carrega PORT, JWT_ISSUER e outras vars do .env local
    environment:
      # Sobrescreve as vars que usam hostnames Docker (não localhost)
      DATABASE_URL: postgresql://admin:admin@postgres:5432/games?schema=public
      RABBITMQ_URL: amqp://admin:admin@rabbitmq:5672
      JWT_JWKS_URI: http://keycloak:8080/realms/crash-game/protocol/openid-connect/certs
    depends_on:
      postgres:
        condition: service_healthy # só sobe depois que o healthcheck do postgres passar
      rabbitmq:
        condition: service_healthy
      keycloak:
        condition: service_healthy

volumes:
  postgres_data: # volume nomeado: persiste dados entre reinicializações
  rabbitmq_data:
```

**Por que `env_file` e `environment` juntos?**
O `env_file` carrega variáveis do `.env` local (ex: `PORT=4001`, `JWT_ISSUER`). O bloco `environment` sobrescreve apenas as que precisam de hostnames Docker — dentro de um container, `localhost` não resolve para outros serviços; é preciso usar o nome do serviço como hostname (`postgres`, `rabbitmq`, `keycloak`).

### Conceitos-chave

| Conceito                                 | O que faz                                                                         |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| `ports: "5432:5432"`                     | Expõe a porta do container no host. Formato `HOST:CONTAINER`                      |
| `volumes:`                               | Monta arquivos/pastas ou cria volumes persistentes                                |
| `depends_on: condition: service_healthy` | Aguarda o healthcheck de outro serviço antes de subir                             |
| `env_file:`                              | Injeta um arquivo `.env` inteiro como variáveis de ambiente                       |
| `healthcheck:`                           | Comando que o Docker executa periodicamente para saber se o serviço está saudável |

### Volumes: nomeados vs bind mounts

```yaml
volumes:
  # Bind mount: monta uma pasta local dentro do container (útil para configurações)
  - ./docker/postgres/init-databases.sh:/docker-entrypoint-initdb.d/init-databases.sh:ro

  # Volume nomeado: gerenciado pelo Docker, persiste dados entre `docker compose down`
  - postgres_data:/var/lib/postgresql/data
```

O `:ro` no final é "read-only" — o container pode ler mas não escrever.

---

## Script de inicialização do Postgres

O Postgres oficial executa automaticamente qualquer script em `/docker-entrypoint-initdb.d/` na primeira vez que sobe. Neste projeto, isso cria os bancos `games` e `wallets` a partir de uma variável customizada:

```bash
# docker/postgres/init-databases.sh
IFS=',' read -ra DATABASES <<< "$POSTGRES_EXTRA_DATABASES"
for db in "${DATABASES[@]}"; do
  psql ... <<-EOSQL
    SELECT 'CREATE DATABASE "$db"' WHERE NOT EXISTS (...)\gexec
EOSQL
done
```

O `WHERE NOT EXISTS` torna o script idempotente — pode rodar mais de uma vez sem erro.

---

## Comandos do dia a dia

```bash
# Sobe todos os serviços em background
docker compose up -d

# Sobe reconstruindo as imagens (após mudanças no Dockerfile ou código)
docker compose up -d --build

# Ver logs de um serviço
docker compose logs -f games

# Parar tudo (mantém volumes)
docker compose down

# Parar e apagar volumes (banco zerado)
docker compose down -v

# Remover tudo: containers, volumes, imagens construídas
docker compose down -v --rmi all --remove-orphans
```

---

## Dicas para projetos próprios

- Sempre use `alpine` como imagem base quando possível — imagens menores sobem mais rápido e têm menos superfície de ataque.
- Use multi-stage build para qualquer frontend. A imagem de build nunca deve ir para produção.
- Coloque `healthcheck` nos serviços que outros dependem — o `depends_on: condition: service_healthy` só funciona se o serviço alvo tiver healthcheck definido.
- Não comite arquivos `.env` com credenciais reais. Comite um `.env.example` com os nomes das variáveis e valores de exemplo.
