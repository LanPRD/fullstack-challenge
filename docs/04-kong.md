# Kong — API Gateway

## O que é e para que serve

Kong é um API Gateway: um ponto único de entrada para todas as requisições do frontend. Em vez de o frontend saber que existe um serviço de games na porta 4001 e um de wallets na porta 4002, ele só conhece uma URL — a do Kong (porta 8000).

```
Frontend (3000)
      |
      v
  Kong (8000)          ← único endereço que o frontend conhece
   /games  ──────────→  games service (4001)
   /wallets ─────────→  wallets service (4002)
```

Vantagens além do roteamento:
- Rate limiting, autenticação, logs, CORS — configurados uma vez no gateway, valem para todos os serviços
- Os serviços ficam inacessíveis diretamente (sem portas expostas em produção)
- Facilita versionar APIs (`/v1/games`, `/v2/games`) sem mudar os serviços

---

## Modo DB-less (declarativo)

Kong tem dois modos: com banco de dados (configuração via API REST) e **DB-less** (configuração via arquivo YAML). Este projeto usa DB-less — mais simples para desenvolvimento, fácil de versionar no git.

```yaml
# docker-compose.yml
kong:
  environment:
    KONG_DATABASE: "off"                            # desativa banco de dados
    KONG_DECLARATIVE_CONFIG: /kong/kong.yml         # lê config do arquivo
  volumes:
    - ./docker/kong:/kong:ro
```

---

## Configuração do Kong neste projeto

```yaml
# docker/kong/kong.yml

_format_version: "3.0"

services:
  - name: games-service
    url: http://games:4001          # nome do container no docker-compose como hostname
    routes:
      - name: games-routes
        paths:
          - /games
        strip_path: true            # remove /games antes de encaminhar

  - name: wallets-service
    url: http://wallets:4002
    routes:
      - name: wallets-routes
        paths:
          - /wallets
        strip_path: true
```

### O que `strip_path: true` faz

```
Request do frontend:   GET http://localhost:8000/games/bet
Kong encaminha como:   GET http://games:4001/bet
```

Sem `strip_path`, o serviço receberia `/games/bet` e precisaria ter essa rota registrada com o prefixo. Com `strip_path: true`, o serviço só precisa saber sobre `/bet`.

### Comunicação interna via nome do container

Dentro de uma rede Docker Compose, os containers se resolvem pelo nome do serviço como se fosse um hostname DNS. `http://games:4001` funciona porque o container `games` está na mesma rede que o Kong.

---

## Diagrama de rede completo

```
                    ┌─────────────────────────────┐
                    │        Docker network        │
                    │                              │
Browser ──8000──> Kong ──4001──> games            │
                    │    ──4002──> wallets         │
                    │    ──8080──> keycloak        │
                    │    ──5432──> postgres        │
                    │    ──5672──> rabbitmq        │
                    └─────────────────────────────┘
```

Em produção, só a porta 8000 do Kong (e 3000 do frontend) ficaria pública. Postgres, RabbitMQ e os serviços internos não teriam portas expostas ao host.

---

## Plugins comuns do Kong

Kong tem um ecossistema de plugins. Os mais usados:

| Plugin | O que faz |
|---|---|
| `rate-limiting` | Limita requests por IP/consumer |
| `jwt` | Valida tokens JWT no gateway (antes de chegar no serviço) |
| `cors` | Adiciona headers CORS |
| `request-transformer` | Modifica headers e body das requisições |
| `response-transformer` | Modifica a resposta antes de enviar ao cliente |
| `proxy-cache` | Cache de respostas |

Exemplo de como adicionar rate limiting via kong.yml:

```yaml
services:
  - name: games-service
    url: http://games:4001
    plugins:
      - name: rate-limiting
        config:
          minute: 100
          policy: local
    routes:
      - name: games-routes
        paths: [/games]
        strip_path: true
```

Neste projeto, o rate limiting foi implementado no próprio NestJS (ThrottlerModule) em vez de no Kong — ambas as abordagens são válidas. Fazer no serviço dá mais controle por rota; fazer no Kong centraliza a política.

---

## Admin API

Kong expõe uma API administrativa na porta 8001. Serve para inspecionar a configuração atual:

```bash
# Ver todos os serviços configurados
curl http://localhost:8001/services

# Ver todas as rotas
curl http://localhost:8001/routes

# Ver status do Kong
curl http://localhost:8001/status
```

Em modo DB-less, essa API é somente leitura — você não pode criar rotas via API, só via arquivo.

---

## Para projetos próprios

O template mínimo de `kong.yml` para qualquer projeto:

```yaml
_format_version: "3.0"

services:
  - name: meu-servico
    url: http://meu-servico:3000
    routes:
      - name: minha-rota
        paths: [/api]
        strip_path: true
```

Kong DB-less é ideal para ambientes de desenvolvimento e CI. Para produção com múltiplos nós Kong, o modo com banco de dados (PostgreSQL ou Cassandra) é mais adequado — permite sincronizar configuração entre instâncias.
