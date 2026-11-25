import {
  ChangeDetectionStrategy,
  Component,
  Input,
  CSP_NONCE,
  OnChanges,
  PLATFORM_ID,
  inject,
  numberAttribute,
} from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ensureSkeletonStyles } from './skeleton.directive';

export type SkeletonVariant = 'text' | 'title' | 'circle' | 'rect' | 'button';

const VARIANT_CLASS: Record<SkeletonVariant, string> = {
  text: 'ds-sk-line',
  title: 'ds-sk-title',
  circle: 'ds-sk-dot',
  rect: 'ds-sk-box',
  button: 'ds-sk-btn',
};

/**
 * Peça avulsa de skeleton, para montar placeholders de telas inteiras.
 *
 *   <ds-skeleton variant="title"></ds-skeleton>
 *   <ds-skeleton [lines]="3"></ds-skeleton>
 *   <ds-skeleton variant="circle" width="48px"></ds-skeleton>
 *   <ds-skeleton variant="rect" height="180px"></ds-skeleton>
 */
@Component({
  selector: 'ds-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    class: 'ds-sk ds-skeleton',
    'aria-hidden': 'true',
    '[class.ds-sk-stack]': 'bones.length > 1',
  },
  template: `<span
    *ngFor="let cls of bones"
    data-sk
    [class]="cls"
    [style.width]="width"
    [style.height]="variant === 'circle' ? (height || width) : height"
    [style.border-radius]="radius"
  ></span>`,
  styles: [':host{display:block}'],
})
export class SkeletonComponent implements OnChanges {
  @Input() variant: SkeletonVariant = 'text';
  /** Quantidade de linhas (apenas `variant="text"`). A última fica mais curta. */
  @Input({ transform: numberAttribute }) lines = 1;
  @Input() width?: string;
  @Input() height?: string;
  @Input() radius?: string;

  bones: string[] = [VARIANT_CLASS.text];

  constructor() {
    ensureSkeletonStyles(
      inject(DOCUMENT),
      inject(CSP_NONCE, { optional: true }),
      isPlatformBrowser(inject(PLATFORM_ID)),
    );
  }

  ngOnChanges(): void {
    const cls = VARIANT_CLASS[this.variant] ?? VARIANT_CLASS.text;
    const count = this.variant === 'text' ? Math.max(1, this.lines | 0) : 1;
    this.bones = new Array(count).fill(cls);
  }
}
