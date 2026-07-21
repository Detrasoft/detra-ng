# @detrasoft.com/detra-ng

Biblioteca de componentes Angular standalone para o design system **Detra**.
Pensada para ser consumida por apps Angular 17+ que precisam de formulários,
pickers, listas, árvores, dialogs, toasts, search genérica e editor HTML
sem dependências de UI de terceiros (Material, PrimeNG, etc.).

> **Escopo:** `@detrasoft.com/detra-ng`
> **Versão atual:** `0.5.0` — Angular 17 / 18 / 19 / 20 (peer-deps).

---

## ✨ O que vem na caixa

| Categoria           | Componentes / APIs                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| Primitivos          | `BadgeComponent`, `ButtonComponent`                                                                      |
| Form controls (CVA) | `InputComponent`, `TextareaComponent`, `CheckboxComponent`                                               |
| Layout              | `TabbarComponent`, `TabComponent`                                                                        |
| Pickers             | `DatepickerComponent` (locale pt-BR / en)                                                                |
| Dropdowns           | `DropdownComponent`, `AutocompleteComponent`                                                             |
| Dialogs             | `DialogComponent`, `ConfirmDialogComponent`                                                              |
| Toast               | `ToastComponent`, `ToastService`                                                                         |
| Search              | `SearchComponent`, `SearchModalComponent`, `provideHttpDetraSearchAdapter`, `DETRA_SEARCH_ADAPTER` token |
| Lists               | `ListComponent`, `ListColumnDirective`                                                                   |
| Trees               | `TreeComponent`                                                                                          |
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
