# Docker e Docker Compose

## O que é e por que usar

Docker empacota uma aplicação junto com tudo o que ela precisa (runtime, dependências, variáveis de ambiente) em uma unidade chamada **container**. O resultado é que o ambiente de execução é idêntico na máquina de qualquer desenvolvedor e no servidor de produção.

Docker Compose orquestra múltiplos containers ao mesmo tempo, define como eles se comunicam e em qual ordem sobem.

---

## Dockerfile — receita para construir uma imagem

Um Dockerfile é executado de cima para baixo. Cada instrução cria uma **layer** (camada) que fica em cache. Quando você reconstrói a imagem, só re-executa as camadas que mudaram.

### Serviço Node/Bun (backend)

```dockerfile
# services/games/Dockerfile

FROM oven/bun:1-alpine      # imagem base: Bun em Alpine Linux (~50 MB)

WORKDIR /app                # diretório de trabalho dentro do container

COPY package.json ./        # copia só o manifesto PRIMEIRO
RUN bun install             # instala dependências (layer cacheada)

COPY . .                    # copia o restante do código

EXPOSE 4001                 # documenta a porta (não abre nada por si só)

CMD ["bun", "run", "src/main.ts"]   # comando executado ao subir o container
```

**Por que copiar `package.json` antes do código?**
O Docker re-executa uma camada apenas quando ela ou as anteriores mudam. Se você copiar tudo de uma vez, qualquer mudança de código força o `bun install` de novo. Separando as duas etapas, o `bun install` só roda quando as dependências mudam.

### Frontend — multi-stage build

O frontend usa dois estágios. O primeiro compila os assets, o segundo serve apenas o resultado estático — sem Node, sem código-fonte, sem devDependencies na imagem final.

```dockerfile
# frontend/Dockerfile

# --- Estágio 1: build ---
FROM oven/bun:1.3 AS builder
WORKDIR /app
COPY package.json ./
RUN bun install
COPY . .
RUN bun run build           # gera /app/dist com HTML, JS e CSS minificados

# --- Estágio 2: serve ---
FROM nginx:1.27-alpine      # imagem de ~10 MB, só o servidor HTTP
COPY --from=builder /app/dist /usr/share/nginx/html   # copia os assets compilados
COPY nginx.conf /etc/nginx/conf.d/default.conf        # configura o Nginx
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
      - "5432:5432"             # host:container
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin
      POSTGRES_DB: postgres
      POSTGRES_EXTRA_DATABASES: games,wallets    # variável customizada (lida pelo init script)
    volumes:
      - postgres_data:/var/lib/postgresql/data                         # dados persistentes
      - ./docker/postgres/init-databases.sh:/docker-entrypoint-initdb.d/init-databases.sh:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 5s
      retries: 10

  games:
    build:
      context: ./services/games   # pasta onde está o Dockerfile
      dockerfile: Dockerfile
    ports:
      - "4001:4001"
    env_file:
      - ./services/games/.env     # injeta variáveis de ambiente do arquivo
    depends_on:
      postgres:
        condition: service_healthy  # só sobe depois que o healthcheck do postgres passar

volumes:
  postgres_data:    # volume nomeado: persiste dados entre reinicializações
  rabbitmq_data:
```

### Conceitos-chave

| Conceito | O que faz |
|---|---|
| `ports: "5432:5432"` | Expõe a porta do container no host. Formato `HOST:CONTAINER` |
| `volumes:` | Monta arquivos/pastas ou cria volumes persistentes |
| `depends_on: condition: service_healthy` | Aguarda o healthcheck de outro serviço antes de subir |
| `env_file:` | Injeta um arquivo `.env` inteiro como variáveis de ambiente |
| `healthcheck:` | Comando que o Docker executa periodicamente para saber se o serviço está saudável |

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
