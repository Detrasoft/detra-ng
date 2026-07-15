/**
 * Public API of @detrasoft/detra-ng
 *
 * Importe desta forma:
 *   import {
 *     ButtonComponent,
 *     InputComponent,
 *     ToastService,
 *     provideHttpDetraSearchAdapter,
 *   } from '@detrasoft/detra-ng';
 */

// Search (HTTP-agnostic adapter contract)
export * from './lib/search/search.types';
export * from './lib/search/search.tokens';

// All components
export * from './lib/components';

// HTML Editor is re-exported by './lib/components' already