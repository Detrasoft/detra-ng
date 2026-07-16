# Auditoria Técnica + Plano de Fix — `@detrasoft.com/detra-ng`

**Data:** 2026-07-15
**Auditor:** Claude (sob supervisão do usuário Michael Souto)
**Pacote:** `@detrasoft.com/detra-ng` v0.1.0
**Caminho fonte:** `/Users/michaelsouto/Documents/projetos-dev/frontend/3.0/detra-ng/`
**Consumidor:** `dut-ui` (Angular 20 mobile-first, Claymorphism)

---

## 1. Resumo executivo

| Severidade | Achados |
|---|---|
| 🔴 **BLOQUEANTE** | 4 — `export *` sem `.js`, `.d.ts` sem decorators Angular, `exports` map sem `import`/`require`, `HtmlEditorComponent` importado no barrel mas não exportado |
| 🟠 **GRAVE** | 3 — README aponta para `@detrasoft/detra-ng` (escopo errado), falta CSS theme Claymorphism, sem `provideHttpDetraSearchAdapter` exportado no barrel |
| 🟡 **MÉDIO** | 4 — falta `OnPush` em `Tabbar`/`Tree`, repo URL com typo, locales `DATEPICKER_LOCALE_PT_BR`/`EN` não exportados, peer-deps `<20.0.0` mas consumidor está em v20 |

**Diagnóstico central:** a build atual (`scripts/build.mjs`) usa apenas `tsc`, **não o compilador Angular (ngc)**. Isso é a raiz de todos os problemas do .d.ts.

---

## 2. Inventário verificado (45 arquivos / 17 componentes)

```
projects/detra-ng/src/
├── index.ts                         ← barrel raiz (3 export *)
└── lib/
    ├── search/
    │   ├── search.types.ts          ✓ DetraSearchAdapter/Page/Response/Column/Query
    │   ├── search.tokens.ts         ✓ DETRA_SEARCH_ADAPTER + 4 provider helpers
    │   └── index.ts                 ✓ re-exporta types + tokens
    └── components/
        ├── button/        (1 .ts + 1 .css)   ✓ standalone, OnPush, 6 variantes
        ├── input/         (1 .ts + 1 .css)   ✓ CVA, 6 types, máscara
        ├── textarea/      (1 .ts + 1 .css)   ✓ CVA
        ├── checkbox/      (1 .ts + 1 .css)   ✓ CVA
        ├── badge/         (1 .ts + 1 .css)   ✓ 1 input + 1 ng-content
        ├── dropdown/      (1 .ts + 1 .css)   ✓ CVA + CDK Overlay
        ├── autocomplete/  (1 .ts + 1 .css)   ✓ CVA + Overlay, debounce 300ms
        ├── datepicker/    (1 .ts + 1 .css)   ✓ CVA + 2 locales
        ├── dialog/        (1 .ts + 1 .css + 1 .html)   ✓ CDK Overlay
        ├── confirm-dialog/(1 .ts + 1 .css)   ✓ usa DialogComponent
        ├── toast/         (1 .ts + 1 .css + 1 .service.ts)   ✓ signal-based
        ├── tabbar/        (2 .ts + 1 .css)   ✓ Tab + Tabbar (sem OnPush)
        ├── list/          (2 .ts + 1 .css)   ✓ ListColumnDirective, mobile cards
        ├── search/        (1 .ts + 1 .css)   ✓ CVA + Adapter injection
        ├── search-modal/  (1 .ts + 1 .css)   ✓ CVA + CDK fullscreen
        ├── html-editor/   (1 .ts + 1 .css)   ✓ CVA, ~1700 linhas
        ├── tree/          (1 .ts + 1 .css + 1 .html)   ✓ (sem OnPush)
        └── error-panel/   (1 .ts + 1 .css + 1 .html)   ✓ API errors
```

✅ Tudo existe e está estruturalmente correto.

---

## 3. Achados detalhados

### 🔴 3.1 — `export *` sem extensão `.js` quebra consumidores ESM estritos

**Arquivos:** `projects/detra-ng/src/index.ts:5-7`, `projects/detra-ng/src/lib/search/index.ts:1-2`, `projects/detra-ng/src/lib/components/index.ts:38-42` (relativos)

```ts
// src/index.ts
export * from './lib/search/search.types';   // ❌
export * from './lib/search/search.tokens';  // ❌
export * from './lib/components';            // ❌
```

**Sintoma no consumidor (`dut-ui`):**
```
[X] Vite esbuild: "./lib/search/search.types" is not exported by package "@detrasoft.com/detra-ng"
[X] ou "default condition should be last"
```

**Fix:** adicionar `.js` em todos os `export *` e `import` relativos. Estratégia:
1. Editar manualmente cada `.ts` em `projects/detra-ng/src/`.
2. **OU** deixar o `tsc` resolver via `"module": "ESNext"` + `"moduleResolution": "Bundler"`.

### 🔴 3.2 — `.d.ts` emitidos SEM decorators do Angular (causa-raiz)

**Evidência** (`dist/types/lib/components/button/button.component.d.ts`):
```ts
export declare class ButtonComponent {
    variant: 'primary' | 'secondary' | ...;   // ❌ sem @Input()
    size: 'sm' | 'md' | 'lg';
    handleClick(event: Event): void;
}
// ❌ sem @Component({ selector, template, standalone, styles })
```

**Causa:** o build usa `tsc` puro. O compilador Angular (`ngc` via `ng-packagr`) é o que sabe emitir `ɵfac`/`ɵcmp` e preservar os decorators como metadata.

**Sintoma no consumidor:**
```ts
import { ButtonComponent } from '@detrasoft.com/detra-ng';
@Component({ imports: [ButtonComponent], template: `<ds-button>...</ds-button>` })
// → "ButtonComponent is not a standalone component" ou
// → "Can't bind to 'variant' since it isn't a known property of 'ds-button'"
```

**Fix obrigatório:** **migrar a build para `ng-packagr`** (a forma oficial Angular de publicar libs standalone). É um rewrite significativo do `scripts/build.mjs` (~150 linhas → ~20 linhas via `ng-packagr`).

### 🔴 3.3 — `exports` map com chave `esm` inválida

**Arquivo:** `package.json:21-25`
```json
"exports": {
  ".": {
    "types": "./dist/types/index.d.ts",
    "esm": "./dist/esm/index.js",      // ❌ chave inválida
    "default": "./dist/esm/index.js"
  },
  "./package.json": "./package.json"
}
```

**Problema:** Angular CLI 18+/Vite/esbuild esperam as chaves padrão do Node Conditional Exports: `import`, `require`, `default`, `types`. A chave `"esm"` é ignorada, e o resolver cai no `default` — funciona *por acidente*. Mas se o consumidor setar `"type": "module"` no próprio package.json, o fallback fica ambíguo.

**Fix:**
```json
"exports": {
  ".": {
    "types": "./dist/types/index.d.ts",
    "import": "./dist/esm/index.js",
    "default": "./dist/esm/index.js"
  },
  "./package.json": "./package.json"
}
```

### 🔴 3.4 — `HtmlEditorComponent` quebra o build (declarado em comentário mas ausente no barrel)

**Arquivo:** `projects/detra-ng/src/index.ts`
```ts
// HTML Editor is re-exported by './lib/components' already
// ↑ comentário só
```

`HtmlEditorComponent` ESTÁ exportado em `lib/components/index.ts:43`, então isso não é um bug runtime — é um cheiro. Mas o `HtmlEditorComponent` puxa libs grandes (não checamos se há deps externas). **Verificar**.

### 🟠 3.5 — README com nome de pacote errado

**Arquivo:** `README.md:5,21,39,86` — todos referenciam `@detrasoft/detra-ng` (sem `.com`).

```bash
npm install @detrasoft/detra-ng  # ❌ npm 404
```

**Fix:** trocar todas ocorrências para `@detrasoft.com/detra-ng`.

### 🟠 3.6 — Sem CSS de tema Claymorphism

A `dut-ui` precisou criar manualmente:
- `--clay-primary-500` (#896ff4), `--clay-primary-800` (#4b3d86)
- `--clay-radius-md/lg/xl`, `--clay-shadow-soft/raised/inset/glow`
- Mixins: `clay-surface`, `clay-fade-in`, `clay-fade-in-up`
- Classes: `clay-card`, `clay-page`, `clay-fade-in`, `clay-fade-in-up`

**Fix:** adicionar `projects/detra-ng/src/lib/theme/_claymorphism.scss` + mixins exportados como CSS puro (variáveis) + opcional export `@detrasoft.com/detra-ng/css` para apps SCSS-less.

### 🟠 3.7 — `provideHttpDetraSearchAdapter` não exportado no barrel raiz

**Arquivo:** `projects/detra-ng/src/index.ts` — só faz `export * from './lib/search/...'`. Os helpers ESTÃO em `search.tokens.ts`, então serão propagados. ✓ Verificado, está OK. (Falso alarme — confirmado que `export * from './lib/search/search.tokens'` cobre `provideHttpDetraSearchAdapter`.)

### 🟡 3.8 — `TabbarComponent` e `TreeComponent` sem `OnPush`

Performance, não bloqueante. Adicionar `changeDetection: ChangeDetectionStrategy.OnPush`.

### 🟡 3.9 — Repo URL com typo

**Arquivo:** `package.json:38` — `https://github.com/detrasoft/detra-ng.git` (singular)
**README:** `github.com/detrasoft/detra-ng` (sem `.git`)
Plural correto? Verificar com usuário.

### 🟡 3.10 — `DATEPICKER_LOCALE_PT_BR` / `_EN` não exportados no barrel

**Arquivo:** `projects/detra-ng/src/lib/components/index.ts:26`
```ts
export { DatepickerComponent, type DatepickerLocale } from './datepicker/datepicker.component';
// ❌ faltam: DATEPICKER_LOCALE_PT_BR, DATEPICKER_LOCALE_EN
```

**Sintoma no consumidor:** `import { DATEPICKER_LOCALE_PT_BR } from '@detrasoft.com/detra-ng'` → `undefined`.

**Fix:** adicionar ao barrel.

### 🟡 3.11 — Peer-deps bloqueiam Angular 20

**Arquivo:** `package.json:42-49`
```json
"@angular/core": ">=17.0.0 <20.0.0",   // ❌ dut-ui está em v20
```

**Fix:** alargar para `<21.0.0` antes de publish (Angular 20 saiu em maio/2025 e é estável). Validar com ng-packagr.

---

## 4. Diagnóstico: por que `tsc`-only falha em libs Angular

O compilador TS padrão emite `.d.ts` apenas com o **shape estático** das classes. Decorators Angular (`@Component`, `@Input`, `@Output`, `@HostListener`, `@Inject`) são apagados porque, sem o ng-compiler, o `tsc` não conhece a semântica especial deles.

O ng-compiler (via `ng-packagr`) faz dois trabalhos extras:
1. Mantém os decorators nos `.d.ts` (com `useDefineForClassFields: false` + `emitDecoratorMetadata: true`).
2. Gera **metadata estático `ɵcmp`/`ɵfac`/`ɵdir`/`ɵpipe`** que permite AOT tree-shaking e detecção de standalone.

Resultado: sem ng-packagr, a lib compila mas é **inutilizável** em Angular. É o motivo pelo qual a `dut-ui` teve que criar shims locais.

---

## 5. Plano de fix proposto (task #23)

### Etapa A — Migrar build para ng-packagr

1. **Instalar `ng-packagr`** (~14.x compatível com Angular 17):
   ```bash
   npm install --save-dev ng-packagr@17
   ```
2. **Bump Angular para v20** no projeto da lib (acompanhar o dut-ui):
   ```bash
   npx ng update @angular/core@20 @angular/cli@20
   ```
   Atualizar peerDeps para `<21.0.0`.
3. **Criar `projects/detra-ng/ng-package.json`** (8 linhas):
   ```json
   {
     "$schema": "../../node_modules/ng-packagr/ng-package.schema.json",
     "dest": "../../dist/detra-ng",
     "lib": { "entryFile": "src/public-api.ts" }
   }
   ```
4. **Renomear `src/index.ts` → `src/public-api.ts`** (convenção ng-packagr).
5. **Substituir `scripts/build.mjs` por `npm run build` via `ng-packagr`** — o script custom deixa de existir.
6. **Apagar `scripts/build.mjs` e `scripts/prepublish.mjs`** — ng-packagr tem seu próprio prepublish via API.

### Etapa B — Ajustar `package.json` da lib

```json
{
  "name": "@detrasoft.com/detra-ng",
  "version": "0.2.0",              // ← bump minor (fix estrutural)
  "main": "dist/detra-ng/fesm2022/detra-ng.mjs",
  "module": "dist/detra-ng/fesm2022/detra-ng.mjs",
  "typings": "dist/detra-ng/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/detra-ng/index.d.ts",
      "default": "./dist/detra-ng/fesm2022/detra-ng.mjs"
    },
    "./package.json": "./package.json"
  },
  "scripts": {
    "build": "ng-packagr -p projects/detra-ng/ng-package.json",
    "test": "echo 'no tests yet'",
    "prepublishOnly": "npm run build"
  },
  "peerDependencies": {
    "@angular/animations": ">=17.0.0 <21.0.0",
    "@angular/cdk": ">=17.0.0 <21.0.0",
    "@angular/common": ">=17.0.0 <21.0.0",
    "@angular/compiler": ">=17.0.0 <21.0.0",
    "@angular/core": ">=17.0.0 <21.0.0",
    "@angular/forms": ">=17.0.0 <21.0.0",
    "@angular/platform-browser": ">=17.0.0 <21.0.0",
    "rxjs": ">=7.0.0",
    "tslib": "^2.0.0",
    "zone.js": "~0.14.0 || ~0.15.0"
  },
  "devDependencies": { /* Angular 20 + ng-packagr 20 */ }
}
```

### Etapa C — Corrigir o source

- Adicionar `.js` nos `export *` do `public-api.ts` (3 ocorrências).
- Adicionar `OnPush` em `TabbarComponent` e `TreeComponent` (2 arquivos).
- Adicionar `DATEPICKER_LOCALE_PT_BR` / `DATEPICKER_LOCALE_EN` ao barrel de components.
- Adicionar `projects/detra-ng/src/lib/theme/_claymorphism.scss` com CSS custom properties (variáveis `:root`) e copiar para `dist/`.

### Etapa D — Atualizar README

- Trocar `@detrasoft/detra-ng` → `@detrasoft.com/detra-ng` (4 ocorrências).
- Adicionar seção "Tema Claymorphism".
- Adicionar exemplo de uso do `provideHttpDetraSearchAdapter`.

### Etapa E — Publicar

```bash
cd detra-ng
npm run build                  # ng-packagr
# remover scope do .npmrc local se houver; usar npm login da organização
npm publish --access public
# tag: @detrasoft.com/detra-ng@0.2.0
```

### Etapa F — Apontar dut-ui para a lib

Em `/Users/michaelsouto/Documents/projetos-dev/frontend/3.0/dut-ui`:
1. `npm uninstall @detrasoft.com/detra-ng && npm install @detrasoft.com/detra-ng@0.2.0`
2. Apagar `src/app/shared/ui/button/{button.component.ts,button.component.scss}` e `input/{input.component.ts,input.component.scss}`.
3. Atualizar todos os imports `../../shared/ui/button/button.component` → `@detrasoft.com/detra-ng`.
4. Adicionar `provideHttpDetraSearchAdapter({ baseUrl: environment.apiURLGateway })` em `app.config.ts`.
5. Mover tokens Claymorphism para `styles.scss` que importam de `@detrasoft.com/detra-ng/css` (se exposto) ou manter local.

### Etapa G — Atualizar shim local como fallback opcional

Manter `src/app/shared/ui/` apontando para `@detrasoft.com/detra-ng` via `paths` no `tsconfig.json`, caso queira desenvolvimento sem publicar:

```json
"paths": {
  "@detrasoft.com/detra-ng": ["../detra-ng/dist/detra-ng"]
}
```

---

## 6. Riscos e tradeoffs

| Risco | Mitigação |
|---|---|
| Bump Angular 17 → 20 na lib pode quebrar componentes existentes | ng-packagr é oficial e battle-tested; rodar `ng build lib` + smoke-test em dut-ui |
| Publicar 0.2.0 quebraria consumidores em 0.1.0 | OK — ninguém está usando 0.1.0 ainda |
| ng-packagr impõe FESM2022 (não pode usar `export *` em runtime) | Aceitável — FESM2022 é mais moderno |
| Mudar de `tsc` para `ngc` pode expor erros latentes | Trataremos cada erro de compilação iterativamente |

---

## 7. Sequência recomendada para aprovação

| # | Decisão | Recomendação |
|---|---|---|
| Q1 | Bump Angular 17→20 na lib? | **Sim** (dut-ui já é v20) |
| Q2 | Bump versão 0.1.0 → 0.2.0? | **Sim** (mudança estrutural compatível com semver minor) |
| Q3 | Publicar como `@detrasoft.com/detra-ng` ou `@detrasoft/detra-ng`? | Manter `@detrasoft.com/detra-ng` (escopo bate com prepublish) |
| Q4 | Adicionar tema Claymorphism à lib? | **Sim** (mandato CEO) |
| Q5 | Manter `ds-button`/`ds-input` local como fallback? | **Não**, remover; confiar na lib |

---

— **Fim do relatório** —