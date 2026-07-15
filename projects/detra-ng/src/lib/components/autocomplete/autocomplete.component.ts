import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  forwardRef,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  Overlay,
  OverlayModule,
  OverlayRef,
  FlexibleConnectedPositionStrategy,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

/* ═══════════════════════════════════════════
   Precomputed view-model rows.
   Built once whenever the suggestion set / query /
   selection changes — never re-evaluated per
   change-detection cycle.
   ═══════════════════════════════════════════ */
interface SuggestionRow {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  key: any;
  labelHtml: string;
  selected: boolean;
}

interface ChipRow {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  key: any;
  label: string;
}

/* ═══════════════════════════════════════════
   AutoComplete Component
   ═══════════════════════════════════════════ */

@Component({
  selector: 'ds-autocomplete',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, OverlayModule],
  styleUrl: './autocomplete.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AutocompleteComponent),
      multi: true,
    },
  ],
  template: `
    <div
      class="ds-autocomplete-wrapper"
      [class.ds-autocomplete--error]="error"
      [class.ds-autocomplete--disabled]="disabled"
    >
      <!-- Label -->
      <label *ngIf="label" class="ds-autocomplete__label" [attr.for]="inputId">
        {{ label }}
        <span *ngIf="required" class="ds-autocomplete__required">*</span>
      </label>

      <!-- Field Container -->
      <div class="ds-autocomplete__container" #origin>
        <div
          class="ds-autocomplete__field-wrapper"
          [class.ds-autocomplete__field-wrapper--focused]="isFocused"
          [class.ds-autocomplete__field-wrapper--disabled]="disabled"
          [class.ds-autocomplete__field-wrapper--has-dropdown]="dropdown"
          (click)="focusInput()"
        >
          <!-- Chips (multiple mode) — labels precomputed in chipRows -->
          <ng-container *ngIf="multiple">
            <span *ngFor="let chip of chipRows; let i = index; trackBy: trackByChip" class="ds-autocomplete__chip">
              <span class="ds-autocomplete__chip-text">{{ chip.label }}</span>
              <button
                type="button"
                class="ds-autocomplete__chip-remove"
                (click)="removeChip(i, $event)"
                [disabled]="disabled"
                [attr.aria-label]="'Remover ' + chip.label"
              >
                ✕
              </button>
            </span>
          </ng-container>

          <!-- Input -->
          <input
            #inputEl
            [id]="inputId"
            type="text"
            class="ds-autocomplete__field"
            [placeholder]="!multiple || selectedItems.length === 0 ? placeholder : ''"
            [disabled]="disabled"
            [value]="inputValue"
            role="combobox"
            autocomplete="off"
            [attr.aria-expanded]="isPanelOpen"
            [attr.aria-controls]="isPanelOpen ? panelId : null"
            [attr.aria-activedescendant]="activeIndex >= 0 ? panelId + '-' + activeIndex : null"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            (input)="onInput($event)"
            (focus)="onFocus()"
            (blur)="onBlur()"
            (keydown)="onKeydown($event)"
          />
        </div>

        <!-- Dropdown toggle -->
        <button
          *ngIf="dropdown"
          type="button"
          class="ds-autocomplete__toggle"
          [class.ds-autocomplete__toggle--open]="isPanelOpen"
          [disabled]="disabled"
          tabindex="-1"
          aria-label="Mostrar opções"
          (click)="onDropdownClick($event)"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      <!-- Error / Hint -->
      <span *ngIf="error" class="ds-autocomplete__error">{{ error }}</span>
      <span *ngIf="hint && !error" class="ds-autocomplete__hint">{{ hint }}</span>
    </div>

    <!-- ═══════════════════════════════════════════
         Overlay Panel Template
         ═══════════════════════════════════════════ -->
    <ng-template #panelTemplate>
      <div
        class="ds-autocomplete__panel"
        [id]="panelId"
        role="listbox"
        [attr.aria-label]="label || 'Sugestões'"
      >
        <!-- Loading -->
        <div *ngIf="loading" class="ds-autocomplete__loading">
          <span class="ds-autocomplete__spinner"></span>
          <span>Carregando…</span>
        </div>

        <!-- Items (precomputed per suggestion set, not per CD) -->
        <ng-container *ngIf="!loading">
          <button
            *ngFor="let row of suggestionRows; let i = index; trackBy: trackByRow"
            type="button"
            class="ds-autocomplete__item"
            [class.ds-autocomplete__item--active]="i === activeIndex"
            [class.ds-autocomplete__item--selected]="multiple && row.selected"
            [id]="panelId + '-' + i"
            role="option"
            [attr.aria-selected]="i === activeIndex"
            (click)="selectItem(row.raw, $event)"
            (mouseenter)="activeIndex = i"
          >
            <!-- Check mark for already-selected items (multiple) -->
            <span *ngIf="multiple && row.selected" class="ds-autocomplete__item-check">✓</span>

            <!-- Custom template or default highlighted text -->
            <ng-container *ngIf="itemTemplate; else defaultItemTpl">
              <ng-container
                *ngTemplateOutlet="itemTemplate; context: { $implicit: row.raw, query: inputValue }"
              ></ng-container>
            </ng-container>

            <ng-template #defaultItemTpl>
              <span [innerHTML]="row.labelHtml"></span>
            </ng-template>
          </button>

          <!-- Empty state -->
          <div
            *ngIf="suggestionRows.length === 0 && inputValue.length >= minLength"
            class="ds-autocomplete__empty"
          >
            {{ emptyMessage }}
          </div>
        </ng-container>
      </div>
    </ng-template>
  `,
})
export class AutocompleteComponent
  implements ControlValueAccessor, OnInit, OnChanges, OnDestroy
{
  private readonly overlay = inject(Overlay);
  private readonly vcr = inject(ViewContainerRef);
  private readonly cdr = inject(ChangeDetectorRef);

  /* ── Inputs ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() suggestions: any[] = [];
  @Input() field = '';
  @Input() dropdown = false;
  @Input() multiple = false;
  @Input() loading = false;
  @Input() emptyMessage = 'Nenhum resultado encontrado.';
  @Input() placeholder = '';
  @Input() label = '';
  @Input() error = '';
  @Input() hint = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() minLength = 1;
  @Input() debounce = 300;
  @Input() forceSelection = false;
  @Input() inputId = `ds-ac-${Math.random().toString(36).slice(2, 9)}`;

  /* ── Outputs ── */
  @Output() completeMethod = new EventEmitter<{ query: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() onSelect = new EventEmitter<any>();
  @Output() onClear = new EventEmitter<void>();

  /* ── Content projection ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @ContentChild('itemTemplate') itemTemplate?: TemplateRef<{ $implicit: any; query: string }>;

  /* ── ViewChildren ── */
  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;
  @ViewChild('panelTemplate') panelTemplate!: TemplateRef<unknown>;
  @ViewChild('origin') originRef!: ElementRef<HTMLElement>;

  /* ── State ── */
  inputValue = '';
  isFocused = false;
  isPanelOpen = false;
  activeIndex = -1;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedItems: any[] = [];
  panelId = `ds-ac-panel-${Math.random().toString(36).slice(2, 9)}`;

  // ── Precomputed view-model (the perf fix) ──
  // suggestionRows is kept strictly parallel to `suggestions` and is the only
  // thing the template iterates. Highlighted HTML and the selected flag are
  // computed once when data/query/selection changes — never per CD cycle.
  suggestionRows: SuggestionRow[] = [];
  chipRows: ChipRow[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private selectedKeys = new Set<any>();
  private highlightRegex: RegExp | null = null;
  private highlightTermCache = '\u0000'; // sentinel: never equals a real term

  /* ── Internals ── */
  private overlayRef: OverlayRef | null = null;
  private backdropSub?: Subscription;
  private readonly search$ = new Subject<string>();
  private searchSub?: Subscription;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private singleValue: any = null;

  /* ── CVA ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onChangeFn: (v: any) => void = () => {};
  private onTouchedFn: () => void = () => {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  writeValue(value: any): void {
    if (this.multiple) {
      this.selectedItems = Array.isArray(value) ? [...value] : [];
      this.inputValue = '';
      this.updateSelectionDerived();
    } else {
      this.singleValue = value ?? null;
      this.inputValue = value ? this.getItemLabel(value) : '';
    }
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

  /* ── Lifecycle ── */

  ngOnInit(): void {
    this.searchSub = this.search$.pipe(debounceTime(this.debounce)).subscribe((query) => {
      this.completeMethod.emit({ query });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Rebuild the precomputed rows whenever the parent pushes a new suggestion
    // list (new reference). Under OnPush an input reference change already marks
    // the component for check, so no explicit markForCheck is required here.
    if (changes['suggestions']) {
      this.rebuildSuggestionRows();
    }
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.backdropSub?.unsubscribe();
    this.destroyOverlay();
  }

  /* ══════════════════════════════════════════
     Public API / Template methods
     ══════════════════════════════════════════ */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getItemLabel(item: any): string {
    if (item == null) return '';
    if (typeof item === 'string') return item;
    if (this.field) {
      const value = this.resolveField(item, this.field);
      return value != null ? String(value) : '';
    }
    return String(item);
  }

  /**
   * Resolves a dot-separated field path on an object.
   * e.g. resolveField({ pessoa: { nome: 'X' } }, 'pessoa.nome') => 'X'
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolveField(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }

  focusInput(): void {
    if (!this.disabled) {
      this.inputEl?.nativeElement?.focus();
    }
  }

  /* ── Input events ── */

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.inputValue = value;
    this.activeIndex = -1;

    if (value.length >= this.minLength) {
      this.search$.next(value);
      this.openPanel();
    } else {
      this.closePanel();
    }

    // In single mode, clear value when user types
    if (!this.multiple && this.singleValue) {
      this.singleValue = null;
      this.onChangeFn(null);
      this.onClear.emit();
    }

    // Re-highlight currently shown rows against the new query. (Suggestions for
    // the new query arrive later via @Input → ngOnChanges, which rebuilds again.)
    this.rebuildSuggestionRows();
  }

  onFocus(): void {
    this.isFocused = true;
  }

  onBlur(): void {
    this.isFocused = false;
    this.onTouchedFn();

    // Delay to allow click events on items to fire
    setTimeout(() => {
      if (!this.isPanelOpen) return;

      if (this.forceSelection && !this.multiple) {
        if (!this.singleValue) {
          this.inputValue = '';
          this.onChangeFn(null);
        } else {
          this.inputValue = this.getItemLabel(this.singleValue);
        }
      }

      this.closePanel();
      this.cdr.markForCheck();
    }, 200);
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.isPanelOpen) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (this.suggestions.length > 0) {
          this.openPanel();
        }
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex = (this.activeIndex + 1) % this.suggestions.length;
        this.scrollToActive();
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex =
          this.activeIndex <= 0 ? this.suggestions.length - 1 : this.activeIndex - 1;
        this.scrollToActive();
        break;

      case 'Enter':
        event.preventDefault();
        if (this.activeIndex >= 0 && this.activeIndex < this.suggestions.length) {
          this.selectItem(this.suggestions[this.activeIndex]);
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.closePanel();
        break;

      case 'Backspace':
        if (this.multiple && this.inputValue === '' && this.selectedItems.length > 0) {
          this.removeChip(this.selectedItems.length - 1);
        }
        break;
    }
  }

  /* ── Dropdown button ── */
  onDropdownClick(event: Event): void {
    event.stopPropagation();
    if (this.disabled) return;

    if (this.isPanelOpen) {
      this.closePanel();
    } else {
      this.completeMethod.emit({ query: this.inputValue });
      this.openPanel();
      this.focusInput();
    }
  }

  /* ── Selection ── */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectItem(item: any, event?: Event): void {
    event?.stopPropagation();

    if (this.multiple) {
      const idx = this.findSelectedIndex(item);
      if (idx >= 0) {
        // Toggle off
        this.selectedItems = this.selectedItems.filter((_, i) => i !== idx);
      } else {
        this.selectedItems = [...this.selectedItems, item];
      }
      this.inputValue = '';
      this.updateSelectionDerived();
      this.onChangeFn([...this.selectedItems]);
      this.onSelect.emit(item);
      // Keep panel open in multiple mode
      this.focusInput();
    } else {
      this.singleValue = item;
      this.inputValue = this.getItemLabel(item);
      this.onChangeFn(item);
      this.onSelect.emit(item);
      this.closePanel();
    }
  }

  removeChip(index: number, event?: Event): void {
    event?.stopPropagation();
    this.selectedItems = this.selectedItems.filter((_, i) => i !== index);
    this.updateSelectionDerived();
    this.onChangeFn([...this.selectedItems]);
    this.focusInput();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isSelected(item: any): boolean {
    return this.findSelectedIndex(item) >= 0;
  }

  /* ── Highlight ── */

  highlightMatch(text: string, query: string): string {
    return this.highlightWith(text, this.getHighlightRegex(query));
  }

  /* ══════════════════════════════════════════
     CDK Overlay
     ══════════════════════════════════════════ */

  private openPanel(): void {
    if (this.isPanelOpen || this.disabled) return;

    const positionStrategy: FlexibleConnectedPositionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.originRef)
      .withPositions([
        {
          originX: 'start',
          originY: 'bottom',
          overlayX: 'start',
          overlayY: 'top',
          offsetY: 4,
        },
        {
          originX: 'start',
          originY: 'top',
          overlayX: 'start',
          overlayY: 'bottom',
          offsetY: -4,
        },
      ])
      .withPush(false);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      width: this.originRef.nativeElement.offsetWidth,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
    });

    const portal = new TemplatePortal(this.panelTemplate, this.vcr);
    this.overlayRef.attach(portal);

    this.isPanelOpen = true;

    this.backdropSub?.unsubscribe();
    this.backdropSub = this.overlayRef.backdropClick().subscribe(() => {
      this.closePanel();
      this.cdr.markForCheck();
    });
  }

  private closePanel(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
    this.isPanelOpen = false;
    this.activeIndex = -1;
  }

  private destroyOverlay(): void {
    this.closePanel();
  }

  /* ══════════════════════════════════════════
     View-model precomputation (performance core)
     ══════════════════════════════════════════ */

  trackByRow(index: number, row: SuggestionRow): unknown {
    return row.key ?? index;
  }

  trackByChip(index: number, chip: ChipRow): unknown {
    return chip.key ?? index;
  }

  /**
   * Returns the highlight RegExp for the given term, compiling it at most once
   * per distinct term. Previously a new RegExp was allocated for every suggestion
   * on every change-detection pass — the main source of GC churn on mobile.
   */
  private getHighlightRegex(term: string): RegExp | null {
    if (term === this.highlightTermCache) return this.highlightRegex;
    this.highlightTermCache = term;
    if (!term) {
      this.highlightRegex = null;
      return null;
    }
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    this.highlightRegex = new RegExp(`(${escaped})`, 'gi');
    return this.highlightRegex;
  }

  private highlightWith(text: string, regex: RegExp | null): string {
    const safe = this.escapeHtml(text);
    if (!regex) return safe;
    regex.lastIndex = 0;
    return safe.replace(regex, '<span class="ds-autocomplete__highlight">$1</span>');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private keyOf(item: any): any {
    if (item == null) return null;
    if (typeof item === 'string') return item;
    if (this.field) return this.resolveField(item, this.field);
    return item;
  }

  private rebuildSuggestionRows(): void {
    const regex = this.getHighlightRegex(this.inputValue);
    const list = this.suggestions || [];
    this.suggestionRows = list.map((item) => {
      const key = this.keyOf(item);
      return {
        raw: item,
        key,
        labelHtml: this.highlightWith(this.getItemLabel(item), regex),
        selected: this.multiple ? this.selectedKeys.has(key) : false,
      };
    });
  }

  /**
   * Recomputes selection-dependent view state (chip labels, the O(1) selected-key
   * lookup Set, and the per-row `selected` flag). Runs only when the selection
   * changes — never per change-detection — replacing the old O(n·m) per-pass
   * `isSelected` scans inside *ngFor.
   */
  private updateSelectionDerived(): void {
    this.selectedKeys = new Set(this.selectedItems.map((s) => this.keyOf(s)));
    this.chipRows = this.selectedItems.map((s) => ({
      raw: s,
      key: this.keyOf(s),
      label: this.getItemLabel(s),
    }));
    for (const row of this.suggestionRows) {
      row.selected = this.multiple ? this.selectedKeys.has(row.key) : false;
    }
  }

  /* ── Helpers ── */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private findSelectedIndex(item: any): number {
    return this.selectedItems.findIndex((s) => {
      if (typeof s === 'string') return s === item;
      if (this.field)
        return this.resolveField(s, this.field) === this.resolveField(item, this.field);
      return s === item;
    });
  }

  private scrollToActive(): void {
    const panel = this.overlayRef?.overlayElement?.querySelector('.ds-autocomplete__panel');
    const active = panel?.querySelector(`#${this.panelId}-${this.activeIndex}`) as HTMLElement;
    if (active && panel) {
      const panelRect = panel.getBoundingClientRect();
      const itemRect = active.getBoundingClientRect();
      if (itemRect.bottom > panelRect.bottom) {
        active.scrollIntoView({ block: 'nearest' });
      } else if (itemRect.top < panelRect.top) {
        active.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }
}
