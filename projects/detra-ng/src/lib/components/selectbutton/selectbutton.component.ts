import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  booleanAttribute,
  forwardRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DS_SKELETON_HOST } from '../skeleton/skeleton.directive';
import type {
  SelectButtonColumns,
  SelectButtonIconPosition,
  SelectButtonSize,
} from './selectbutton.types';

/* ═══════════════════════════════════════════
   SelectButton Component
   Seletor inline: todas as opções ficam visíveis (sem dropdown).
   - single  → role="radiogroup" + aria-checked, roving tabindex, setas movem foco e seleção
   - multiple → role="group" + aria-pressed, cada botão é um toggle
   ═══════════════════════════════════════════ */

@Component({
  selector: 'ds-selectbutton',
  hostDirectives: [DS_SKELETON_HOST],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styleUrl: './selectbutton.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectButtonComponent),
      multi: true,
    },
  ],
  template: `
    <div
      class="ds-selectbutton-wrapper"
      [class.ds-selectbutton--error]="!!error"
      [class.ds-selectbutton--disabled]="disabled"
      [class.ds-selectbutton--locked]="locked"
    >
      <span *ngIf="label" class="ds-selectbutton__label" [id]="labelId" data-sk="text">
        {{ label }}
        <span *ngIf="required" class="ds-selectbutton__required" aria-hidden="true">*</span>
      </span>

      <div
        class="ds-selectbutton__group"
        [class.ds-selectbutton__group--grid]="columns !== 'auto'"
        [class.ds-selectbutton__group--sm]="size === 'sm'"
        [class.ds-selectbutton__group--lg]="size === 'lg'"
        [class.ds-selectbutton__group--top]="iconPosition === 'top'"
        [style.grid-template-columns]="gridTemplate"
        [id]="inputId || null"
        [attr.role]="multiple ? 'group' : 'radiogroup'"
        [attr.aria-labelledby]="label ? labelId : null"
        [attr.aria-label]="label ? null : (ariaLabel || null)"
        [attr.aria-required]="!multiple && required ? true : null"
        [attr.aria-invalid]="error ? true : null"
        [attr.aria-disabled]="disabled ? true : null"
        [attr.aria-readonly]="!multiple && locked ? true : null"
        [attr.aria-describedby]="error || hint ? describedById : null"
        data-sk
      >
        <button
          *ngFor="let opt of options; let i = index; trackBy: trackByFn"
          type="button"
          class="ds-selectbutton__item"
          [class.ds-selectbutton__item--selected]="isSelected(opt)"
          [class.ds-selectbutton__item--disabled]="isOptionDisabled(opt)"
          [attr.role]="multiple ? null : 'radio'"
          [attr.aria-checked]="multiple ? null : isSelected(opt)"
          [attr.aria-pressed]="multiple ? isSelected(opt) : null"
          [attr.aria-disabled]="isOptionDisabled(opt) || locked ? true : null"
          [attr.tabindex]="tabIndexFor(i)"
          [attr.title]="getTitle(opt)"
          [attr.data-index]="i"
          [disabled]="disabled || isOptionDisabled(opt)"
          (click)="onItemClick(opt)"
          (keydown)="onKeydown($event, i)"
          (blur)="onBlur()"
        >
          <i
            *ngIf="getIcon(opt) as icon"
            [class]="'ds-selectbutton__icon ' + icon"
            aria-hidden="true"
          ></i>
          <span class="ds-selectbutton__text">{{ getLabel(opt) }}</span>
        </button>
      </div>

      <span *ngIf="error" class="ds-selectbutton__error" [id]="describedById" data-sk="text">{{ error }}</span>
      <span *ngIf="hint && !error" class="ds-selectbutton__hint" [id]="describedById" data-sk="text">{{ hint }}</span>
    </div>
  `,
})
export class SelectButtonComponent implements ControlValueAccessor {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /* ── Inputs ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() options: readonly any[] = [];
  @Input() optionLabel = 'label';
  @Input() optionValue = 'value';
  @Input() optionIcon = 'icon';
  @Input() optionDisabled = 'disabled';
  @Input() label = '';
  /** Rótulo acessível quando não há `label` visível. */
  @Input() ariaLabel = '';
  @Input() hint = '';
  @Input() error = '';
  @Input({ transform: booleanAttribute }) required = false;
  @Input() inputId = '';
  @Input({ transform: booleanAttribute }) multiple = false;
  /** Permite desmarcar a opção selecionada (single) ou ficar sem nenhuma (multiple). */
  @Input({ transform: booleanAttribute }) allowEmpty = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  /** Somente leitura: mostra a seleção com aparência normal, mas não deixa mudar. */
  @Input({ transform: booleanAttribute }) locked = false;
  @Input() iconPosition: SelectButtonIconPosition = 'left';
  @Input() columns: SelectButtonColumns = 'auto';
  @Input() size: SelectButtonSize = 'md';

  /* ── Outputs ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() valueChange = new EventEmitter<any>();

  /* ── State ── */
  private readonly uid = Math.random().toString(36).slice(2, 9);
  readonly labelId = `ds-sb-label-${this.uid}`;
  readonly describedById = `ds-sb-desc-${this.uid}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private value: any = null;

  /* ── CVA ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onChangeFn: (v: any) => void = () => {};
  private onTouchedFn: () => void = () => {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  writeValue(value: any): void {
    this.value = this.multiple ? (Array.isArray(value) ? [...value] : value == null ? [] : [value]) : (value ?? null);
    this.cdr.markForCheck();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerOnChange(fn: (v: any) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  /* ── Template helpers ── */

  get gridTemplate(): string | null {
    if (this.columns === 'auto') return null;
    const n = Math.max(1, Math.floor(Number(this.columns) || 1));
    return `repeat(${n}, minmax(0, 1fr))`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getLabel(opt: any): string {
    if (opt == null) return '';
    if (typeof opt !== 'object') return String(opt);
    const v = this.optionLabel ? this.resolveField(opt, this.optionLabel) : undefined;
    return v == null ? '' : String(v);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getIcon(opt: any): string | null {
    if (opt == null || typeof opt !== 'object' || !this.optionIcon) return null;
    const v = this.resolveField(opt, this.optionIcon);
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTitle(opt: any): string | null {
    if (opt && typeof opt === 'object' && typeof opt.title === 'string') return opt.title;
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getValue(opt: any): any {
    if (opt == null || typeof opt !== 'object') return opt;
    return this.optionValue ? this.resolveField(opt, this.optionValue) : opt;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isOptionDisabled(opt: any): boolean {
    if (opt == null || typeof opt !== 'object' || !this.optionDisabled) return false;
    return !!this.resolveField(opt, this.optionDisabled);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isSelected(opt: any): boolean {
    const v = this.getValue(opt);
    if (this.multiple) {
      return Array.isArray(this.value) && this.value.some((x) => this.equals(x, v));
    }
    return this.value != null && this.equals(this.value, v);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trackByFn = (index: number, opt: any): any => {
    const v = this.getValue(opt);
    return v != null && typeof v !== 'object' ? v : index;
  };

  /** Roving tabindex no modo single; no multiple todo botão habilitado é tabulável. */
  tabIndexFor(index: number): number {
    if (this.disabled) return -1;
    const opt = this.options[index];
    if (this.isOptionDisabled(opt)) return -1;
    if (this.multiple) return 0;
    const selectedIdx = this.options.findIndex((o) => this.isSelected(o) && !this.isOptionDisabled(o));
    const focusIdx = selectedIdx >= 0 ? selectedIdx : this.firstEnabledIndex();
    return index === focusIdx ? 0 : -1;
  }

  /* ── Interaction ── */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onItemClick(opt: any): void {
    if (this.disabled || this.locked || this.isOptionDisabled(opt)) return;
    this.toggle(opt);
  }

  onBlur(): void {
    this.onTouchedFn();
  }

  onKeydown(event: KeyboardEvent, index: number): void {
    if (this.disabled) return;
    const key = event.key;

    if (this.multiple) {
      // Toggles: setas só movem o foco; Espaço/Enter já disparam o click nativo do botão.
      const dir = this.directionFor(key);
      if (dir === 0) return;
      event.preventDefault();
      this.focusIndex(this.nextEnabledIndex(index, dir));
      return;
    }

    if (key === ' ' || key === 'Enter') {
      event.preventDefault();
      const opt = this.options[index];
      if (!this.locked && !this.isOptionDisabled(opt) && !this.isSelected(opt)) this.select(opt);
      return;
    }

    let target = -1;
    if (key === 'Home') target = this.firstEnabledIndex();
    else if (key === 'End') target = this.lastEnabledIndex();
    else {
      const dir = this.directionFor(key);
      if (dir === 0) return;
      target = this.nextEnabledIndex(index, dir);
    }
    event.preventDefault();
    if (target < 0) return;
    this.focusIndex(target);
    if (!this.locked) this.select(this.options[target]);
  }

  /* ── Internals ── */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toggle(opt: any): void {
    const v = this.getValue(opt);
    if (this.multiple) {
      const current: unknown[] = Array.isArray(this.value) ? this.value : [];
      const has = current.some((x) => this.equals(x, v));
      if (has && !this.allowEmpty && current.length === 1) return;
      this.commit(has ? current.filter((x) => !this.equals(x, v)) : [...current, v]);
      return;
    }
    if (this.isSelected(opt)) {
      if (this.allowEmpty) this.commit(null);
      return;
    }
    this.commit(v);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private select(opt: any): void {
    if (this.isSelected(opt)) return;
    this.commit(this.getValue(opt));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private commit(next: any): void {
    this.value = next;
    this.onChangeFn(next);
    this.valueChange.emit(next);
    this.onTouchedFn();
    this.cdr.markForCheck();
  }

  private directionFor(key: string): 1 | -1 | 0 {
    if (key === 'ArrowRight' || key === 'ArrowDown') return 1;
    if (key === 'ArrowLeft' || key === 'ArrowUp') return -1;
    return 0;
  }

  private nextEnabledIndex(from: number, dir: 1 | -1): number {
    const n = this.options.length;
    for (let step = 1; step <= n; step++) {
      const i = (from + dir * step + n * step) % n;
      if (!this.isOptionDisabled(this.options[i])) return i;
    }
    return -1;
  }

  private firstEnabledIndex(): number {
    return this.options.findIndex((o) => !this.isOptionDisabled(o));
  }

  private lastEnabledIndex(): number {
    for (let i = this.options.length - 1; i >= 0; i--) {
      if (!this.isOptionDisabled(this.options[i])) return i;
    }
    return -1;
  }

  private focusIndex(index: number): void {
    if (index < 0) return;
    const el = this.host.nativeElement.querySelector<HTMLButtonElement>(
      `.ds-selectbutton__item[data-index="${index}"]`,
    );
    el?.focus();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private equals(a: any, b: any): boolean {
    if (a === b) return true;
    if (a && b && typeof a === 'object' && typeof b === 'object' && 'id' in a && 'id' in b) {
      return a.id === b.id;
    }
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolveField(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }
}
