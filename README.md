# @detrasoft.com/detra-ng

Biblioteca de componentes Angular standalone para o design system **Detra**.
Pensada para ser consumida por apps Angular 17+ que precisam de formulários,
pickers, listas, árvores, dialogs, toasts, search genérica e editor HTML
sem dependências de UI de terceiros (Material, PrimeNG, etc.).

> **Escopo:** `@detrasoft.com/detra-ng`
> **Versão atual:** `0.7.0` — Angular 17 / 18 / 19 / 20 (peer-deps).

---

## ✨ O que vem na caixa

| Categoria           | Componentes / APIs                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| Primitivos          | `BadgeComponent`, `ButtonComponent`, `InfoboxComponent`                                                  |
| Form controls (CVA) | `InputComponent`, `TextareaComponent`, `CheckboxComponent`, `SelectButtonComponent`                        |
| Layout              | `TabbarComponent`, `TabComponent`                                                                        |
| Pickers             | `DatepickerComponent` (locale pt-BR / en), `TimeComponent`                                               |
| Dropdowns           | `DropdownComponent`, `AutocompleteComponent`                                                             |
| Dialogs             | `DialogComponent`, `ConfirmDialogComponent`                                                              |
| Toast               | `ToastComponent`, `ToastService`                                                                         |
| Search              | `SearchComponent`, `SearchModalComponent`, `provideHttpDetraSearchAdapter`, `DETRA_SEARCH_ADAPTER` token |
| Lists & Trees       | `ListComponent`, `ListColumnDirective`, `TreeComponent`, `OrganizationChartComponent`                     |
| Media & Imagens     | `ImageCropComponent` (híbrido Desktop/Mobile, pinch-to-zoom, touch pan, rotação, multi-formatos)         |
| Errors              | `ErrorPanelComponent`                                                                                    |
| Editor              | `HtmlEditorComponent`                                                                                    |

Todos os componentes são **standalone** (sem `NgModule`) e com

`ChangeDetectionStrategy.OnPush`.

---

## 📦 Instalação

```bash
npm install @detrasoft.com/detra-ng @angular/cdk@^20
```

Dependências de peer já vêm com qualquer app Angular padrão:

- `@angular/core` (>=17 <21)
- `@angular/common`
- `@angular/forms`
- `rxjs`
- `@angular/cdk` (>=17 <21)

---

## 🚀 Uso rápido

```ts
import { Component, signal } from "@angular/core";
import { ButtonComponent, InputComponent, ToastService } from "@detrasoft.com/detra-ng";

@Component({
  selector: "app-demo",
  standalone: true,
  imports: [ButtonComponent, InputComponent],
  template: `
    <ds-input label="Email" [(ngModel)]="email"></ds-input>
    <ds-button variant="primary" (click)="send()">Enviar</ds-button>
  `,
})
export class DemoComponent {
  email = signal("");
  constructor(private toast: ToastService) {}
  send() {
    this.toast.success("Enviado com sucesso!");
  }
}
```

### Search genérica (HTTP)

```ts
import { ApplicationConfig } from "@angular/core";
import { provideHttpDetraSearchAdapter } from "@detrasoft.com/detra-ng";

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpDetraSearchAdapter({
      endpoint: "/api/search",
      debounceMs: 300,
    }),
  ],
};
```

### Skeleton (todos os componentes)

Todo componente `ds-*` aceita `[skeleton]`. O layout é mantido e o conteúdo vira "ossos" no formato real do componente:

```html
<ds-input label="Nome" [skeleton]="carregando()"></ds-input>
<ds-list [data]="clientes" [skeleton]="carregando()">...</ds-list>
<ds-tab id="plano" header="Plano" [skeleton]="carregandoPlano()">...</ds-tab>
```

Para elementos do próprio app, use a diretiva e marque os ossos:

```html
<div [dsSkeleton]="carregando()">
  <img data-sk="circle" [src]="foto" />
  <h3 data-sk="text">{{ nome }}</h3>
  <p data-sk="text">{{ cargo }}</p>
</div>

<!-- placeholder sem conteúdo ainda -->
<ds-skeleton variant="title"></ds-skeleton>
<ds-skeleton [lines]="3"></ds-skeleton>
```

Leve para aparelhos antigos: um único `<style>` por página, anima só `opacity`, desliga blur e sombras dos ossos e fica estático com `prefers-reduced-motion`, com a classe `.ds-sk-static` ou em aparelhos com até 2 núcleos / 2 GB. A cor vem de `--ds-sk-bg` (padrão `--skeleton-mid` do tema).

### Toast global

Importe `ToastHostComponent` no componente raiz:

```ts
import { ToastHostComponent } from "@detrasoft.com/detra-ng";

@Component({
  standalone: true,
  imports: [RouterOutlet, ToastHostComponent],
  template: `<router-outlet /><ds-toast-host />`,
})
export class AppComponent {}
```

O visual do toast vem de tokens próprios (fallback sólido, legível em claro e escuro):
`--ds-toast-bg`, `--ds-toast-text`, `--ds-toast-text-secondary`, `--ds-toast-border`,
`--ds-toast-backdrop`, `--ds-toast-shadow`. Ele fica em `--z-toast` (100010), acima do `cdk-overlay-container`.

### SelectButton (opções inline)

```html
<ds-selectbutton
  formControlName="type"
  label="Tipo de conta"
  [options]="[
    { label: 'Corrente', value: 'CHECKING', icon: 'fa-solid fa-building-columns' },
    { label: 'Poupança', value: 'SAVINGS', icon: 'fa-solid fa-piggy-bank' },
    { label: 'Carteira', value: 'WALLET', icon: 'fa-solid fa-wallet' }
  ]"
  iconPosition="top"
  [columns]="3"
/>
```

Inputs: `options`, `optionLabel` (`label`), `optionValue` (`value`), `optionIcon` (`icon`), `optionDisabled` (`disabled`),
`label`, `hint`, `error`, `required`, `inputId`, `multiple`, `allowEmpty`, `disabled`, `locked` (somente leitura),
`iconPosition` (`left` | `top`), `columns` (`'auto'` | número), `size` (`sm` | `md` | `lg`). Output: `valueChange`.
Funciona com `formControlName` e `[(ngModel)]`. Tokens de visual: `--ds-selectbutton-*` (ver o CSS do componente).

---

## 🎨 Theming

A biblioteca é **theme-agnostic** — traz os componentes, não a paleta.
Quem consome (ex.: `dut-ui`) injeta suas próprias variáveis CSS
(`--ds-color-primary`, `--ds-radius-*`, etc.) ou aplica classes utilitárias.

---

## 🛠 Build (para mantenedores)

```bash
# Requisitos: Node 20+, Angular CLI 20
npm install
npm run build
# saída em dist/detra-ng/
```

Publicação:

```bash
cd dist/detra-ng
npm publish --access public
```

---

## 📝 Licença

Proprietary — © DetraSoft.
