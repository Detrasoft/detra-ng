import {
  CSP_NONCE,
  Directive,
  Input,
  PLATFORM_ID,
  booleanAttribute,
  inject,
  signal,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DS_SKELETON_CSS, DS_SKELETON_LITE_CSS } from './skeleton.styles';

const STYLE_ID = 'ds-skeleton-styles';
const injected = new WeakSet<Document>();

/** Aparelho fraco: ≤ 2 núcleos ou ≤ 2 GB de RAM (quando o navegador informa). */
function isLowEndDevice(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 2) ||
    (!!nav.deviceMemory && nav.deviceMemory <= 2);
}

/**
 * Injeta a folha de estilo do skeleton uma única vez por documento.
 * Exportada para quem quiser usar os ossos (`data-sk`) sem a diretiva.
 */
export function ensureSkeletonStyles(doc: Document, nonce?: string | null, browser = true): void {
  if (injected.has(doc)) return;
  injected.add(doc);
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  if (nonce) style.setAttribute('nonce', nonce);
  style.textContent = browser && isLowEndDevice() ? DS_SKELETON_CSS + DS_SKELETON_LITE_CSS : DS_SKELETON_CSS;
  doc.head.appendChild(style);
}

/**
 * Liga e desliga o skeleton de qualquer elemento ou componente.
 *
 * Em todos os componentes ds-* ela já vem embutida (host directive) e é exposta
 * como `[skeleton]`:
 *
 *   <ds-input label="Nome" [skeleton]="carregando()"></ds-input>
 *   <ds-list [data]="rows" [skeleton]="loading"></ds-list>
 *
 * Em elementos próprios, use `dsSkeleton` e marque os ossos com `data-sk`:
 *
 *   <div [dsSkeleton]="loading">
 *     <h3 data-sk="text">{{ titulo }}</h3>
 *     <img data-sk="circle" [src]="foto" />
 *   </div>
 *
 * Enquanto ativo: adiciona `.ds-sk`, `aria-busy="true"` e `inert` (sem foco nem clique).
 */
@Directive({
  selector: '[dsSkeleton]',
  standalone: true,
  exportAs: 'dsSkeleton',
  host: {
    '[class.ds-sk]': 'active()',
    '[attr.aria-busy]': "active() ? 'true' : null",
    '[attr.inert]': "active() ? '' : null",
  },
})
export class DsSkeletonDirective {
  /** Estado atual do skeleton, legível nos templates dos componentes (signal). */
  readonly active = signal(false);

  @Input({ alias: 'dsSkeleton', transform: booleanAttribute })
  set skeleton(value: boolean) {
    this.active.set(value);
  }

  constructor() {
    ensureSkeletonStyles(
      inject(DOCUMENT),
      inject(CSP_NONCE, { optional: true }),
      isPlatformBrowser(inject(PLATFORM_ID)),
    );
  }
}

/**
 * Configuração padrão de host directive usada por todos os componentes ds-*:
 * expõe o input `[skeleton]` e injeta a `DsSkeletonDirective` no componente.
 */
export const DS_SKELETON_HOST = {
  directive: DsSkeletonDirective,
  inputs: ['dsSkeleton: skeleton'],
};

/** Linhas de placeholder reutilizadas pelos componentes (sem alocar a cada CD). */
export const DS_SKELETON_ROWS: readonly number[] = [0, 1, 2, 3, 4];
