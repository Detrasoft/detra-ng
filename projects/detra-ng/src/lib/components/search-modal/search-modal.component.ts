import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { Subject, Subscription } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  tap,
  catchError,
} from 'rxjs/operators';
import { of } from 'rxjs';
import { DETRA_SEARCH_ADAPTER } from '../../search/search.tokens';
import { DetraSearchAdapter, DetraSearchColumn, DetraSearchResponse } from '../../search/search.types';

/* ═══════════════════════════════════════════
   Filter Option — internal type
   ═══════════════════════════════════════════ */
interface FilterOption {
  label: string;
  field: string; // 'any' for "Todos"
}

/* ═══════════════════════════════════════════
   Precomputed view-model rows.
   ═══════════════════════════════════════════ */
interface SearchRow {
  raw: unknown;
  key: unknown;
  principalHtml: string;
  details: { label: string; value: string }[];
  selected: boolean;
}

interface ChipRow {
  key: unknown;
  label: string;
}

/* ═══════════════════════════════════════════
   Search Modal Component
   ═══════════════════════════════════════════ */

@Component({
  selector: 'ds-search-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, OverlayModule],
  styleUrl: './search-modal.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchModalComponent),
      multi: true,
    },
  ],
  template: `
    <div
      class="ds-search-modal-wrapper"
      [class.ds-search-modal--error]="error"
      [class.ds-search-modal--disabled]="disabled"
    >
      <label *ngIf="label" class="ds-search-modal__label">
        {{ label }}
        <span *ngIf="required" class="ds-search-modal__required">*</span>
      </label>

      <div class="ds-search-modal__trigger">
        <div
          class="ds-search-modal__trigger-row"
          [class.ds-search-modal__trigger-row--disabled]="disabled"
          [class.ds-search-modal__trigger-row--has-chips]="multiple && selectedItems.length > 0"
          (click)="openModal()"
        >
          <button
            type="button"
            class="ds-search-modal__trigger-icon"
            [disabled]="disabled"
            tabindex="-1"
            aria-label="Abrir pesquisa"
            (click)="openModal(); $event.stopPropagation()"
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
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          <div class="ds-search-modal__trigger-area">
            <span class="ds-search-modal__chip" *ngFor="let chip of chipRows; let ci = index; trackBy: trackByChip">
              <span class="ds-search-modal__chip-text">{{ chip.label }}</span>
              <button
                type="button"
                class="ds-search-modal__chip-remove"
                [disabled]="disabled"
                (click)="removeChip(ci, $event)"
                aria-label="Remover"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </span>

            <input
              type="text"
              class="ds-search-modal__trigger-input"
              [placeholder]="getEffectivePlaceholder()"
              [disabled]="disabled"
              [value]="displayValue"
              readonly
              role="combobox"
              aria-haspopup="dialog"
              [attr.aria-expanded]="isModalOpen"
              (focus)="openModal()"
            />
          </div>

          <div class="ds-search-modal__trigger-actions">
            <button
              *ngIf="hasTriggerValue()"
              type="button"
              class="ds-search-modal__trigger-clear"
              [disabled]="disabled"
              tabindex="-1"
              aria-label="Limpar seleção"
              (click)="clearTriggerValue($event)"
            >
              <i class="fa-solid fa-eraser"></i>
            </button>
          </div>
        </div>
      </div>

      <span *ngIf="error" class="ds-search-modal__error-msg">{{ error }}</span>
      <span *ngIf="hint && !error" class="ds-search-modal__hint-msg">{{ hint }}</span>
    </div>

    <ng-template #modalTemplate>
      <div class="ds-search-modal__backdrop" (click)="onBackdropClick()">
        <div class="ds-search-modal__card" (click)="$event.stopPropagation()">

          <div class="ds-search-modal__header">
            <div class="ds-search-modal__search-row">
              <i class="fa-solid fa-search ds-search-modal__search-icon"></i>
              <input
                #modalInputEl
                type="text"
                class="ds-search-modal__search-input"
                [placeholder]="placeholder"
                [value]="modalInputValue"
                autocomplete="off"
                (input)="onModalInput($event)"
                (keydown)="onModalKeydown($event)"
              />
              <div *ngIf="searching && !loadingMore" class="ds-search-modal__spinner"></div>
              <button
                *ngIf="modalInputValue && !searching"
                type="button"
                class="ds-search-modal__clear-btn"
                (click)="clearModalSearch()"
                aria-label="Limpar busca"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
              <button
                type="button"
                class="ds-search-modal__close-btn"
                (click)="closeModal()"
                aria-label="Fechar pesquisa"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div *ngIf="filterByColumn && filterOptions.length > 1" class="ds-search-modal__filters">
              <button
                *ngFor="let opt of filterOptions"
                type="button"
                class="ds-search-modal__filter-chip"
                [class.ds-search-modal__filter-chip--active]="opt.field === activeFilter.field"
                (click)="selectFilter(opt)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <div class="ds-search-modal__body" (scroll)="onResultsScroll($event)">
            <div *ngIf="searching && !loadingMore" class="ds-search-modal__loading">
              <span class="ds-search-modal__loading-spinner"></span>
              <span>Buscando…</span>
            </div>

            <ng-container *ngIf="!searching || loadingMore">
              <div *ngIf="viewRows.length > 0" class="ds-search-modal__results-header">
                <i class="fa-solid fa-list"></i>
                {{ totalRecords }} resultado{{ totalRecords !== 1 ? 's' : '' }} encontrado{{
                  totalRecords !== 1 ? 's' : ''
                }}
              </div>

              <div
                *ngFor="let row of viewRows; let i = index; trackBy: trackByRow"
                class="ds-search-modal__result-item"
                [class.ds-search-modal__result-item--active]="i === activeIndex"
                [class.ds-search-modal__result-item--selected]="multiple && row.selected"
                (click)="selectItem(row.raw)"
              >
                <i *ngIf="multiple && row.selected" class="fa-solid fa-circle-check ds-search-modal__result-check"></i>

                <div class="ds-search-modal__result-name" [innerHTML]="row.principalHtml"></div>

                <div class="ds-search-modal__result-details" *ngIf="row.details.length > 0">
                  <span class="ds-search-modal__result-tag" *ngFor="let d of row.details; trackBy: trackByDetail">
                    <span class="ds-search-modal__result-tag__label">{{ d.label }}:</span>
                    {{ d.value }}
                  </span>
                </div>
              </div>

              <div *ngIf="loadingMore" class="ds-search-modal__loading-more">
                <span class="ds-search-modal__loading-spinner"></span>
                <span>Carregando mais…</span>
              </div>

              <div
                *ngIf="viewRows.length === 0 && hasSearched"
                class="ds-search-modal__empty"
              >
                <i class="fa-solid fa-search"></i>
                <span>Nenhum resultado encontrado<ng-container *ngIf="modalInputValue"> para "<strong>{{ modalInputValue }}</strong>"</ng-container></span>
              </div>
            </ng-container>
          </div>

          <button
            type="button"
            class="ds-search-modal__fab-close"
            (click)="closeModal()"
            aria-label="Fechar"
          >
            <i class="fa-solid fa-xmark"></i>
            Fechar
          </button>
        </div>
      </div>
    </ng-template>
  `,
})
export class SearchModalComponent implements ControlValueAccessor, OnInit, OnDestroy {
  private readonly overlay = inject(Overlay);
  private readonly vcr = inject(ViewContainerRef);
  private readonly adapter = inject<DetraSearchAdapter>(DETRA_SEARCH_ADAPTER);
  private readonly cdr = inject(ChangeDetectorRef);

  /* ── Inputs ── */
  @Input() endpoint = '';
  @Input() code = '';
  @Input() label = '';
  @Input() placeholder = 'Pesquisar...';
  @Input() error = '';
  @Input() hint = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() forceSelection = true;
  @Input() filterByColumn = false;
  @Input() minLength = 1;
  @Input() debounce = 400;
  @Input() multiple = false;
  @Input() extraParams: Record<string, string> = {};

  /* ── Outputs ── */
  @Output() onSelect = new EventEmitter<any>();

  /* ── ViewChildren ── */
  @ViewChild('modalTemplate') modalTemplate!: TemplateRef<unknown>;
  @ViewChild('modalInputEl') modalInputEl!: ElementRef<HTMLInputElement>;

  /* ── State ── */
  displayValue = '';
  modalInputValue = '';
  isModalOpen = false;
  searching = false;
  loadingMore = false;
  hasSearched = false;
  activeIndex = -1;

  columns: DetraSearchColumn[] = [];
  filterOptions: FilterOption[] = [{ label: 'Todos', field: 'any' }];
  activeFilter: FilterOption = this.filterOptions[0];

  searchResults: any[] = [];

  viewRows: SearchRow[] = [];
  chipRows: ChipRow[] = [];
  private selectedKeys = new Set<unknown>();
  private keyFieldName = 'id';
  private highlightRegex: RegExp | null = null;
  private highlightTermCache = ' ';

  currentPage = 0;
  totalPages = 0;
  totalRecords = 0;
  isLastPage = true;

  principalColumn: DetraSearchColumn | null = null;
  detailColumns: DetraSearchColumn[] = [];

  /* ── Internals ── */
  private modalOverlayRef: OverlayRef | null = null;
  private readonly search$ = new Subject<string>();
  private searchSub?: Subscription;
  private directSearchSub?: Subscription;
  private loadMoreSub?: Subscription;
  private selectedValue: any = null;

  selectedItems: any[] = [];

  /* ── CVA ── */
  private onChangeFn: (v: any) => void = () => {};
  private onTouchedFn: () => void = () => {};

  writeValue(value: any): void {
    if (this.multiple) {
      this.selectedItems = Array.isArray(value) ? [...value] : [];
      this.selectedValue = this.selectedItems;
      this.displayValue = '';
      this.updateSelectionDerived();
      this.cdr.markForCheck();
      return;
    }
    this.selectedValue = value ?? null;
    if (!value) {
      this.displayValue = '';
      this.cdr.markForCheck();
      return;
    }
    this.applyDisplayValue();
    this.cdr.markForCheck();
  }

  private applyDisplayValue(): void {
    if (!this.selectedValue) return;
    if (this.principalColumn) {
      this.displayValue = this.getFieldValue(this.selectedValue, this.principalColumn.field);
    }
  }

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
    this.loadColumns();
    this.setupSearchPipeline();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.directSearchSub?.unsubscribe();
    this.loadMoreSub?.unsubscribe();
    this.closeModal();
  }

  private loadColumns(): void {
    if (!this.code || !this.endpoint) return;

    this.adapter.getColumns({ endpoint: this.endpoint, code: this.code }).subscribe({
      next: (response) => {
        this.columns = response.columns || [];
        this.buildFilterOptions();
        this.buildColumnSets();
        this.applyDisplayValue();
        this.updateSelectionDerived();
        if (this.searchResults.length > 0) {
          this.applyResults(this.searchResults, false);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.columns = [];
        this.cdr.markForCheck();
      },
    });
  }

  private buildFilterOptions(): void {
    const options: FilterOption[] = [{ label: 'Todos', field: 'any' }];
    for (const col of this.columns) {
      if (!col.hidden) {
        options.push({ label: col.label, field: col.field });
      }
    }
    this.filterOptions = options;
    this.activeFilter = options[0];
  }

  private buildColumnSets(): void {
    this.principalColumn = this.columns.find((c) => c.principal) || null;
    this.detailColumns = this.columns.filter((c) => !c.hidden && !c.principal && !c.key);
    const keyCol = this.columns.find((c) => c.key);
    this.keyFieldName = keyCol ? keyCol.field : 'id';
  }

  /* ══════════════════════════════════════════
     Search Pipeline
     ══════════════════════════════════════════ */

  private setupSearchPipeline(): void {
    this.searchSub = this.search$
      .pipe(
        debounceTime(this.debounce),
        distinctUntilChanged(),
        tap(() => {
          this.searching = true;
          this.resetPagination();
          this.cdr.markForCheck();
        }),
        switchMap((term) =>
          this.adapter
            .search({
              endpoint: this.endpoint,
              code: this.code,
              param: this.activeFilter.field,
              value: term,
              page: 0,
              extraParams: this.extraParams,
            })
            .pipe(
              catchError(() => {
                this.searching = false;
                return of({ data: null } as DetraSearchResponse);
              }),
            ),
        ),
      )
      .subscribe((response) => {
        if (response.columns && response.columns.length > 0 && this.columns.length === 0) {
          this.columns = response.columns;
          this.buildFilterOptions();
          this.buildColumnSets();
        }
        this.applyResults(response.data?.content || [], false);
        this.updatePaginationFromResponse(response);
        this.searching = false;
        this.hasSearched = true;
        this.activeIndex = -1;
        this.cdr.markForCheck();
      });
  }

  private resetPagination(): void {
    this.currentPage = 0;
    this.totalPages = 0;
    this.totalRecords = 0;
    this.isLastPage = true;
  }

  private updatePaginationFromResponse(response: DetraSearchResponse): void {
    if (response.data) {
      this.currentPage = response.data.number ?? 0;
      this.totalPages = response.data.totalPages ?? 1;
      this.isLastPage = response.data.last ?? true;
      this.totalRecords =
        response.data.totalElements ?? response.totalRecords ?? this.searchResults.length;
    }
  }

  /* ══════════════════════════════════════════
     Modal — Open / Close
     ══════════════════════════════════════════ */

  openModal(): void {
    if (this.isModalOpen || this.disabled) return;

    const positionStrategy = this.overlay
      .position()
      .global()
      .centerHorizontally()
      .centerVertically();

    this.modalOverlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.block(),
      hasBackdrop: false,
      disposeOnNavigation: true,
    });

    if (!this.modalTemplate) {
      setTimeout(() => this.openModal(), 0);
      return;
    }

    const portal = new TemplatePortal(this.modalTemplate, this.vcr);
    this.modalOverlayRef.attach(portal);
    this.isModalOpen = true;
    this.modalInputValue = '';
    this.cdr.markForCheck();

    setTimeout(() => {
      this.modalInputEl?.nativeElement?.focus();
    }, 50);

    this.triggerDirectSearch('');
  }

  closeModal(): void {
    if (this.modalOverlayRef) {
      this.modalOverlayRef.dispose();
      this.modalOverlayRef = null;
    }
    this.isModalOpen = false;
    this.modalInputValue = '';
    this.clearResults();
    this.hasSearched = false;
    this.searching = false;
    this.loadingMore = false;
    this.activeIndex = -1;
    this.resetPagination();
    this.onTouchedFn();
    this.cdr.markForCheck();
  }

  onBackdropClick(): void {
    this.closeModal();
  }

  /* ══════════════════════════════════════════
     Modal — Input Events
     ══════════════════════════════════════════ */

  onModalInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.modalInputValue = value;
    this.activeIndex = -1;

    this.searching = true;
    this.cdr.markForCheck();

    this.search$.next(value);
  }

  onModalKeydown(event: KeyboardEvent): void {
    if (this.searchResults.length === 0 && event.key !== 'Escape') return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (this.searchResults.length > 0) {
          this.activeIndex = (this.activeIndex + 1) % this.searchResults.length;
          this.scrollToActiveResult();
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (this.searchResults.length > 0) {
          this.activeIndex =
            this.activeIndex <= 0 ? this.searchResults.length - 1 : this.activeIndex - 1;
          this.scrollToActiveResult();
        }
        break;

      case 'Enter':
        event.preventDefault();
        if (this.activeIndex >= 0 && this.activeIndex < this.searchResults.length) {
          this.selectItem(this.searchResults[this.activeIndex]);
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.closeModal();
        break;
    }
  }

  clearModalSearch(): void {
    this.modalInputValue = '';
    this.activeIndex = -1;
    this.modalInputEl?.nativeElement?.focus();
    this.triggerDirectSearch('');
  }

  /* ══════════════════════════════════════════
     Filter Chips
     ══════════════════════════════════════════ */

  selectFilter(opt: FilterOption): void {
    this.activeFilter = opt;
    this.triggerDirectSearch(this.modalInputValue);
    this.modalInputEl?.nativeElement?.focus();
  }

  /* ══════════════════════════════════════════
     Selection
     ══════════════════════════════════════════ */

  selectItem(item: any): void {
    if (this.multiple) {
      this.selectItemMultiple(item);
      return;
    }

    this.selectedValue = item;
    this.displayValue = this.principalColumn
      ? this.getFieldValue(item, this.principalColumn.field)
      : JSON.stringify(item);

    this.onChangeFn(item);
    this.onSelect.emit(item);
    this.closeModal();
  }

  private selectItemMultiple(item: any): void {
    const keyField = this.keyFieldName;
    const itemKey = item[keyField];
    const existingIndex = this.selectedItems.findIndex((s) => s[keyField] === itemKey);

    if (existingIndex >= 0) {
      this.selectedItems = this.selectedItems.filter((_, i) => i !== existingIndex);
    } else {
      this.selectedItems = [...this.selectedItems, item];
    }

    this.selectedValue = this.selectedItems;
    this.updateSelectionDerived();
    this.onChangeFn([...this.selectedItems]);
    this.onSelect.emit([...this.selectedItems]);
    this.cdr.markForCheck();
  }

  removeChip(index: number, event: Event): void {
    event.stopPropagation();
    this.selectedItems = this.selectedItems.filter((_, i) => i !== index);
    this.selectedValue = this.selectedItems;
    this.updateSelectionDerived();
    this.onChangeFn([...this.selectedItems]);
    this.onSelect.emit([...this.selectedItems]);
  }

  hasTriggerValue(): boolean {
    if (this.multiple) {
      return this.selectedItems.length > 0;
    }
    return !!this.selectedValue;
  }

  clearTriggerValue(event: Event): void {
    event.stopPropagation();
    if (this.multiple) {
      this.selectedItems = [];
      this.selectedValue = this.selectedItems;
      this.updateSelectionDerived();
      this.onChangeFn([]);
      this.onSelect.emit([]);
    } else {
      this.selectedValue = null;
      this.displayValue = '';
      this.onChangeFn(null);
      this.onSelect.emit(null);
    }
    this.cdr.markForCheck();
  }

  /* ══════════════════════════════════════════
     Infinite Scroll
     ══════════════════════════════════════════ */

  onResultsScroll(event: Event): void {
    if (this.loadingMore || this.isLastPage || this.searching) return;

    const el = event.target as HTMLElement;
    const threshold = 40;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    if (distanceFromBottom <= threshold) {
      this.loadNextPage();
    }
  }

  private loadNextPage(): void {
    if (this.loadingMore || this.isLastPage) return;

    this.loadingMore = true;
    const nextPage = this.currentPage + 1;

    this.loadMoreSub?.unsubscribe();
    this.loadMoreSub = this.adapter
      .search({
        endpoint: this.endpoint,
        code: this.code,
        param: this.activeFilter.field,
        value: this.modalInputValue,
        page: nextPage,
        extraParams: this.extraParams,
      })
      .pipe(
        catchError(() => {
          this.loadingMore = false;
          this.cdr.markForCheck();
          return of({ data: null } as DetraSearchResponse);
        }),
      )
      .subscribe((response) => {
        this.applyResults(response.data?.content || [], true);
        this.updatePaginationFromResponse(response);
        this.loadingMore = false;
        this.cdr.markForCheck();
      });
  }

  /* ══════════════════════════════════════════
     Direct Search (bypasses debounce)
     ══════════════════════════════════════════ */

  private triggerDirectSearch(term: string): void {
    this.directSearchSub?.unsubscribe();

    this.searching = true;
    this.clearResults();
    this.resetPagination();
    this.cdr.markForCheck();

    this.directSearchSub = this.adapter
      .search({
        endpoint: this.endpoint,
        code: this.code,
        param: this.activeFilter.field,
        value: term,
        page: 0,
        extraParams: this.extraParams,
      })
      .pipe(
        catchError(() => {
          this.searching = false;
          this.cdr.markForCheck();
          return of({ data: null } as DetraSearchResponse);
        }),
      )
      .subscribe((response) => {
        if (response.columns && response.columns.length > 0 && this.columns.length === 0) {
          this.columns = response.columns;
          this.buildFilterOptions();
          this.buildColumnSets();
        }

        this.applyResults(response.data?.content || [], false);
        this.updatePaginationFromResponse(response);
        this.searching = false;
        this.hasSearched = true;
        this.activeIndex = -1;
        this.cdr.markForCheck();
      });
  }

  /* ══════════════════════════════════════════
     Template Helpers
     ══════════════════════════════════════════ */

  getFieldValue(item: any, field?: string): string {
    if (!item || !field) return '';
    const keys = field.split('.');
    let value = item;
    for (const key of keys) {
      if (value == null) return '';
      value = value[key];
    }
    return value != null ? String(value) : '';
  }

  getEffectivePlaceholder(): string {
    if (this.multiple && this.selectedItems.length > 0) {
      return 'Adicionar mais...';
    }
    return this.placeholder;
  }

  getChipLabel(item: any): string {
    if (this.principalColumn) {
      return this.getFieldValue(item, this.principalColumn.field);
    }
    return JSON.stringify(item);
  }

  trackByRow(index: number, row: SearchRow): unknown {
    return row.key ?? index;
  }

  trackByChip(index: number, chip: ChipRow): unknown {
    return chip.key ?? index;
  }

  trackByDetail(index: number, detail: { label: string }): string {
    return detail.label || String(index);
  }

  /* ══════════════════════════════════════════
     View-model precomputation (performance)
     ══════════════════════════════════════════ */

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
    return safe.replace(regex, '<span class="ds-search-modal__highlight">$1</span>');
  }

  private buildRow(item: any, regex: RegExp | null): SearchRow {
    const key = item?.[this.keyFieldName] ?? null;
    const principalRaw = this.getFieldValue(item, this.principalColumn?.field);
    return {
      raw: item,
      key,
      principalHtml: this.highlightWith(principalRaw, regex),
      details: this.detailColumns.map((col) => ({
        label: col.label,
        value: this.getFieldValue(item, col.field),
      })),
      selected: this.multiple ? this.selectedKeys.has(key) : false,
    };
  }

  private applyResults(items: any[], append: boolean): void {
    const regex = this.getHighlightRegex(this.modalInputValue);
    if (append) {
      this.searchResults = this.searchResults.concat(items);
      this.viewRows = this.viewRows.concat(items.map((it) => this.buildRow(it, regex)));
    } else {
      this.searchResults = items;
      this.viewRows = items.map((it) => this.buildRow(it, regex));
    }
  }

  private clearResults(): void {
    this.searchResults = [];
    this.viewRows = [];
  }

  private updateSelectionDerived(): void {
    const keyField = this.keyFieldName;
    this.selectedKeys = new Set(this.selectedItems.map((s) => s?.[keyField]));
    this.chipRows = this.selectedItems.map((s) => ({
      key: s?.[keyField],
      label: this.getChipLabel(s),
    }));
    if (this.multiple) {
      for (const row of this.viewRows) {
        row.selected = this.selectedKeys.has(row.key);
      }
    }
  }

  private scrollToActiveResult(): void {
    const body = this.modalOverlayRef?.overlayElement?.querySelector(
      '.ds-search-modal__body',
    );
    const items = body?.querySelectorAll('.ds-search-modal__result-item');
    const active = items?.[this.activeIndex] as HTMLElement;
    if (active && body) {
      const bodyRect = body.getBoundingClientRect();
      const itemRect = active.getBoundingClientRect();
      if (itemRect.bottom > bodyRect.bottom || itemRect.top < bodyRect.top) {
        active.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}