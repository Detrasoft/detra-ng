# detra-ng

Design system Angular compartilhado da Detrasoft (`@detrasoft.com/detra-ng`).

## Stack
- **Angular**: 17–20 (compatível)
- **Node**: ≥18
- **Publicação**: ng-packagr (Angular library)

## Comandos
```bash
npm install
npm run build         # ng-packagr build → dist/detra-ng
```

## Estrutura
```
projects/detra-ng/src/lib/
├── base/         # Componentes base
├── components/   # Componentes UI reutilizáveis
├── search/       # Componentes de busca
└── tokens/       # Design tokens (cores, espaçamentos, etc.)
```

## Uso em outros projetos
- `task-ui` importa via `@detrasoft.com/detra-ng`
- Sincronização local: `npm run sync:detra-ng` (no task-ui)
