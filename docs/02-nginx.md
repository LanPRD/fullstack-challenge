# Nginx — Servidor para Frontend em Produção

## Por que usar Nginx com um SPA?

Um SPA (Single Page Application) em React é um conjunto de arquivos estáticos: `index.html`, `.js`, `.css`. Qualquer servidor HTTP pode servi-los, mas há dois problemas específicos de SPAs que o Nginx precisa resolver:

1. **Roteamento client-side**: o React Router controla URLs como `/dashboard` ou `/game`. Se o usuário acessa essa URL diretamente ou recarrega a página, o servidor não sabe o que fazer — ele procura um arquivo chamado `/dashboard` que não existe. O Nginx precisa redirecionar tudo para o `index.html`.

2. **Cache de assets**: arquivos `.js` e `.css` gerados pelo Vite têm hashes no nome (`main.a3f2b1.js`). O hash muda a cada build, então podem ser cacheados para sempre no browser. O `index.html` em si não tem hash — nunca deve ser cacheado.

---

## Configuração usada neste projeto

```nginx
# frontend/nginx.conf

server {
    listen 3000;
    server_name _;                        # aceita qualquer hostname
    root /usr/share/nginx/html;           # onde estão os arquivos do build
    index index.html;

    # Compressão gzip para reduzir tráfego
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    # Rota principal — resolve o problema do roteamento client-side
    location / {
        try_files $uri $uri/ /index.html;
        # Tenta: arquivo exato → pasta → fallback para index.html
    }

    # Assets com hash: cache permanente (1 ano)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### O que `try_files $uri $uri/ /index.html` faz

```text
Requisição: GET /game

1. Tenta servir o arquivo  → /usr/share/nginx/html/game        (não existe)
2. Tenta servir como pasta → /usr/share/nginx/html/game/       (não existe)
3. Fallback               → /usr/share/nginx/html/index.html   (existe, serve)
```

O browser recebe o `index.html`, o React hidrata e o React Router lê a URL atual e renderiza a rota `/game`.

### Cache Strategy

| Tipo de arquivo            | Cache                 | Motivo                                            |
| -------------------------- | --------------------- | ------------------------------------------------- |
| `index.html`               | Nenhum (padrão Nginx) | Precisa estar sempre atualizado                   |
| `*.js`, `*.css` (com hash) | 1 ano, imutável       | Nome muda a cada deploy, pode cachear para sempre |
| Imagens, fontes            | 1 ano, imutável       | Raramente mudam                                   |

`immutable` diz ao browser que pode usar o cache sem nem fazer requisição para verificar se mudou (sem `If-None-Match`). Isso é seguro porque o Vite garante que o hash muda quando o conteúdo muda.

---

## Como o Nginx entra no container

No Dockerfile do frontend:

```dockerfile
FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html   # assets compilados
COPY nginx.conf /etc/nginx/conf.d/default.conf        # substitui config padrão
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

`daemon off;` é necessário porque o Docker espera que o processo principal fique em foreground. O Nginx por padrão daemoniza (vai para background e o processo principal encerra), o que faria o container parar imediatamente.

---

## Para projetos próprios

O template mínimo para qualquer SPA:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Se precisar de HTTPS em produção, use um reverse proxy na frente (Traefik, Caddy, ou o próprio Nginx com certbot) em vez de configurar SSL dentro deste servidor.
