/**
 * Public API of @detrasoft.com/detra-ng
 *
 * Importe desta forma:
 *   import {
 *     ButtonComponent,
 *     InputComponent,
 *     ToastService,
 *     provideHttpDetraSearchAdapter,
 *   } from '@detrasoft.com/detra-ng';
 */

// Search (HTTP-agnostic adapter contract)
export * from './lib/search/search.types';
export * from './lib/search/search.tokens';

// All components
export * from './lib/components/index';
