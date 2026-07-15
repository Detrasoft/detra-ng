# Guia de Publicação NPM — `@detrasoft/detra-ng`

Publicação da biblioteca `@detrasoft/detra-ng` no registry npm.js.org.

> **⚠️ Segurança primeiro**
> O token de publish fica em **.npmrc local (não versionado)** + segredo **`NPM_TOKEN`** no GitHub Actions.
> Nunca commite `.npmrc`, `_authToken`, ou qualquer token em código-fonte.

---

## 1. Pré-requisitos (uma vez)

1. **Conta npm** em [https://www.npmjs.com/signup](https://www.npmjs.com/signup).
2. **Habilite 2FA `auth-and-writes`** (obrigatório para publish):
   ```bash
   npm profile enable-2fa auth-and-writes
   ```
   Guarde os códigos de backup.
3. **Organização `@detrasoft`** criada em [https://www.npmjs.com/org/create](https://www.npmjs.com/org/create).
4. **Permissões** do pacote `@detrasoft/detra-ng` para a conta/organização de quem publica.

---

## 2. Estratégia de Token

O **token** dá permissão de publish no registry. Há dois caminhos independentes:

### Caminho A — `.npmrc` local (manual, dev)
- Crie `detra-ng/.npmrc` (já está no `.gitignore`, **nunca versionar**):
  ```ini
  @detrasoft:registry=https://registry.npmjs.org/
  //registry.npmjs.org/:_authToken=npm_XXXXXXXXXXXXXXXXXXXXXXXXX
  ```
- Verifique:
  ```bash
  npm whoami --registry=https://registry.npmjs.org/
  # deve retornar o username (ex: detrasoft)
  ```

### Caminho B — GitHub Actions (CI/CD)
- Vá em `https://github.com/detrasoft/detra-ng/settings/secrets/actions` → **New repository secret**.
- **Name:** `NPM_TOKEN`
- **Secret:** token de **"Automation"** (gerado em https://www.npmjs.com/settings/<user>/tokens)
- O workflow `publish.yml` referencia `${{ secrets.NPM_TOKEN }}` na env `NODE_AUTH_TOKEN`.
- `npm login` no CI não é necessário — o token já autentica.

> **Ambos os caminhos podem coexistir.** Use o `.npmrc` local para publish manual pontual e o GitHub Action para releases oficiais.

---

## 3. ⚠️ Token Comprometido — Revogação e Rotação

Se o token vazar (chat, commit, screenshot, log, etc.), **revogue AGORA**.

### Passo a passo de revogação (5 min)

1. **Acesse** https://www.npmjs.com/settings/<seu-usuário>/tokens
2. Identifique o token pelo prefixo (`npm_ISELrpcF…` no nosso caso) — tokens não têm descrição amigável por padrão
3. Clique em **Revoke** no token afetado
4. **Gere novo** token "Automation" (ou com escopo conforme necessidade)
5. **Substitua** em todos os lugares onde estava:
   - `detra-ng/.npmrc` (local)
   - Repo GitHub → Settings → Secrets → `NPM_TOKEN` (Update)
6. **Valide** o novo:
   ```bash
   npm whoami --registry=https://registry.npmjs.org/
   ```

### Sinais de que um token foi vazado

- Token aparece em qualquer log, chat, e-mail, screenshot, código versionado
- `npm audit` reporta pacotes publicados que você não reconhece
- O token aparece em alertas do GitHub Secret Scanning (linhas 49/54 do `publish.yml` usam `${{ secrets.NPM_TOKEN }}` — qualquer leak dispara alerta automático)

### Boas práticas de longo prazo

- Use tokens com **escopo mínimo** (Automation > publish do escopo @detrasoft, não "Full account").
- Tokens de CI devem ser **separados** dos tokens pessoais.
- Rotacione a cada **90 dias** ou imediatamente após qualquer suspeita de leak.
- Habilite **2FA + npm notifications** em https://www.npmjs.com/settings/<user>/email — você recebe e-mail quando um pacote é publicado.

---

## 4. Publicar a Versão Estável (Manual)

```bash
cd /caminho/para/detra-ng

# 1. Garantir build e checagens OK
npm install
npm run build
node scripts/prepublish.mjs   # valida sem publicar

# 2. Dry-run para conferir o tarball
npm publish --dry-run --access=public
# Lista todos os arquivos que entrariam no tarball, tamanho total,
# SHASUM, e mostra: "Publishing to https://registry.npmjs.org/ ... (dry-run)"
# Confirme que dist/ está dentro, src/ e projects/ NÃO estão.

# 3. Publicar de verdade
npm publish --access=public
# Se pedir OTP de 2FA:
# Need to publish under scope "detrasoft"? Provide a one-time password (OTP):
# > <6-dígitos-do-app>

# 4. Confirmar
npm view @detrasoft/detra-ng version
# → 0.1.0
npm view @detrasoft/detra-ng dist-tags
# latest: 0.1.0
```

**Dica:** `npm run publish:latest` faz tudo isso (build + publish) em um comando.

---

## 5. Versionamento Semântico

| Mudança | Comando | Versão |
|---------|---------|--------|
| Bug fix | `npm run version:patch` | `0.1.0` → `0.1.1` |
| Nova feature (back-compat) | `npm run version:minor` | `0.1.0` → `0.2.0` |
| Breaking change | `npm run version:major` | `0.1.0` → `1.0.0` |
| Beta | `npm run publish:beta` | `0.1.0` → `0.1.1-beta.0` |
| RC | `npm version prerelease --preid=rc` | `0.1.0` → `0.1.1-rc.0` |

### Testar com versão beta ANTES de publicar estável

```bash
npm run publish:beta
# → @detrasoft/detra-ng@0.1.1-beta.0 com tag "beta"

# Instalar em outro projeto para teste
cd /tmp/test-app
npm install @detrasoft/detra-ng@beta

# Remover a tag beta após teste
npm dist-tag rm @detrasoft/detra-ng beta
```

---

## 6. GitHub Actions (Auto-publish Recomendado)

Já configurado em `.github/workflows/publish.yml`. Dispara em:
- **push na `main`/`master`** alterando `projects/detra-ng/src/**`, `package.json` ou `scripts/**`
- **manual** via aba Actions → "Publish to npm" → Run workflow

### O que o workflow faz

1. Checkout Node 20
2. `npm ci` (instala deps via package-lock)
3. `npm run build`
4. `node scripts/prepublish.mjs` (validações)
5. Bump de versão (patch por padrão em push; configurável em dispatch)
6. `npm publish --access=public` usando `${{ secrets.NPM_TOKEN }}`
7. Commit + tag automáticos

### Como preencher o secret

1. https://www.npmjs.com/settings/<seu-usuário>/tokens → **Generate New Token** → **Automation**
2. Copie `npm_xxxxx...` (aparece só uma vez)
3. https://github.com/detrasoft/detra-ng/settings/secrets/actions → **New repository secret**:
   - Name: `NPM_TOKEN`
   - Secret: cole o token
4. Pronto. Próximo `git push` na main dispara publish automática.

---

## 7. Comandos Úteis (Pós-Publish)

```bash
# Ver infos do pacote no registry
npm view @detrasoft/detra-ng
npm view @detrasoft/detra-ng versions --json
npm view @detrasoft/detra-ng time --json
npm view @detrasoft/detra-ng dist-tags

# Ver o que mudou entre versões
npm view @detrasoft/detra-ng@0.1.0
npm view @detrasoft/detra-ng@0.1.1

# Apontar tag latest para uma versão específica (republish)
npm dist-tag add @detrasoft/detra-ng@0.1.1 latest

# Remover tag errada após publish acidental
npm dist-tag rm @detrasoft/detra-ng latest

# Despublicar (apenas em 72h após publish, npm policy restritiva)
npm unpublish @detrasoft/detra-ng@0.1.0 --force

# Forçar publicação nova da mesma versão (regra de 24h)
# (impossível — npm bloqueia; use bump de versão)

# Conferir integridade do tarball
npm view @detrasoft/detra-ng dist
# → { shasum, integrity, tarball, unpackedSize, ... }
```

---

## 8. Troubleshooting

### ❌ "ENEEDAUTH — need auth"
- Token ausente ou inválido. Rode `npm whoami` para verificar.
- Confira se `.npmrc` existe e o token é `npm_…`.

### ❌ "EOTP — need one-time password"
- 2FA ativo. Abra o app autenticador e informe o código de 6 dígitos.

### ❌ "E404 — Not found" em `npm publish`
- Repo/org não existe ou você não tem permissão de publish.
- Confirme o scope: `npm view @detrasoft/detra-ng` deve listar o pacote.

### ❌ "402 Payment Required"
- Organização Free tem limite — verifique se a org existe.

### ❌ "prepublishOnly failed"
- `scripts/prepublish.mjs` abortou. Rode `node scripts/prepublish.mjs` manualmente para ver o motivo.

### ❌ "npm version patch" falha em `git status`
- Working tree sujo. Faça commit antes ou use `--no-git-tag-version` (o que o GitHub Action já faz).

### ❌ GitHub Action "failed at Publish step"
- Secret `NPM_TOKEN` não configurado OU expirou.
- `Settings → Secrets → NPM_TOKEN → Update` com novo token.
- Verifique permissões: Settings → Actions → General → "Read and write permissions".

---

## 9. Checklist de Primeira Publicação

### Antes do primeiro publish

- [ ] Conta npm criada e e-mail confirmado
- [ ] 2FA `auth-and-writes` habilitado
- [ ] Organização `@detrasoft` criada
- [ ] `package.json` revisado (name, version, license, repository, publishConfig.access=public)
- [ ] `LICENSE` (MIT) presente
- [ ] `README.md` revisado e com exemplo funcional
- [ ] `.npmignore` definido (não inclui `src/`, `projects/`, `.npmrc`, scripts internos)
- [ ] `npm install` rodado sem erros
- [ ] `npm run build` rodado sem erros
- [ ] `npm publish --dry-run --access=public` verificado (sem erros, arquivos corretos)

### No dia do publish

- [ ] Token `.npmrc` válido (`npm whoami`)
- [ ] OU secret GitHub `NPM_TOKEN` válido (rodar workflow manual de teste)
- [ ] Dry-run OK
- [ ] `npm publish --access=public` (ou trigger de workflow)
- [ ] `npm view @detrasoft/detra-ng version` confirma versão

### Após publish

- [ ] Testar install em projeto externo: `npm install @detrasoft/detra-ng` em projeto novo
- [ ] Conferir página npm: https://www.npmjs.com/package/@detrasoft/detra-ng
- [ ] Taggit: `git tag v0.1.0 && git push --tags` (workflow já faz, mas confirme)
- [ ] Adicionar entrada no `CHANGELOG.md`

---

**Pronto!** Lib `@detrasoft/detra-ng` publicada. Para feedback ou problemas, abra issue em https://github.com/detrasoft/detra-ng/issues.
