# Rate Limiting no NestJS

## O que é e por que usar

Rate limiting (limitação de taxa) controla quantas requisições um cliente pode fazer em um intervalo de tempo. Protege contra:

- Ataques de força bruta (adivinhar senhas)
- Abuso de API (scraping, bots)
- Overload acidental (loop no cliente)
- Em jogos: impede que um usuário aposte centenas de vezes por segundo

---

## Como funciona no NestJS (@nestjs/throttler)

O Throttler armazena um contador por cliente (identificado por IP por padrão) em memória. A cada request, ele verifica se o cliente ultrapassou o limite na janela de tempo (TTL). Se sim, retorna HTTP 429 Too Many Requests.

---

## Configuração neste projeto

### 1. Registrar o módulo com múltiplos throttlers

```typescript
// src/app.module.ts
ThrottlerModule.forRoot([
  {
    name: "default", // nome usado para referenciar no @Throttle()
    ttl: 60_000, // janela de 60 segundos (em ms)
    limit: 60, // máximo de 60 requests por janela
  },
  {
    name: "bet",
    ttl: 60_000,
    limit: 5, // endpoints de aposta: máximo 5 por minuto
  },
]);
```

Múltiplos throttlers permitem políticas diferentes por endpoint — um throttler global permissivo e um restritivo para ações sensíveis.

### 2. Aplicar o guard globalmente

```typescript
// src/app.module.ts
providers: [
  {
    provide: APP_GUARD,
    useClass: ThrottlerGuard, // aplica em todos os endpoints por padrão
  },
];
```

### 3. Sobrescrever por endpoint

```typescript
// src/presentation/controllers/bet.controller.ts
@Post()
@Throttle({ bet: { ttl: 60_000, limit: 5 } })
// Usa a política "bet" em vez da "default"
async placeBet() { ... }

@Post("cashout")
@Throttle({ bet: { ttl: 60_000, limit: 5 } })
async cashout() { ... }
```

O decorator `@Throttle()` recebe um objeto onde as chaves são os nomes dos throttlers definidos no módulo. Você pode sobrescrever `ttl` e `limit` por endpoint.

### 4. Excluir um endpoint do rate limiting

```typescript
@SkipThrottle()
@Get("health")
health() { return { status: "ok" }; }
```

---

## Resposta quando o limite é excedido

```json
HTTP/1.1 429 Too Many Requests
Retry-After: 60

{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

---

## Raciocínio por trás dos limites deste projeto

| Throttler | Limite | Raciocínio                                                     |
| --------- | ------ | -------------------------------------------------------------- |
| `default` | 60/min | ~1 req/seg para navegação normal                               |
| `bet`     | 5/min  | Ação financeira — limitada deliberadamente para prevenir abuso |

Para endpoints sensíveis como apostas, o limite baixo não é só proteção técnica — é uma regra de negócio. Você não quer que um usuário consiga colocar 50 apostas programaticamente em poucos segundos.

---

## Armazenamento: memória vs Redis

Por padrão, o Throttler armazena os contadores **em memória**. Isso funciona para uma instância única, mas falha em múltiplas instâncias (cada instância tem seu próprio contador — o limite efetivo multiplica pelo número de instâncias).

Para produção com múltiplas instâncias, use o adapter de Redis:

```typescript
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";

ThrottlerModule.forRoot({
  throttlers: [...],
  storage: new ThrottlerStorageRedisService({ host: "redis", port: 6379 })
})
```

---

## Para projetos próprios

Template base que resolve 90% dos casos:

```typescript
// app.module.ts
ThrottlerModule.forRoot([
  { name: "global", ttl: 60_000, limit: 100 },
  { name: "strict", ttl: 60_000, limit: 10 }
]),
// ...
providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
```

```typescript
// Endpoints normais: herdam o "global" automaticamente

// Endpoints sensíveis: sobrescrevem com "strict"
@Throttle({ strict: { ttl: 60_000, limit: 10 } })
@Post("login")
async login() { ... }

// Endpoints de infra: sem limite
@SkipThrottle()
@Get("health")
async health() { ... }
```

Instale com:

```bash
bun add @nestjs/throttler
```
