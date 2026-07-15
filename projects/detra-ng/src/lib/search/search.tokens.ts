import { InjectionToken, Provider, Type, inject } from '@angular/core';
import { DetraSearchAdapter, DetraSearchQuery, DetraSearchResponse } from './search.types';
import { Observable } from 'rxjs';

/**
 * InjectionToken que o design system consome para falar com o backend.
 *
 * Para usar o adapter padrão baseado em Angular `HttpClient`, basta chamar
 * `provideHttpDetraSearchAdapter({ baseUrl: environment.apiURLGateway })`
 * no `appConfig.providers`. Para um backend customizado, forneça sua própria
 * implementação via `provideDetraSearchAdapter(MyAdapter)`.
 *
 * O token é non-nullable: o componente lança erro claro se nenhum provider
 * for registrado.
 */
export const DETRA_SEARCH_ADAPTER = new InjectionToken<DetraSearchAdapter>(
  'DETRA_SEARCH_ADAPTER',
);

/* ═══════════════════════════════════════════
   Default adapter — Angular HttpClient
   ═══════════════════════════════════════════ */

import { HttpClient, HttpParams } from '@angular/common/http';

/**
 * Opções para o adapter HTTP default. `baseUrl` é o prefixo do gateway
 * (ex.: `'https://api.exemplo.com/gateway'`).
 */
export interface HttpDetraSearchAdapterOptions {
  baseUrl: string;
}

/**
 * Adapter default — bate em `${baseUrl}/${endpoint}/search/{code}` e
 * `/${endpoint}/search/{code}/columns`. Reproduz o comportamento do
 * `SearchService` legado do medical-ui sem alterar a API pública.
 */
export class HttpDetraSearchAdapter implements DetraSearchAdapter {
  constructor(private readonly http: HttpClient, private readonly options: HttpDetraSearchAdapterOptions) {}

  getColumns(q: { endpoint: string; code: string }): Observable<DetraSearchResponse> {
    return this.http.get<DetraSearchResponse>(
      `${this.options.baseUrl}/${q.endpoint}/search/${q.code}/columns`,
    );
  }

  search(q: DetraSearchQuery): Observable<DetraSearchResponse> {
    let params = new HttpParams().set(q.param, q.value);
    const page = q.page ?? 0;
    if (page > 0) {
      params = params.set('page', page.toString());
    }
    if (q.extraParams) {
      for (const key of Object.keys(q.extraParams)) {
        params = params.set(key, q.extraParams[key]);
      }
    }
    return this.http.get<DetraSearchResponse>(
      `${this.options.baseUrl}/${q.endpoint}/search/${q.code}`,
      { params },
    );
  }
}

/* ═══════════════════════════════════════════
   Provider helpers
   ═══════════════════════════════════════════ */

/**
 * Helper para construir um provider que monta o `HttpDetraSearchAdapter`
 * usando o `HttpClient` do Angular. Use no `appConfig.providers`:
 *
 * ```typescript
 * provideHttpDetraSearchAdapter({ baseUrl: environment.apiURLGateway })
 * ```
 */
export function provideHttpDetraSearchAdapter(options: HttpDetraSearchAdapterOptions): Provider {
  return {
    provide: DETRA_SEARCH_ADAPTER,
    useFactory: () => new HttpDetraSearchAdapter(inject(HttpClient), options),
  };
}

/**
 * Helper para fornecer uma implementação customizada (classe) já registrada
 * como injetável. O Angular usa `useExisting` — a classe deve estar
 * `providedIn: 'root'` ou explicitamente nos `providers`.
 *
 * ```typescript
 * provideExistingDetraSearchAdapter(MyBackendAdapter)
 * ```
 */
export function provideExistingDetraSearchAdapter<T extends DetraSearchAdapter>(
  adapter: Type<T>,
): Provider {
  return {
    provide: DETRA_SEARCH_ADAPTER,
    useExisting: adapter,
  };
}

/**
 * Helper para fornecer uma classe que **ainda não foi instanciada**.
 * Use apenas se quiser que o Angular crie a instância diretamente (sem
 * que ela seja injetável por conta própria).
 *
 * ```typescript
 * provideDetraSearchAdapter(MyBackendAdapter)
 * ```
 */
export function provideDetraSearchAdapter<T extends DetraSearchAdapter>(adapter: Type<T>): Provider {
  return {
    provide: DETRA_SEARCH_ADAPTER,
    useClass: adapter,
  };
}

/**
 * Helper para fornecer uma **instância** já construída (uso avançado).
 */
export function provideDetraSearchAdapterInstance(instance: DetraSearchAdapter): Provider {
  return {
    provide: DETRA_SEARCH_ADAPTER,
    useValue: instance,
  };
}