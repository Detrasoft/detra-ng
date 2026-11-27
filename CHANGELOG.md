# Changelog

Todas as mudanças relevantes neste projeto serão documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [0.7.0] — 2026-11-27

### Adicionado

- **`ds-selectbutton` (`SelectButtonComponent`)**: seletor inline com todas as opções visíveis (sem dropdown) e ícones FontAwesome por opção. API no estilo do `ds-dropdown` (`options`, `optionLabel`, `optionValue`, `optionIcon`, `optionDisabled`), `multiple`, `allowEmpty`, `iconPosition` (`left`/`top`), `columns` (`'auto'` ou número, para grades simétricas), `size` (`sm`/`md`/`lg`), `label`/`hint`/`error`/`required`, `disabled` e `locked` (somente leitura). `ControlValueAccessor` (`formControlName`, `[(ngModel)]`) e `@Output() valueChange`. Acessível: `role="radiogroup"` + `aria-checked` com setas/Home/End no modo simples, `role="group"` + `aria-pressed` no `multiple`. Tipos exportados: `SelectButtonOption`, `SelectButtonSize`, `SelectButtonIconPosition`, `SelectButtonColumns`. Visual configurável por tokens `--ds-selectbutton-*`.

### Corrigido

- **`ds-toast` transparente/ilegível**: a mensagem deixou de usar `--color-surface` e `--color-text-secondary` (que em temas de vidro ficam quase transparentes ou indefinidos). Agora usa tokens próprios com fallback sólido: `--ds-toast-bg` (`#ffffff`; `#16203a` em `html.dark`), `--ds-toast-text`, `--ds-toast-text-secondary`, `--ds-toast-title`, `--ds-toast-border`, `--ds-toast-backdrop` (`blur(18px) saturate(150%)`), `--ds-toast-shadow`, `--ds-toast-close` e `--ds-toast-close-hover-bg`. A borda esquerda continua com a cor semântica da variante.
- `--z-toast` passou de `500` para `100010`: o toast fica acima do `cdk-overlay-container` (100000), de diálogos e de barras fixas.

## [0.6.33] — 2026-11-25

### Adicionado

- **Skeleton em todos os componentes**: novo input `[skeleton]` em todos os 24 componentes `ds-*` (inclusive `ds-tab`), via host directive única (`DsSkeletonDirective`). Liga e desliga o estado de carregamento preservando o layout: formulários viram "ossos" no formato real dos campos; `ds-list`, `ds-tree`, `ds-organization-chart` e `ds-calendar` mostram linhas e nós de placeholder; `ds-dialog` e `ds-tab` cobrem o conteúdo projetado.
- **`ds-skeleton`**: peça avulsa (`variant`: `text`, `title`, `circle`, `rect`, `button`; `lines`, `width`, `height`, `radius`) para montar placeholders de telas inteiras.
- **`[dsSkeleton]` + `data-sk`**: a mesma mecânica para elementos próprios do app (`data-sk`, `data-sk="text|circle|pill"`, `data-sk-hide`).
- Enquanto ativo, o componente recebe `aria-busy="true"` e `inert` (sem foco nem clique).

### Alterado

- Folha de estilo do skeleton injetada uma única vez por documento (com suporte a `CSP_NONCE`) e só animando `opacity`; sem animação com `prefers-reduced-motion`, com `.ds-sk-static` ou em aparelhos com até 2 núcleos ou 2 GB de RAM.
- `ds-autocomplete`, `ds-search` e `ds-search-modal`: o "Carregando…/Buscando…" com spinner virou linhas de skeleton.
- `ds-calendar`: `[loading]` continua funcionando e agora usa o skeleton compartilhado (o shimmer próprio com repaint por frame foi removido).

## [0.6.32] — 2026-11-24

### Adicionado

- **ImageCropComponent (`ds-image-crop`)**: Novo componente standalone e híbrido para recorte interativo de imagens com suporte a desktop (mouse drag, wheel zoom, rotações) e mobile/tablets (touch pan, pinch-to-zoom com 2 dedos, high-DPI canvas rendering).
- Suporte a múltiplos formatos (`png`, `jpeg`, `webp`), formas (`circle`, `round-rect`, `rect`), preview ao vivo e exportação de arquivo pronto para upload.

## [0.6.14] — 2026-08-17


### Adicionado

- **OrganizationChart**: Adicionados botões e eventos de reordenação de cards e setores na mesma hierarquia (`(nodeMoveUp)` e `(nodeMoveDown)`).
- **OrganizationChart**: Adicionado suporte a links de portfólio/site nos cartões de colaboradores e membros.
- **Dropdown**: Adicionada funcionalidade de filtro de busca interno com `[enableSearch]` e `[searchPlaceholder]`.
- Publicação e atualização dos componentes do Design System DetraSoft.
