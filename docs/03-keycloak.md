# Keycloak — Identity Provider (IdP)

## O que é

Keycloak é um servidor de identidade open-source. Ele gerencia usuários, autenticação e emite tokens JWT seguindo o padrão **OpenID Connect (OIDC)** — que é uma camada de identidade sobre o OAuth 2.0.

A ideia central: **você terceiriza a autenticação para o Keycloak**. Seus serviços não armazenam senhas, não gerenciam sessões, não fazem hash de credenciais. Eles só validam o token JWT que o Keycloak emitiu.

```text
Browser → Keycloak (login) → token JWT
Browser → API (token no header) → API valida token com Keycloak
```

---

## Conceitos fundamentais

| Conceito          | O que é                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| **Realm**         | Namespace isolado. Um realm tem seus próprios usuários, clientes e configurações.                         |
| **Client**        | Representa uma aplicação que usa o Keycloak (o frontend, uma API).                                        |
| **Public client** | Client sem segredo — adequado para SPAs, pois o código é exposto no browser.                              |
| **PKCE**          | Extensão de segurança para public clients. Gera um desafio criptográfico para trocar o código pelo token. |
| **JWKS**          | JSON Web Key Set — endpoint público com as chaves públicas do Keycloak para verificar tokens.             |

---

## Configuração do realm neste projeto

```json
// docker/keycloak/realm-export.json

{
  "realm": "crash-game",
  "enabled": true,
  "accessTokenLifespan": 3600, // token expira em 1 hora
  "clients": [
    {
      "clientId": "crash-game-client",
      "publicClient": true, // SPA: sem client_secret
      "standardFlowEnabled": true, // fluxo Authorization Code
      "redirectUris": ["http://localhost:3000/*", "http://localhost:5173/*"],
      "webOrigins": ["http://localhost:3000", "http://localhost:5173"],
      "attributes": {
        "pkce.code.challenge.method": "S256" // exige PKCE com SHA-256
      }
    }
  ],
  "users": [
    {
      "username": "player",
      "credentials": [{ "type": "password", "value": "player123" }]
    }
  ]
}
```

O arquivo é importado automaticamente pelo Keycloak ao subir com `--import-realm`:

```yaml
# docker-compose.yml
keycloak:
  image: quay.io/keycloak/keycloak:26.5.5
  command: start-dev --import-realm
  volumes:
    - ./docker/keycloak:/opt/keycloak/data/import:ro
```

---

## Fluxo de autenticação (Authorization Code + PKCE)

```text
1. Usuário clica em "Entrar"
2. Frontend redireciona para:
   http://localhost:8080/realms/crash-game/protocol/openid-connect/auth
   ?client_id=crash-game-client
   &response_type=code
   &redirect_uri=http://localhost:3000/
   &code_challenge=<hash>        ← PKCE
   &code_challenge_method=S256

3. Keycloak exibe tela de login
4. Usuário digita credenciais
5. Keycloak redireciona de volta com ?code=<authorization_code>

6. Frontend troca o code por tokens:
   POST /realms/crash-game/protocol/openid-connect/token
   { code, code_verifier, redirect_uri }

7. Keycloak retorna { access_token, refresh_token, id_token }
8. Frontend guarda o access_token e envia em cada request: Authorization: Bearer <token>
```

---

## Integração no frontend (keycloak-js)

```typescript
// src/lib/keycloak.ts
import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: "http://localhost:8080",
  realm: "crash-game",
  clientId: "crash-game-client",
});

export default keycloak;
```

```typescript
// src/App.tsx — inicializa na montagem
const authenticated = await keycloak.init({
  onLoad: "check-sso", // verifica sessão existente sem redirecionar
  pkceMethod: "S256", // exige PKCE
  silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
});

// Renova o token antes de expirar
keycloak.onTokenExpired = () => {
  void keycloak.updateToken(30).catch(() => keycloak.logout());
};
```

O `check-sso` silencioso usa um iframe apontando para `/silent-check-sso.html` — um arquivo estático mínimo que precisa existir no `public/`:

```html
<!-- public/silent-check-sso.html -->
<html>
  <body>
    <script>
      parent.postMessage(location.href, location.origin);
    </script>
  </body>
</html>
```

---

## Integração no backend (NestJS)

O backend **nunca chama o Keycloak durante uma requisição**. Ele baixa as chaves públicas do JWKS uma vez (com cache) e usa-as para verificar a assinatura do token localmente.

```typescript
// jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(envService: EnvService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer: envService.get("JWT_ISSUER"), // http://localhost:8080/realms/crash-game
      algorithms: ["RS256"], // Keycloak usa RSA
      secretOrKeyProvider: passportJwtSecret({
        jwksUri: envService.get("JWT_JWKS_URI"),
        // http://localhost:8080/realms/crash-game/protocol/openid-connect/certs
        cache: true, // baixa as chaves uma vez
        rateLimit: true, // evita flood no Keycloak
        jwksRequestsPerMinute: 5,
      }),
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      id: payload.sub, // ID único do usuário (UUID)
      email: payload.email,
      username: payload.preferred_username,
    };
  }
}
```

O `APP_GUARD` aplica o guard em todos os endpoints por padrão. Rotas públicas usam o decorator `@Public()`:

```typescript
// auth.module.ts
{
  provide: APP_GUARD,
  useClass: JwtAuthGuard    // protege tudo por padrão
}

// Em um controller:
@Public()                   // exceção: não exige token
@Get("health")
health() { return { status: "ok" }; }
```

Acessar o usuário autenticado em um endpoint:

```typescript
@Post()
async placeBet(
  @Body() dto: PlaceBetDto,
  @CurrentUser() user: AuthUser   // extraído do token pelo JwtStrategy.validate()
) {
  // user.id é o sub do JWT — mesmo ID usado no banco
}
```

---

## Variáveis de ambiente necessárias

```bash
# Desenvolvimento local (fora do Docker)
JWT_JWKS_URI=http://localhost:8080/realms/crash-game/protocol/openid-connect/certs
JWT_ISSUER=http://localhost:8080/realms/crash-game
```

**Dentro do Docker, o hostname muda.** O `JWT_JWKS_URI` precisa usar o nome do container como hostname — `localhost` dentro de um container aponta para o próprio container, não para o Keycloak. Por isso o `docker-compose.yml` sobrescreve essa variável via `environment`:

```yaml
# docker-compose.yml
games:
  env_file:
    - ./services/games/.env       # JWT_ISSUER=http://localhost:8080/... (correto: é o iss do token)
  environment:
    JWT_JWKS_URI: http://keycloak:8080/realms/crash-game/protocol/openid-connect/certs
    #                  ↑ hostname do container, não localhost
```

O `JWT_ISSUER` permanece com `localhost` porque o Keycloak emite tokens com `iss = URL pública (localhost:8080)`. A validação do `iss` no backend precisa bater com o que está dentro do token — e o token foi gerado pelo browser apontando para `localhost`.

---

## Healthcheck no Docker

O Keycloak 26+ expõe o endpoint de health na **porta de management (9000)**, não na porta principal (8080). O healthcheck no `docker-compose.yml` usa um truque de TCP puro para verificar isso sem depender de `curl` ou `wget` (não disponíveis na imagem):

```yaml
healthcheck:
  test: ["CMD-SHELL", "exec 3<>/dev/tcp/localhost/9000 2>/dev/null && echo ok || exit 1"]
  interval: 10s
  timeout: 10s
  retries: 20
  start_period: 60s  # Keycloak demora para inicializar; aguarda 60s antes de checar
```

`exec 3<>/dev/tcp/localhost/9000` abre uma conexão TCP na porta 9000 — se funcionar, o serviço está respondendo.

---

## Para projetos próprios

1. Crie um realm com o nome do seu projeto.
2. Crie um client com `publicClient: true` se for SPA. Se for backend-to-backend, use `publicClient: false` e configure um `clientSecret`.
3. Configure `redirectUris` com os domínios exatos da sua aplicação — qualquer URI fora dessa lista será rejeitada pelo Keycloak.
4. No backend, use `jwks-rsa` + `passport-jwt`. Nunca valide tokens consultando o Keycloak a cada request — use cache de chaves públicas.
5. O endpoint `/certs` do Keycloak é público e sem autenticação — qualquer serviço pode baixar as chaves públicas para validar tokens.
