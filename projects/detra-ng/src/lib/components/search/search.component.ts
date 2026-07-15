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
import {
  Overlay,
  OverlayModule,
  OverlayRef,
  FlexibleConnectedPositionStrategy,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { Subject, Subscription } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
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
   Built ONCE whenever the result set / selection
   changes — never re-evaluated per change-detection.
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
   Search Component
   ═══════════════════════════════════════════ */

@Component({
  selector: 'ds-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, OverlayModule],
  styleUrl: './search.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchComponent),
      multi: true,
    },
  ],
  template: `
    <div
      class="ds-search-wrapper"
      [class.ds-search--error]="error"
      [class.ds-search--disabled]="disabled"
      [class.ds-search--multiple]="multiple"
    >
      <!-- Label -->
      <label *ngIf="label" class="ds-search__label">
        {{ label }}
        <span *ngIf="required" class="ds-search__required">*</span>
      </label>

      <!-- Field Container -->
      <div class="ds-search__container" #origin>
        <div
          class="ds-search__field-row"
          [class.ds-search__field-row--focused]="isFocused"
          [class.ds-search__field-row--disabled]="disabled"
          [class.ds-search__field-row--has-results]="isResultsPanelOpen"
          [class.ds-search__field-row--has-chips]="multiple && selectedItems.length > 0"
        >
          <!-- Filter Button (left) -->
          <button
            *ngIf="filterByColumn"
            type="button"
            class="ds-search__filter-btn"
            [class.ds-search__filter-btn--open]="isFilterPanelOpen"
            [disabled]="disabled"
            (click)="onFilterClick($event)"
            #filterBtnRef
          >
            {{ activeFilter.label }}
            <svg
              width="14"
              height="14"
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

          <!-- Chips + Input wrapper (multiple mode) -->
          <div class="ds-search__input-area">
            <span class="ds-search__chip" *ngFor="let chip of chipRows; let ci = index; trackBy: trackByChip">
              <span class="ds-search__chip-text">{{ chip.label }}</span>
              <button
                type="button"
                class="ds-search__chip-remove"
                [disabled]="disabled"
                (mousedown)="removeChip(ci, $event)"
                aria-label="Remover"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </span>

            <input
              #inputEl
              type="text"
              class="ds-search__input"
              [placeholder]="getEffectivePlaceholder()"
              [disabled]="disabled"
              [value]="inputValue"
              autocomplete="off"
              role="combobox"
              [attr.aria-expanded]="isResultsPanelOpen"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              (input)="onInput($event)"
              (focus)="onFocus()"
              (blur)="onBlur()"
              (keydown)="onKeydown($event)"
            />
          </div>

          <div class="ds-search__actions">
            <div *ngIf="searching && !loadingMore" class="ds-search__spinner"></div>

            <button
              *ngIf="inputValue && !searching"
              type="button"
              class="ds-search__clear-btn"
              (mousedown)="onInternalMousedown($event)"
              (click)="clearSearch($event)"
              aria-label="Limpar busca"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>

            <button
              *ngIf="!searching"
              type="button"
              class="ds-search__dropdown-toggle"
              [class.ds-search__dropdown-toggle--open]="isResultsPanelOpen"
              [disabled]="disabled"
              tabindex="-1"
              aria-label="Mostrar opções"
              (mousedown)="onInternalMousedown($event)"
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
        </div>
      </div>

      <span *ngIf="error" class="ds-search__error-msg">{{ error }}</span>
      <span *ngIf="hint && !error" class="ds-search__hint-msg">{{ hint }}</span>
    </div>

    <ng-template #filterPanelTemplate>
      <div class="ds-search__filter-panel" role="listbox">
        <button
          *ngFor="let opt of filterOptions; let i = index"
          type="button"
          class="ds-search__filter-item"
          [class.ds-search__filter-item--active]="opt.field === activeFilter.field"
          role="option"
          [attr.aria-selected]="opt.field === activeFilter.field"
          (click)="selectFilter(opt, $event)"
        >
          {{ opt.label }}
        </button>
      </div>
    </ng-template>

    <ng-template #resultsPanelTemplate>
      <div class="ds-search__results-panel" role="listbox" (scroll)="onResultsScroll($event)">
        <div *ngIf="searching && !loadingMore" class="ds-search__loading">
          <span class="ds-search__loading-spinner"></span>
          <span>Buscando…</span>
        </div>

        <ng-container *ngIf="!searching || loadingMore">
          <div *ngIf="viewRows.length > 0" class="ds-search__results-header">
            <i class="fa-solid fa-list"></i>
            {{ totalRecords }} resultado{{ totalRecords !== 1 ? 's' : '' }} encontrado{{
              totalRecords !== 1 ? 's' : ''
            }}
          </div>

          <div
            *ngFor="let row of viewRows; let i = index; trackBy: trackByRow"
            class="ds-search__result-item"
            [class.ds-search__result-item--active]="i === activeIndex"
            [class.ds-search__result-item--selected]="multiple && row.selected"
            (click)="selectItem(row.raw, $event)"
          >
            <i *ngIf="multiple && row.selected" class="fa-solid fa-circle-check ds-search__result-check"></i>

            <div class="ds-search__result-name" [innerHTML]="row.principalHtml"></div>

            <div class="ds-search__result-details" *ngIf="row.details.length > 0">
              <span class="ds-search__result-tag" *ngFor="let d of row.details; trackBy: trackByDetail">
                <span class="ds-search__result-tag__label">{{ d.label }}:</span>
                {{ d.value }}
              </span>
            </div>
          </div>

          <div *ngIf="loadingMore" class="ds-search__loading-more">
            <span class="ds-search__loading-spinner"></span>
            <span>Carregando mais…</span>
          </div>

          <div
            *ngIf="viewRows.length === 0 && inputValue.length >= minLength && hasSearched"
            class="ds-search__empty"
          >
            <i class="fa-solid fa-search"></i>
            Nenhum resultado encontrado para "<strong>{{ inputValue }}</strong
            >"
          </div>
        </ng-container>
      </div>
    </ng-template>
  `,
})
export class SearchComponent implements ControlValueAccessor, OnInit, OnDestroy {
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
  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;
  @ViewChild('filterPanelTemplate') filterPanelTemplate!: TemplateRef<unknown>;
  @ViewChild('resultsPanelTemplate') resultsPanelTemplate!: TemplateRef<unknown>;
  @ViewChild('origin') originRef!: ElementRef<HTMLElement>;
  @ViewChild('filterBtnRef') filterBtnRef!: ElementRef<HTMLElement>;

  /* ── State ── */
  inputValue = '';
  isFocused = false;
  searching = false;
  loadingMore = false;
  hasSearched = false;
  activeIndex = -1;
  private _internalAction = false;

  // Columns & filters
  columns: DetraSearchColumn[] = [];
  filterOptions: FilterOption[] = [{ label: 'Todos', field: 'any' }];
  activeFilter: FilterOption = this.filterOptions[0];

  // Results
  searchResults: any[] = [];

  // ── Precomputed view-model (the perf fix) ──
  viewRows: SearchRow[] = [];
  chipRows: ChipRow[] = [];
  private selectedKeys = new Set<unknown>();
  private keyFieldName = 'id';
  private highlightRegex: RegExp | null = null;
  private highlightTermCache = ' '; // sentinel: never equals a real term

  // Pagination
  currentPage = 0;
  totalPages = 0;
  totalRecords = 0;
  isLastPage = true;

  // Derived column sets
  principalColumn: DetraSearchColumn | null = null;
  detailColumns: DetraSearchColumn[] = [];

  // Overlay states
  isFilterPanelOpen = false;
  isResultsPanelOpen = false;

  /* ── Internals ── */
  private filterOverlayRef: OverlayRef | null = null;
  private resultsOverlayRef: OverlayRef | null = null;
  private readonly search$ = new Subject<string>();
  private searchSub?: Subscription;
  private backdropSub?: Subscription;
  private filterBackdropSub?: Subscription;
  private directSearchSub?: Subscription;
  private loadMoreSub?: Subscription;
  private selectedValue: any = null;

  /* ── Multiple-mode state ── */
  selectedItems: any[] = [];

  /* ── CVA ── */
  private onChangeFn: (v: any) => void = () => {};
  private onTouchedFn: () => void = () => {};

  writeValue(value: any): void {
    if (this.multiple) {
      this.selectedItems = Array.isArray(value) ? [...value] : [];
      this.selectedValue = this.selectedItems;
      this.inputValue = '';
      this.updateSelectionDerived();
      this.cdr.markForCheck();
      return;
    }
    this.selectedValue = value ?? null;
    if (!value) {
      this.inputValue = '';
      this.cdr.markForCheck();
      return;
    }
    this.applyDisplayValue();
    this.cdr.markForCheck();
  }

  private applyDisplayValue(): void {
    if (!this.selectedValue) return;
    if (this.principalColumn) {
      this.inputValue = this.getFieldValue(this.selectedValue, this.principalColumn.field);
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
    this.backdropSub?.unsubscribe();
    this.filterBackdropSub?.unsubscribe();
    this.directSearchSub?.unsubscribe();
    this.loadMoreSub?.unsubscribe();
    this.closeFilterPanel();
    this.closeResultsPanel();
  }

  /* ══════════════════════════════════════════
     Initialization
     ══════════════════════════════════════════ */

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
        tap((term) => {
          if (term.length < this.minLength) {
            this.clearResults();
            this.resetPagination();
            this.closeResultsPanel();
            this.searching = false;
            this.cdr.markForCheck();
            return;
          }
          this.searching = true;
          this.resetPagination();
          this.openResultsPanel();
          this.cdr.markForCheck();
        }),
        filter((term) => term.length >= this.minLength),
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

        if (this.viewRows.length > 0 || this.inputValue.length >= this.minLength) {
          this.openResultsPanel();
        } else {
          this.closeResultsPanel();
        }
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
        value: this.inputValue,
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
     Template Methods
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

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.inputValue = value;
    this.activeIndex = -1;

    if (!this.multiple && this.selectedValue) {
      this.selectedValue = null;
      this.onChangeFn(null);
    }

    if (value.length >= this.minLength) {
      this.searching = true;
      this.openResultsPanel();
    }

    this.search$.next(value);
  }

  onFocus(): void {
    this.isFocused = true;
    if (this.searchResults.length > 0 && this.inputValue.length >= this.minLength) {
      this.openResultsPanel();
    }
  }

  onBlur(): void {
    this.isFocused = false;
    this.onTouchedFn();

    if (this._internalAction) {
      this._internalAction = false;
      return;
    }

    setTimeout(() => {
      this.closeResultsPanel();

      if (this.multiple) {
        this.inputValue = '';
        this.clearResults();
        this.hasSearched = false;
        this.resetPagination();
        this.cdr.markForCheck();
        return;
      }

      if (this.forceSelection && this.inputValue && !this.selectedValue) {
        this.inputValue = '';
        this.clearResults();
        this.hasSearched = false;
        this.resetPagination();
        this.onChangeFn(null);
      }
      this.cdr.markForCheck();
    }, 200);
  }

  onKeydown(event: KeyboardEvent): void {
    if (
      this.multiple &&
      event.key === 'Backspace' &&
      !this.inputValue &&
      this.selectedItems.length > 0
    ) {
      event.preventDefault();
      this.removeChip(this.selectedItems.length - 1, event);
      return;
    }

    if (!this.isResultsPanelOpen || this.searchResults.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex = (this.activeIndex + 1) % this.searchResults.length;
        this.scrollToActiveResult();
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex =
          this.activeIndex <= 0 ? this.searchResults.length - 1 : this.activeIndex - 1;
        this.scrollToActiveResult();
        break;

      case 'Enter':
        event.preventDefault();
        if (this.activeIndex >= 0 && this.activeIndex < this.searchResults.length) {
          this.selectItem(this.searchResults[this.activeIndex]);
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.closeResultsPanel();
        break;
    }
  }

  selectItem(item: any, event?: Event): void {
    event?.stopPropagation();

    if (this.multiple) {
      this.selectItemMultiple(item);
      return;
    }

    this.selectedValue = item;
    this.inputValue = this.principalColumn
      ? this.getFieldValue(item, this.principalColumn.field)
      : JSON.stringify(item);

    this.onChangeFn(item);
    this.onSelect.emit(item);
    this.closeResultsPanel();
    this.clearResults();
  }

  private selectItemMultiple(item: any): void {
    const keyField = this.getKeyField();
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

    this.inputValue = '';
    if (this.inputEl) {
      this.inputEl.nativeElement.value = '';
    }
  }

  removeChip(index: number, event: Event): void {
    event.stopPropagation();
    this.selectedItems = this.selectedItems.filter((_, i) => i !== index);
    this.selectedValue = this.selectedItems;
    this.updateSelectionDerived();
    this.onChangeFn([...this.selectedItems]);
    this.onSelect.emit([...this.selectedItems]);
  }

  getEffectivePlaceholder(): string {
    if (this.multiple && this.selectedItems.length > 0) {
      return 'Adicionar mais...';
    }
    return this.placeholder;
  }

  private getKeyField(): string {
    return this.keyFieldName;
  }

  onInternalMousedown(event: Event): void {
    event.preventDefault();
    this._internalAction = true;
  }

  clearSearch(event: Event): void {
    event.stopPropagation();
    this.inputValue = '';
    this.clearResults();
    this.hasSearched = false;
    this.searching = false;
    this.loadingMore = false;
    this.activeIndex = -1;
    this.resetPagination();

    if (this.multiple) {
      // Clear button only clears the search text, not the selected items
    } else {
      this.selectedValue = null;
      this.onChangeFn(null);
    }

    this.closeResultsPanel();
    this.inputEl?.nativeElement?.focus();
  }

  onDropdownClick(event: Event): void {
    event.stopPropagation();
    if (this.disabled) return;

    if (this.isResultsPanelOpen) {
      this.closeResultsPanel();
      return;
    }

    this.triggerDirectSearch(this.inputValue);
  }

  private triggerDirectSearch(term: string): void {
    this.directSearchSub?.unsubscribe();

    this.searching = true;
    this.clearResults();
    this.resetPagination();

    this.closeResultsPanel();
    this.openResultsPanel();

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

        if (this.viewRows.length === 0 && !this.hasSearched) {
          this.closeResultsPanel();
        }
        this.cdr.markForCheck();
      });
  }

  onFilterClick(event: Event): void {
    event.stopPropagation();
    if (this.disabled) return;

    if (this.isFilterPanelOpen) {
      this.closeFilterPanel();
    } else {
      this.openFilterPanel();
    }
  }

  selectFilter(opt: FilterOption, event: Event): void {
    event.stopPropagation();
    this.activeFilter = opt;
    this.closeFilterPanel();

    if (this.inputValue.length >= this.minLength) {
      this.searching = true;
      this.search$.next(this.inputValue);
    }

    this.inputEl?.nativeElement?.focus();
  }

  /* ══════════════════════════════════════════
     CDK Overlay — Filter Panel
     ══════════════════════════════════════════ */

  private openFilterPanel(): void {
    if (this.isFilterPanelOpen || this.disabled) return;

    const positionStrategy: FlexibleConnectedPositionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.filterBtnRef)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
      ])
      .withPush(false);

    this.filterOverlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
    });

    const portal = new TemplatePortal(this.filterPanelTemplate, this.vcr);
    this.filterOverlayRef.attach(portal);
    this.isFilterPanelOpen = true;

    this.filterBackdropSub?.unsubscribe();
    this.filterBackdropSub = this.filterOverlayRef.backdropClick().subscribe(() => {
      this.closeFilterPanel();
    });
  }

  private closeFilterPanel(): void {
    this.filterBackdropSub?.unsubscribe();
    this.filterBackdropSub = undefined;
    if (this.filterOverlayRef) {
      this.filterOverlayRef.dispose();
      this.filterOverlayRef = null;
    }
    this.isFilterPanelOpen = false;
  }

  /* ══════════════════════════════════════════
     CDK Overlay — Results Panel
     ══════════════════════════════════════════ */

  private openResultsPanel(): void {
    if (this.isResultsPanelOpen || this.disabled) return;

    const originWidth = this.originRef.nativeElement.getBoundingClientRect().width;

    const positionStrategy: FlexibleConnectedPositionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.originRef)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 0 },
      ])
      .withPush(false);

    this.resultsOverlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      width: originWidth,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
    });

    const portal = new TemplatePortal(this.resultsPanelTemplate, this.vcr);
    this.resultsOverlayRef.attach(portal);
    this.isResultsPanelOpen = true;

    this.backdropSub?.unsubscribe();
    this.backdropSub = this.resultsOverlayRef.backdropClick().subscribe(() => {
      this.closeResultsPanel();
    });
  }

  private closeResultsPanel(): void {
    this.backdropSub?.unsubscribe();
    this.backdropSub = undefined;
    if (this.resultsOverlayRef) {
      this.resultsOverlayRef.dispose();
      this.resultsOverlayRef = null;
    }
    this.isResultsPanelOpen = false;
    this.activeIndex = -1;
  }

  /* ── Helpers ── */

  private scrollToActiveResult(): void {
    const panel = this.resultsOverlayRef?.overlayElement?.querySelector(
      '.ds-search__results-panel',
    );
    const items = panel?.querySelectorAll('.ds-search__result-item');
    const active = items?.[this.activeIndex] as HTMLElement;
    if (active && panel) {
      const panelRect = panel.getBoundingClientRect();
      const itemRect = active.getBoundingClientRect();
      if (itemRect.bottom > panelRect.bottom || itemRect.top < panelRect.top) {
        active.scrollIntoView({ block: 'nearest' });
      }
    }
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
     View-model precomputation (performance core)
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
    return safe.replace(regex, '<span class="ds-search__highlight">$1</span>');
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
    const regex = this.getHighlightRegex(this.inputValue);
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

  private getChipLabel(item: any): string {
    if (this.principalColumn) {
      return this.getFieldValue(item, this.principalColumn.field);
    }
    return JSON.stringify(item);
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