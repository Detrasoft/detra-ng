import { Observable } from 'rxjs';

/**
 * Coluna retornada pelo backend de busca genérico.
 * `principal` é usada como label principal do resultado.
 * `key` é o campo identificador único.
 */
export interface DetraSearchColumn {
  label: string;
  field: string;
  hidden: boolean;
  principal: boolean;
  key: boolean;
  type: string;
}

/**
 * Página de resultados genérica. Compatível com o formato `Page<T>` do Spring,
 * mas o adapter pode mapear qualquer backend para este contrato.
 */
export interface DetraSearchPage<T = unknown> {
  content: T[];
  last?: boolean;
  totalPages?: number;
  totalElements?: number;
  numberOfElements?: number;
  number?: number;
  size?: number;
  first?: boolean;
  empty?: boolean;
}

export interface DetraSearchResponse<T = unknown> {
  title?: string;
  data: DetraSearchPage<T> | null;
  columns?: DetraSearchColumn[];
  messages?: unknown;
  totalRecords?: number;
}

/**
 * Parâmetros de uma busca. Todos opcionais exceto `code` e `value`.
 *
 * `endpoint` e `code` identificam o dataset (ex.: `endpoint='medical-api'`, `code='cid10'`).
 * `param` é o nome do campo a filtrar (`'any'` para "todos").
 * `page` é zero-indexed.
 */
export interface DetraSearchQuery {
  endpoint: string;
  code: string;
  param: string;
  value: string;
  page?: number;
  extraParams?: Record<string, string>;
}

/**
 * Contrato HTTP-agnóstico para o componente `<ds-search>` / `<ds-search-modal>`.
 *
 * Cada aplicação fornece sua própria implementação via `provideDetraSearchAdapter()`.
 * A implementação padrão (`DetraHttpSearchAdapter`) usa Angular `HttpClient`.
 *
 * ## Exemplo: adapter customizado
 *
 * ```typescript
 * // seu-app.adapter.ts
 * @Injectable({ providedIn: 'root' })
 * export class MyBackendAdapter implements DetraSearchAdapter {
 *   getColumns(q: { endpoint: string; code: string }): Observable<DetraSearchResponse> {
 *     return this.http.get(`/api/v1/catalog/${q.code}/columns`);
 *   }
 *   search(q: DetraSearchQuery): Observable<DetraSearchResponse> {
 *     return this.http.get(`/api/v1/search/${q.code}`, { params: { q: q.value, page: q.page } });
 *   }
 * }
 *
 * // app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideAnimations(),
 *     provideDetraSearchAdapter(MyBackendAdapter),
 *   ],
 * };
 * ```
 */
export interface DetraSearchAdapter {
  /**
   * Carrega a definição das colunas para o dataset informado.
   * Chamado uma vez no `ngOnInit` do componente de busca.
   */
  getColumns(query: { endpoint: string; code: string }): Observable<DetraSearchResponse>;

  /**
   * Executa uma busca paginada. Deve devolver um `DetraSearchResponse`
   * onde `data.content` contém os itens da página solicitada.
   */
  search(query: DetraSearchQuery): Observable<DetraSearchResponse>;
}