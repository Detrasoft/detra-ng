# Auditoria do Design System — TAREFA 1.1

**Projeto:** `medical-ui`
**Caminho:** `src/core/design-system/components/`
**Stack:** Angular 19.2 (standalone), TypeScript 5.6, CSS puro
**Data:** 2026-07-15

---

## 1. Inventário de Componentes (19)

| # | Componente | Pasta | Standalone | OnPush | CVA | CDK Overlay |
|---|------------|-------|:----------:|:------:|:---:|:-----------:|
| 1 | `ButtonComponent` | `button/` | ✅ | ✅ | — | — |
| 2 | `InputComponent` | `input/` | ✅ | ✅ | ✅ | — |
| 3 | `TextareaComponent` | `textarea/` | ✅ | ✅ | ✅ | — |
| 4 | `CheckboxComponent` | `checkbox/` | ✅ | ✅ | ✅ | — |
| 5 | `BadgeComponent` | `badge/` | ✅ | ✅ | — | — |
| 6 | `DropdownComponent` | `dropdown/` | ✅ | ✅ | ✅ | ✅ |
| 7 | `AutocompleteComponent` | `autocomplete/` | ✅ | ✅ | ✅ | ✅ |
| 8 | `DatepickerComponent` | `datepicker/` | ✅ | ✅ | ✅ | — |
| 9 | `DialogComponent` | `dialog/` | ✅ | ✅ | — | ✅ |
| 10 | `ConfirmDialogComponent` | `confirm-dialog/` | ✅ | ✅ | — | usa Dialog |
| 11 | `ToastComponent` | `toast/` | ✅ | ✅ | — | — |
| 12 | `ToastService` | `toast/` | — | — | — | — |
| 13 | `TabbarComponent` | `tabbar/` | ✅ | ❌* | — | — |
| 14 | `TabComponent` | `tabbar/` | ✅ | ✅ | — | — |
| 15 | `ListComponent` | `list/` | ✅ | ✅ | — | — |
| 16 | `ListColumnDirective` | `list/` | ✅ | — | — | — |
| 17 | `SearchComponent` | `search/` | ✅ | ✅ | ✅ | ✅ |
| 18 | `SearchModalComponent` | `search-modal/` | ✅ | ✅ | ✅ | ✅ |
| 19 | `HtmlEditorComponent` | `html-editor/` | ✅ | ❌ | ✅ | — |
| 20 | `TreeComponent` | `tree/` | ✅ | ❌* | — | — |
| 21 | `ErrorPanelComponent` | `error-panel/` | ✅ | ✅ | — | — |

\* Tabbar/Tree não declaram `ChangeDetectionStrategy.OnPush` explicitamente; recomenda-se adicionar para a lib.

---

## 2. Interfaces dos Componentes

### 2.1 `ButtonComponent` (`ds-button`)
```typescript
{
  variant:  'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost'  = 'primary'
  size:     'sm' | 'md' | 'lg'                                                          = 'md'
  type:     'button' | 'submit' | 'reset'                                              = 'button'
  disabled: boolean  = false
  loading:  boolean  = false
  fullWidth: boolean = false
}
// + ng-content projeta o label interno
```
**Observações:** `handleClick` faz `preventDefault` quando `disabled || loading`.

---

### 2.2 `InputComponent` (`ds-input`) — implementa `ControlValueAccessor`
```typescript
{
  label:         string                                                                       = ''
  placeholder:   string                                                                       = ''
  type:          'text' | 'email' | 'password' | 'number' | 'tel' | 'url'                     = 'text'
  error:         string                                                                       = ''
  hint:          string                                                                       = ''
  required:      boolean                                                                      = false
  disabled:      boolean                                                                      = false
  autocomplete:  string                                                                       = 'off'
  inputId:       string                                                                       // gerado randomicamente
  mask:          string                                                                       = ''
  unmask:        boolean                                                                      = false
}
```
**Máscara:** tokens `0`, `9` (dígitos), `A` (letras), `*` (alfanumérico). Demais caracteres são literais.

---

### 2.3 `TextareaComponent` (`ds-textarea`) — CVA
```typescript
{
  label:       string  = ''
  placeholder: string  = ''
  rows:        number  = 4
  error:       string  = ''
  hint:        string  = ''
  required:    boolean = false
  disabled:    boolean = false
  inputId:     string
}
```

---

### 2.4 `CheckboxComponent` (`ds-checkbox`) — CVA
```typescript
{
  label:    string  = ''
  disabled: boolean = false
  inputId:  string
}
```

---

### 2.5 `BadgeComponent` (`ds-badge`)
```typescript
{
  color: string  = '#0066ff'   // CSS var --badge-color
  label?: string
  icon?:  string                // classe FontAwesome, ex: 'fa-solid fa-check'
}
```

---

### 2.6 `DropdownComponent` (`ds-dropdown`) — CVA
```typescript
{
  options:      any[]                = []
  optionLabel:  string               = ''     // dot-notation, ex: 'pessoa.nome'
  optionValue:  string               = ''     // dot-notation, ex: 'pessoa.id'
  emptyMessage: string               = 'Nenhuma opção disponível.'
  placeholder:  string               = 'Selecione...'
  label:        string               = ''
  error:        string               = ''
  hint:         string               = ''
  required:     boolean              = false
  disabled:     boolean              = false
  inputId:      string
}
Outputs: onChange: EventEmitter<any>
ContentChild: '#itemTemplate' TemplateRef<{ $implicit: any }>
```
**Observações:** Aceita string, número ou objeto nas options. Faz fallback automático para campos `valor | value | label | name`.

---

### 2.7 `AutocompleteComponent` (`ds-autocomplete`) — CVA
```typescript
{
  suggestions:    any[]              = []
  field:          string             = ''     // dot-notation do label
  dropdown:       boolean            = false  // exibe botão de dropdown
  multiple:       boolean            = false
  loading:        boolean            = false
  emptyMessage:   string             = 'Nenhum resultado encontrado.'
  placeholder:    string             = ''
  label:          string             = ''
  error:          string             = ''
  hint:           string             = ''
  required:       boolean            = false
  disabled:       boolean            = false
  minLength:      number             = 1
  debounce:       number             = 300    // ms
  forceSelection: boolean            = false
  inputId:        string
}
Outputs:
  completeMethod: EventEmitter<{ query: string }>
  onSelect:       EventEmitter<any>
  onClear:        EventEmitter<void>
ContentChild: '#itemTemplate' TemplateRef<{ $implicit: any; query: string }>
```
**Performance:** precomputa `suggestionRows` e `chipRows` para evitar O(n*m) por change-detection.

---

### 2.8 `DatepickerComponent` (`ds-datepicker`) — CVA
```typescript
export interface DatepickerLocale {
  dayNames:        string[]
  dayNamesShort:   string[]
  monthNames:      string[]
  monthNamesShort: string[]
  firstDayOfWeek:  number  // 0 = domingo
}
export const DATEPICKER_LOCALE_PT_BR: DatepickerLocale
export const DATEPICKER_LOCALE_EN: DatepickerLocale

{
  label:        string           = ''
  placeholder:  string           = ''
  dateFormat:   string           = 'dd/mm/yy'  // tokens: dd d DD D MM M mm m yy y oo o
  locale:       DatepickerLocale = DATEPICKER_LOCALE_PT_BR
  required:     boolean          = false
  disabled:     boolean          = false
  error:        string           = ''
  hint:         string           = ''
  minDate:      string           = ''   // ISO 'YYYY-MM-DD'
  maxDate:      string           = ''
  inputId:      string
  outputFormat: 'date' | 'datetime' = 'date'  // 'datetime' emite 'YYYY-MM-DDT00:00:00'
}
```
**Recursos:** view mode (days/years), navegação por década, blur → parser robusto, ESC + click outside para fechar.

---

### 2.9 `DialogComponent` (`ds-dialog`)
```typescript
{
  cardClass:           string  = 'ds-dialog-card'
  closeOnBackdropClick: boolean = true
  isOpen:              boolean            // getter/setter com side-effects
}
Output: onClose: EventEmitter<void>
```
**Observações:** `encapsulation: ViewEncapsulation.None`. Abre Overlay centrado globalmente.

---

### 2.10 `ConfirmDialogComponent` (`ds-confirm-dialog`)
```typescript
{
  isOpen:      boolean = false
  title:       string  = 'Confirmar Ação'
  message:     string  = 'Tem certeza de que deseja realizar esta ação?'
  hint:        string  = ''
  confirmText: string  = 'Confirmar'
  cancelText:  string  = 'Cancelar'
  loading:     boolean = false
  iconClass:   string  = 'fa-solid fa-triangle-exclamation'
}
Outputs:
  confirm: EventEmitter<void>
  cancel:  EventEmitter<void>
```

---

### 2.11 `ToastComponent` (`ds-toast`) + `ToastService`
```typescript
export type ToastType = 'success' | 'error' | 'info' | 'warning'
export interface ToastMessage {
  id: string
  title?: string
  message: string
  type: ToastType
  duration?: number   // ms; default 4000
}

// ToastService (providedIn: 'root')
show({ message, title, type, duration })        // id gerado randomicamente
success(msg, title?, duration?)
error(msg, title?, duration?)
info(msg, title?, duration?)
warning(msg, title?, duration?)
remove(id)
toasts()  // signal readonly
```
**Estado:** baseado em `signal()` (Angular 17+).

---

### 2.12 `TabbarComponent` (`ds-tabbar`) + `TabComponent` (`ds-tab`)
```typescript
// TabComponent
{
  id:     string                 // required
  header: string                 // required
  icon:   string                 = ''     // 'fa-solid fa-user'
  badge:  number | null          = null
}
// TabbarComponent
{
  activeTab:        string          // two-way via [(activeTab)]
}
@ContentChildren(TabComponent) tabs
Outputs:
  activeTabChange: EventEmitter<string>
```
**Responsivo:** ≤768px vira header compacto + dropdown de seleção.

---

### 2.13 `ListComponent` (`ds-list`) + `ListColumnDirective` (`ds-list-column`)
```typescript
// ListColumnDirective
{
  key:   string                              // required  (dot-notation)
  label: string  = ''
  width: string  = ''                        // ex: '120px'
  align: 'left' | 'center' | 'right' = 'left'
}
@ContentChild(TemplateRef) cellTemplate: TemplateRef<{ $implicit: unknown; row: unknown }>

// ListComponent
{
  data:            any[]   = []
  pageSize:        number  = 10
  trackByKey:      string  = 'id'
  emptyMessage:    string  = 'Nenhum registro encontrado.'
  actionsLabel:    string  = 'Ações'
  serverPagination: boolean = false
  totalRecords?:   number
}
Outputs:
  rowClick:    EventEmitter<any>
  pageChange:  EventEmitter<number>     // quando serverPagination=true
ContentChildren:
  '@ContentChild('cardTemplate')'      TemplateRef<{ $implicit: unknown }>
  '@ContentChild('actionsTemplate')'   TemplateRef<{ $implicit: unknown }>
```
**Responsivo:** desktop usa `<table>` com paginação, mobile usa cards com infinite scroll via `IntersectionObserver`.

---

### 2.14 `SearchComponent` (`ds-search`) — CVA
```typescript
{
  endpoint:        string                  = ''   // base URL do backend
  code:            string                  = ''   // identificador do dataset
  label:           string                  = ''
  placeholder:     string                  = 'Pesquisar...'
  error:           string                  = ''
  hint:            string                  = ''
  required:        boolean                 = false
  disabled:        boolean                 = false
  forceSelection:  boolean                 = true
  filterByColumn:  boolean                 = false
  minLength:       number                  = 1
  debounce:        number                  = 400
  multiple:        boolean                 = false
  extraParams:     Record<string, string>  = {}
}
Output: onSelect: EventEmitter<any>
```
**Dependência externa:** `SearchService` (HTTP). Na lib, este serviço precisa ser **abstraído** ou substituído por uma interface injetável.

---

### 2.15 `SearchModalComponent` (`ds-search-modal`) — CVA
Mesma interface do SearchComponent, porém abre um modal fullscreen com lista de resultados via CDK Overlay.

---

### 2.16 `HtmlEditorComponent` (`ds-html-editor`) — CVA
```typescript
{
  label:       string  = ''
  placeholder: string  = 'Digite o conteúdo aqui...'
  error:       string  = ''
  required:    boolean = false
  disabled:    boolean = false
  inputId:     string
}
```
**Toolbar:** bold, italic, underline, strikethrough, fontes, tamanho, H1-H3, listas, alinhamento, cor, imagem, tabela com operações (linhas/colunas/mesclar/dividir/borda), linha horizontal, limpar formatação.
**Paste sanitizer:** remove `mso-*`, margins/paddings, line-height, classes/ids, scripts, comments.

---

### 2.17 `TreeComponent` (`ds-tree`)
```typescript
export interface TreeNode {
  label:      string
  data?:      any
  icon?:      string                  // classe CSS FontAwesome
  children?:  TreeNode[]
  selectable?: boolean                // default true
  key?:       string                  // obrigatório p/ seleção
  expanded?:  boolean                 // interno, gerenciado pelo componente
}

{
  value:         TreeNode[]         = []
  selection:     TreeNode[]         = []    // two-way
  selectionMode: 'checkbox' | 'single' = 'checkbox'
  filterText:    string             = ''
}
Output: selectionChange: EventEmitter<TreeNode[]>
```
**Recursos:** cascata em checkboxes, estado `indeterminate`, expand/collapse all.

---

### 2.18 `ErrorPanelComponent` (`ds-error-panel`)
```typescript
export interface ApiFieldError {
  fieldName: string
  message:   string
}
export interface ApiValidationError {
  detail:     string
  title:      string
  status:     number
  errors:     ApiFieldError[]
  path?:      string
  timestamp?: string
}

{
  error: ApiValidationError | null = null
}
Output: dismissed: EventEmitter<void>
```
**Recursos:** agrupa erros por prefixo do `fieldName` (`addresses`, `contacts`, etc), move-se para `document.body`, controla `overflow`.

---

## 3. Dependências Externas

### 3.1 Peer (precisam estar na app consumidora)
| Pacote | Versão no projeto | Origem |
|--------|-------------------|--------|
| `@angular/animations` | ^19.2.0 | `@angular/animations` |
| `@angular/cdk` | **^19.2.19** | `@angular/cdk` (Overlay + Portal) |
| `@angular/common` | ^19.2.0 | `@angular/common` |
| `@angular/compiler` | ^19.2.0 | `@angular/compiler` |
| `@angular/core` | ^19.2.0 | `@angular/core` |
| `@angular/forms` | ^19.2.0 | `@angular/forms` (CVA, ReactiveFormsModule) |
| `@angular/platform-browser` | ^19.2.0 | — |
| `rxjs` | ~7.8.0 | usado em Search / SearchModal / Autocomplete |
| `tslib` | ^2.6.0 | helpers TS |
| `zone.js` | ~0.15.0 | — |

### 3.2 Externas opcionais (não importadas)
| Pacote | Versão no projeto | Usado em |
|--------|-------------------|----------|
| `ngx-mask` | ^19.0.7 | **NÃO** é usado dentro dos componentes — apenas instalado no app. |

### 3.3 Tipografia e ícones (consumidos via classes CSS)
- **FontAwesome** (`fa-solid`, `fa-regular`) — ícones via classes CSS. Não há `import` JS, apenas `class="fa-solid fa-..."`. A lib **não deve** empacotar FontAwesome; cada app fornece o CSS.

### 3.4 Dependências de runtime internas (precisam ser abstraídas)
| Componente | Dependência |
|------------|-------------|
| `SearchComponent` | `SearchService` (HTTP) com método `getColumns(endpoint, code)` e `search(endpoint, code, field, term, page, extraParams)`. **Reescrever como InjectionToken<DetraSearchAdapter>** |
| `SearchModalComponent` | mesma acima |

---

## 4. Observações Gerais para Migração para a Lib

### ✅ O que já está alinhado com uma lib moderna
- Todos os componentes são **standalone** (Angular 14+ feature).
- 18 dos 19 usam `OnPush` (excelente para performance).
- Pré-computação de view-model em `List`, `Autocomplete`, `Search` e `SearchModal` (evita O(n*m) por ciclo de CD).
- Internacionalização já existe no Datepicker.
- Acessibilidade (ARIA, keyboard navigation, focus trap em Dialog).

### ⚠️ Pontos de atenção
1. **`SearchService` precisa ser abstraído** com um `InjectionToken` para que apps forneçam sua implementação HTTP.
2. **`TabbarComponent` e `TreeComponent`** não declaram `OnPush` — adicionar para consistência.
3. **CSS Variables de tema** — alguns componentes usam `--badge-color`, `--color-primary-500`, `--surface-bg-hover`, `--space-2`. Documentar esses tokens no README.
4. **Confirmação de uso do FontAwesome** — a lib não deve trazer FontAwesome; o consumidor precisa incluir o CSS.
5. **`HtmlEditor`** é grande (>1700 linhas) — considerar mover para um entry-point separado `@detrasoft/detra-ng/html-editor` para tree-shaking.
6. **Estilos com ViewEncapsulation.None** (`DialogComponent`, `ErrorPanelComponent`) — necessário porque elementos são movidos para `body`. Documentar este comportamento.

### 📋 Resumo das APIs públicas reexportáveis

```typescript
// index.ts (atual)
export { ButtonComponent } from './button/button.component';
export { InputComponent } from './input/input.component';
// ... 17 outros componentes

export { ToastService } from './toast/toast.service';
export type { ToastMessage } from './toast/toast.service';
export type { ApiValidationError, ApiFieldError } from './error-panel/error-panel.component';
export { DatepickerComponent, DATEPICKER_LOCALE_PT_BR, DATEPICKER_LOCALE_EN } from './datepicker/datepicker.component';
export type { DatepickerLocale } from './datepicker/datepicker.component';
export type { TreeNode } from './tree/tree.component';
```

— **Fim do relatório.** —
