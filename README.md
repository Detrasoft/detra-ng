# @detrasoft/detra-ng

> Design System Angular standalone da **DetraSoft** — componentes prontos para uso, com CSS puro e zero dependências externas fora do Angular CDK.

[![npm version](https://img.shields.io/npm/v/@detrasoft/detra-ng.svg)](https://www.npmjs.com/package/@detrasoft/detra-ng)
[![npm downloads](https://img.shields.io/npm/dm/@detrasoft/detra-ng.svg)](https://www.npmjs.com/package/@detrasoft/detra-ng)
[![license](https://img.shields.io/npm/l/@detrasoft/detra-ng.svg)](https://github.com/detrasoft/detra-ng/blob/main/LICENSE)

## ✨ Recursos

- **Angular 17+ standalone components** — sem `NgModule`, sem boilerplate.
- **CSS puro** — sem SCSS, sem Tailwind, sem CSS-in-JS. Apenas variáveis CSS para tema.
- **OnPush + Change Detection otimizado** — precomputação de view-model para grandes listas.
- **Totalmente tipado** — types completos, sem `any` na API pública.
- **Acessível** — ARIA labels, navegação por teclado, focus management.
- **Tree-shakeable** — importe só o que precisa.

## 📦 Instalação

```bash
npm install @detrasoft/detra-ng
```

## 🚀 Uso Rápido

```typescript
// app.config.ts
import { provideAnimations } from '@angular/platform-browser/animations';
import { ApplicationConfig } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [provideAnimations()],
};
```

```typescript
// seu-componente.ts
import { Component } from '@angular/core';
import { ButtonComponent, InputComponent } from '@detrasoft/detra-ng';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ButtonComponent, InputComponent],
  template: `
    <ds-input label="E-mail" type="email" [(ngModel)]="email"></ds-input>
    <ds-input label="Senha" type="password" [(ngModel)]="password"></ds-input>
    <ds-button variant="primary" (click)="login()">Entrar</ds-button>
  `,
})
export class LoginComponent {}
```

> ⚠️ Os componentes são standalone — basta importá-los no array `imports` do seu componente.

## 🧩 Componentes Disponíveis (v0.1.0)

| Componente       | Seletor           | Descrição                                        |
| ---------------- | ----------------- | ------------------------------------------------ |
| Button           | `ds-button`       | Botão com variantes e estados                    |
| Input            | `ds-input`        | Input com label, hint, error e máscara           |
| Textarea         | `ds-textarea`     | Textarea com label e validação                   |
| Checkbox         | `ds-checkbox`     | Checkbox acessível                               |
| Badge            | `ds-badge`        | Selo colorido customizável                       |
| Dropdown         | `ds-dropdown`     | Select com overlay e busca por teclado           |
| Autocomplete     | `ds-autocomplete` | Input com sugestões (single/múltiplo)            |
| Datepicker       | `ds-datepicker`   | Calendário com i18n (PT-BR/EN)                   |
| Dialog           | `ds-dialog`       | Modal genérico via CDK Overlay                   |
| ConfirmDialog    | `ds-confirm-dialog` | Dialog de confirmação com loading state        |
| Toast            | `ds-toast`        | Notificações globais via signal                  |
| ToastService     | `ToastService`    | API para disparar toasts                         |
| Tabbar           | `ds-tabbar`       | Abas com header mobile                          |
| Tab              | `ds-tab`          | Painel filho do Tabbar                          |
| List             | `ds-list`         | Tabela (desktop) + cards (mobile) + paginação   |
| ListColumn       | `ds-list-column`  | Diretiva de coluna para List                    |
| Search           | `ds-search`       | Busca com autocomplete + filtro                  |
| SearchModal      | `ds-search-modal` | Busca em modal fullscreen                        |
| HtmlEditor       | `ds-html-editor`  | Editor rich-text com toolbar completa            |
| Tree             | `ds-tree`         | Árvore com checkbox/single + cascata             |
| ErrorPanel       | `ds-error-panel`  | Exibição de erros de validação de API            |

## 🌍 i18n (Datepicker)

```typescript
import {
  DatepickerComponent,
  DATEPICKER_LOCALE_PT_BR,
  DATEPICKER_LOCALE_EN,
} from '@detrasoft/detra-ng';
```

## 🤝 Contribuindo

PRs e issues são bem-vindos em [github.com/detrasoft/detra-ng](https://github.com/detrasoft/detra-ng).

## 📄 Licença

MIT © [DetraSoft](https://detrasoft.com)