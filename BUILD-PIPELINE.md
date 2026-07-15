# Build & Publicação — TAREFA 1.4

Pipeline de build automatizado para `@detrasoft/detra-ng`.

---

## 1. Visão Geral do Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Source TS   │ ──> │   tsc (ESM)  │ ──> │ dist/esm/*   │ ──> │  npm publish │
│ + CSS + HTML │     │ + .d.ts      │     │ dist/types/* │     │  (CDN npmjs) │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       ▲                                            │
       │                                            ▼
       │                                    ┌──────────────┐
       │                                    │  tarball     │
       │                                    │  .tgz local  │
       │                                    └──────────────┘
       │
   scripts/build.mjs
   scripts/prepublish.mjs
```

---

## 2. Scripts Disponíveis

### Build

| Script | Comando | O que faz |
|--------|---------|-----------|
| **build** | `npm run build` | Compila TS, copia assets, valida artefatos |
| **build:watch** | `npm run build:watch` | Rebuild incremental em watch mode |
| **build:dry** | `npm run build:dry` | Roda todo o pipeline sem escrever em disco |
| **clean** | `npm run clean` | Remove `dist/` |

### Publicação

| Script | Comando | O que faz |
|--------|---------|-----------|
| **prepublish:test** | `npm run prepublish:test` | Roda só as validações |
| **publish:latest** | `npm run publish:latest` | Build + publish com tag `latest` |
| **publish:beta** | `npm run publish:beta` | Bump beta + publish com tag `beta` |
| **publish:next** | `npm run publish:next` | Bump next + publish com tag `next` |
| **pack** | `npm run pack` | Gera `.tgz` local sem publicar |

### Versionamento

| Script | Comando | Versão resultante |
|--------|---------|-------------------|
| **version:patch** | `npm run version:patch` | `0.1.0` → `0.1.1` |
| **version:minor** | `npm run version:minor` | `0.1.0` → `0.2.0` |
| **version:major** | `npm run version:major` | `0.1.0` → `1.0.0` |

---

## 3. O que o `scripts/build.mjs` Faz

1. **Pre-flight** — checa versão do Node ≥ 18, valida `package.json` (`name`, `version`, `private`).
2. **Clean** — apaga `dist/`.
3. **Compile TS** — executa `tsc -p tsconfig.build.json` gerando `dist/esm/` (código) e `dist/types/` (declarações `.d.ts`).
4. **Copy assets** — copia `.css`, `.html`, `.svg`, `.json` de `projects/detra-ng/src/` para `dist/esm/`.
5. **Post-flight** — verifica que `dist/esm/index.js` e `dist/types/index.d.ts` foram gerados.

Tudo roda **sem dependências externas** (só Node nativo) — sem `rimraf`, sem `ts-node`, sem `webpack`.

---

## 4. O que o `scripts/prepublish.mjs` Faz

Roda automaticamente via hook `prepublishOnly` antes de qualquer `npm publish`. Valida:

- ✅ `package.json` parseável
- ✅ Escopo correto (`@detrasoft/...`)
- ✅ Versão presente
- ✅ License MIT
- ✅ Arquivo `LICENSE` presente
- ✅ `README.md` presente (aviso, não bloqueia)
- ✅ `dist/esm/index.js` e `dist/types/index.d.ts` existem
- ✅ `.npmignore` adequado (aviso)
- ✅ Working tree do git limpo (aviso)
- ✅ Autenticado no npm (`npm whoami`)

Se qualquer checagem crítica falhar, o publish é **abortado**.

---

## 5. Estrutura Gerada após Build

```
dist/
├── esm/
│   ├── index.js                  # entry-point principal
│   ├── components/
│   │   ├── button/
│   │   │   ├── button.component.js
│   │   │   └── button.component.css
│   │   └── ... (19 componentes)
│   ├── tokens/
│   └── base/
└── types/
    ├── index.d.ts                # tipos principais
    ├── components/
    │   └── .../
    └── ...
```

---

## 6. Comando Único: Build + Publicar

```bash
# Versão estável
npm run publish:latest

# Versão beta (pre-release automático)
npm run publish:beta

# Apenas build local (sem publicar)
npm run build

# Apenas verificar tudo (sem publicar)
npm run prepublish:test
```

> 💡 O `npm publish` automaticamente chama `prepublishOnly`, então o pipeline completo é:
> `prepublish.mjs → build.mjs → npm publish`

---

## 7. Integração Contínua (CI)

Já configurado em `.github/workflows/publish.yml`. Em todo push na `main` ou manualmente:

1. Faz checkout
2. Setup Node 20
3. `npm ci` (instala deps)
4. `npm run build`
5. Roda `prepublish.mjs`
6. Bump de versão (`patch` por padrão)
7. `npm publish --access=public` (autenticado via `NODE_AUTH_TOKEN`)
8. Commit + tag automático

---

## 8. Troubleshooting

### "Cannot find module 'tslib'"

```bash
npm install
```

### "Module not found: Can't resolve '@angular/cdk/overlay'"

O consumidor não tem `@angular/cdk`. Instale como peer:

```bash
npm install @angular/cdk@^17
```

### "Trying to publish over the previously published versions"

Você está tentando republicar a mesma versão. Bump:

```bash
npm version patch
```

### "prepublishOnly falhou mas eu sei que tá tudo OK"

Rode manualmente para ver o erro detalhado:

```bash
node scripts/prepublish.mjs
```

---

## 9. Local Test (Link Simbólico)

Para testar a lib localmente em outro projeto sem publicar:

```bash
# Na pasta da lib
cd /path/to/detra-ng
npm run build
npm link

# No projeto consumidor
cd /path/to/consumer-app
npm link @detrasoft/detra-ng
# Edite qualquer arquivo, rode `npm run build` na lib e o consumer pega na hora (graças ao symlink).
```

Para desfazer:

```bash
# No consumer
npm unlink @detrasoft/detra-ng

# Na lib
npm unlink
```

---

## 10. Checklist de Release

```bash
# 1. Limpar e instalar
npm ci

# 2. Verificar tipos/compilação
npm run build

# 3. Validar pré-publish
npm run prepublish:test

# 4. Atualizar CHANGELOG.md
# (edite manualmente a seção "Unreleased")

# 5. Commit
git add .
git commit -m "feat: release 0.2.0"

# 6. Publicar
npm run publish:latest   # ou publish:beta para teste

# 7. Push + tag
git push --follow-tags
```
