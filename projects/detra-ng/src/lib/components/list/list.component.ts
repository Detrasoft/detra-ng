import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ContentChildren,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  QueryList,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListColumnDirective } from './list-column.directive';

/**
 * Generic list component that renders data as a table (desktop)
 * or as cards (mobile), with built-in pagination and infinite scroll.
 *
 * Usage:
 * ```html
 * <ds-list [data]="items" [pageSize]="10" trackByKey="id">
 *   <ds-list-column key="nome" label="Nome">
 *     <ng-template let-value>
 *       <strong>{{ value }}</strong>
 *     </ng-template>
 *   </ds-list-column>
 *   <ds-list-column key="email" label="Email" />
 *
 *   <ng-template #actionsTemplate let-row>
 *     <a [routerLink]="[row.id]">Editar</a>
 *   </ng-template>
 *
 *   <!-- Optional: fully custom card template -->
 *   <ng-template #cardTemplate let-row>
 *     <div>{{ row.nome }}</div>
 *   </ng-template>
 * </ds-list>
 * ```
 */
@Component({
  selector: 'ds-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styleUrl: './list.component.css',
  template: `
    <!-- ═══════════════════════════════════════════
         DESKTOP TABLE VIEW + PAGINATION
         ═══════════════════════════════════════════ -->
    <div class="ds-list__table-container" data-testid="ds-list-table">
      <table class="ds-list__table">
        <thead>
          <tr>
            <th
              *ngFor="let col of columns"
              [style.width]="col.width || null"
              [style.text-align]="col.align"
              [class.ds-list__th--sortable]="col.sortable"
              [class]="col.headerClass"
              (click)="col.sortable && toggleSort(col)"
            >
              <div class="ds-list__th-content">
                <span>{{ col.label }}</span>
                <span *ngIf="col.sortable" class="ds-list__sort-icon">
                  <ng-container *ngIf="sortKey === col.key; else unsorted">
                    <span *ngIf="sortOrder === 'asc'">▲</span>
                    <span *ngIf="sortOrder === 'desc'">▼</span>
                  </ng-container>
                  <ng-template #unsorted>
                    <span class="ds-list__sort-idle">⇅</span>
                  </ng-template>
                </span>
              </div>
            </th>
            <th *ngIf="actionsTemplate" class="ds-list__actions-th">
              {{ actionsLabel }}
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- ── Grouped Rows ── -->
          <ng-container *ngIf="groupBy; else flatRows">
            <ng-container *ngFor="let group of groupedData">
              <tr class="ds-list__group-row">
                <td [attr.colspan]="columnCount" class="ds-list__group-cell">
                  <ng-container *ngIf="groupHeaderTemplate; else defaultGroupHeader">
                    <ng-container
                      *ngTemplateOutlet="
                        groupHeaderTemplate;
                        context: { $implicit: group.key, groupKey: group.key, items: group.items }
                      "
                    ></ng-container>
                  </ng-container>
                  <ng-template #defaultGroupHeader>
                    <div class="ds-list__group-header">
                      <strong>{{ group.key }}</strong>
                      <span class="ds-list__group-count">({{ group.items.length }})</span>
                    </div>
                  </ng-template>
                </td>
              </tr>
              <tr
                *ngFor="let row of group.items; trackBy: _trackByFn"
                (click)="onRowClick($event, row)"
                [class.ds-list__row--clickable]="hasRowClick"
              >
                <td *ngFor="let col of columns" [style.text-align]="col.align">
                  <ng-container *ngIf="col.cellTemplate; else defaultGroupCell">
                    <ng-container
                      *ngTemplateOutlet="
                        col.cellTemplate;
                        context: { $implicit: resolveValue(row, col.key), row: row }
                      "
                    ></ng-container>
                  </ng-container>
                  <ng-template #defaultGroupCell>{{ resolveValue(row, col.key) }}</ng-template>
                </td>
                <td *ngIf="actionsTemplate" class="ds-list__actions-td">
                  <div class="ds-list__actions-wrapper">
                    <ng-container
                      *ngTemplateOutlet="actionsTemplate; context: { $implicit: row }"
                    ></ng-container>
                  </div>
                </td>
              </tr>
            </ng-container>
          </ng-container>

          <!-- ── Flat Rows (default) ── -->
          <ng-template #flatRows>
            <tr
              *ngFor="let row of sortedPaginatedData; trackBy: _trackByFn"
              (click)="onRowClick($event, row)"
              [class.ds-list__row--clickable]="hasRowClick"
            >
              <td *ngFor="let col of columns" [style.text-align]="col.align">
                <ng-container *ngIf="col.cellTemplate; else defaultCell">
                  <ng-container
                    *ngTemplateOutlet="
                      col.cellTemplate;
                      context: { $implicit: resolveValue(row, col.key), row: row }
                    "
                  ></ng-container>
                </ng-container>
                <ng-template #defaultCell>{{ resolveValue(row, col.key) }}</ng-template>
              </td>
              <td *ngIf="actionsTemplate" class="ds-list__actions-td">
                <div class="ds-list__actions-wrapper">
                  <ng-container
                    *ngTemplateOutlet="actionsTemplate; context: { $implicit: row }"
                  ></ng-container>
                </div>
              </td>
            </tr>
          </ng-template>

          <!-- Empty state -->
          <tr *ngIf="paginatedData.length === 0">
            <td [attr.colspan]="columnCount" class="ds-list__empty">
              {{ emptyMessage }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination controls -->
      <div class="ds-list__pagination" *ngIf="totalPages > 1">
        <span class="ds-list__pagination-info">
          {{ paginationStart }}–{{ paginationEnd }} de
          {{ serverPagination ? totalRecords : data.length }}
        </span>

        <div class="ds-list__pagination-controls">
          <button
            class="ds-list__page-btn"
            [disabled]="currentPage === 1"
            (click)="goToPage(1)"
            aria-label="Primeira página"
          >
            «
          </button>
          <button
            class="ds-list__page-btn"
            [disabled]="currentPage === 1"
            (click)="goToPage(currentPage - 1)"
            aria-label="Página anterior"
          >
            ‹
          </button>

          <ng-container *ngFor="let page of visiblePages">
            <span *ngIf="page === -1" class="ds-list__ellipsis">…</span>
            <button
              *ngIf="page !== -1"
              class="ds-list__page-btn"
              [class.ds-list__page-btn--active]="page === currentPage"
              (click)="goToPage(page)"
              [attr.aria-label]="'Página ' + page"
              [attr.aria-current]="page === currentPage ? 'page' : null"
            >
              {{ page }}
            </button>
          </ng-container>

          <button
            class="ds-list__page-btn"
            [disabled]="currentPage === totalPages"
            (click)="goToPage(currentPage + 1)"
            aria-label="Próxima página"
          >
            ›
          </button>
          <button
            class="ds-list__page-btn"
            [disabled]="currentPage === totalPages"
            (click)="goToPage(totalPages)"
            aria-label="Última página"
          >
            »
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════
         MOBILE CARD VIEW + INFINITE SCROLL
         ═══════════════════════════════════════════ -->
    <div class="ds-list__card-container" data-testid="ds-list-cards">
      <div
        *ngFor="let row of mobileData; trackBy: _trackByFn"
        class="ds-list__card"
        (click)="onRowClick($event, row)"
        [class.ds-list__row--clickable]="hasRowClick"
      >
        <!-- Custom card template -->
        <ng-container *ngIf="cardTemplate; else defaultCardTpl">
          <ng-container
            *ngTemplateOutlet="cardTemplate; context: { $implicit: row }"
          ></ng-container>
        </ng-container>

        <!-- Default card layout (auto-generated from columns) -->
        <ng-template #defaultCardTpl>
          <div class="ds-list__card-header" *ngIf="firstColumn">
            <span class="ds-list__card-title">
              <ng-container *ngIf="firstColumn.cellTemplate; else defaultTitleCell">
                <ng-container
                  *ngTemplateOutlet="
                    firstColumn.cellTemplate;
                    context: { $implicit: resolveValue(row, firstColumn.key), row: row }
                  "
                ></ng-container>
              </ng-container>
              <ng-template #defaultTitleCell>{{ resolveValue(row, firstColumn.key) }}</ng-template>
            </span>
          </div>

          <div class="ds-list__card-body" *ngIf="restColumns.length > 0">
            <div *ngFor="let col of restColumns" class="ds-list__card-field">
              <span class="ds-list__card-label">{{ col.label }}</span>
              <span class="ds-list__card-value">
                <ng-container *ngIf="col.cellTemplate; else defaultFieldCell">
                  <ng-container
                    *ngTemplateOutlet="
                      col.cellTemplate;
                      context: { $implicit: resolveValue(row, col.key), row: row }
                    "
                  ></ng-container>
                </ng-container>
                <ng-template #defaultFieldCell>{{ resolveValue(row, col.key) }}</ng-template>
              </span>
            </div>
          </div>

          <div *ngIf="actionsTemplate" class="ds-list__card-actions">
            <ng-container
              *ngTemplateOutlet="actionsTemplate; context: { $implicit: row }"
            ></ng-container>
          </div>
        </ng-template>
      </div>

      <!-- Infinite scroll sentinel -->
      <div #scrollSentinel class="ds-list__sentinel" *ngIf="hasMoreMobileData">
        <div class="ds-list__spinner"></div>
        <span>Carregando mais…</span>
      </div>

      <!-- All loaded message -->
      <div
        *ngIf="
          !hasMoreMobileData &&
          mobileData.length > 0 &&
          mobileData.length < data.length === false &&
          data.length > pageSize
        "
        class="ds-list__all-loaded"
      >
        Todos os {{ data.length }} itens carregados
      </div>

      <!-- Empty state -->
      <div *ngIf="data.length === 0" class="ds-list__empty-card">
        {{ emptyMessage }}
      </div>
    </div>
  `,
})
export class ListComponent implements OnChanges, AfterViewInit, OnDestroy {
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  // ── Inputs ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() data: any[] = [];
  @Input() pageSize = 10;
  @Input() trackByKey = 'id';
  @Input() emptyMessage = 'Nenhum registro encontrado.';
  @Input() actionsLabel = 'Ações';

  // Server-side pagination inputs
  @Input() serverPagination = false;
  @Input() totalRecords?: number;

  // Grouping & Sorting Inputs
  @Input() groupBy?: string;
  @Input() sortKey?: string;
  @Input() sortOrder: 'asc' | 'desc' = 'asc';

  // ── Outputs ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() rowClick = new EventEmitter<any>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() sortChange = new EventEmitter<{ key: string; order: 'asc' | 'desc' }>();

  // ── Content projection ──
  @ContentChildren(ListColumnDirective) columns!: QueryList<ListColumnDirective>;
  @ContentChild('cardTemplate') cardTemplate?: TemplateRef<{ $implicit: unknown }>;
  @ContentChild('actionsTemplate') actionsTemplate?: TemplateRef<{ $implicit: unknown }>;
  @ContentChild('groupHeaderTemplate') groupHeaderTemplate?: TemplateRef<{
    $implicit: string;
    groupKey: string;
    items: any[];
  }>;


  // ── Pagination state ──
  currentPage = 1;

  // ── Infinite scroll state ──
  mobileLoadedCount = 10;
  private isLoadingMore = false;
  private observer?: IntersectionObserver;

  // ── Sentinel ViewChild with setter (handles *ngIf lifecycle) ──
  @ViewChild('scrollSentinel') set scrollSentinelRef(ref: ElementRef | undefined) {
    if (ref) {
      this.setupObserver(ref.nativeElement);
    } else {
      this.disconnectObserver();
    }
  }

  // ── Lifecycle ──

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      // If we are using client-side pagination, reset to page 1.
      // For server-side pagination, do not reset currentPage because the new data
      // is usually the result of a page change.
      if (!this.serverPagination) {
        this.currentPage = 1;
      }
      this.mobileLoadedCount = this.pageSize;
    }
  }

  ngAfterViewInit(): void {
    // Observer setup is handled by the ViewChild setter
  }

  ngOnDestroy(): void {
    this.disconnectObserver();
  }

  // ── Computed getters ──

  get totalPages(): number {
    const total = this.serverPagination ? this.totalRecords || 0 : this.data.length;
    return Math.ceil(total / this.pageSize);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get paginatedData(): any[] {
    if (this.serverPagination) {
      return this.data; // Server has already sliced the data
    }
    const start = (this.currentPage - 1) * this.pageSize;
    return this.data.slice(start, start + this.pageSize);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get sortedPaginatedData(): any[] {
    const list = [...this.paginatedData];
    if (!this.sortKey || this.serverPagination) return list;
    const key = this.sortKey;
    const order = this.sortOrder === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      const valA = this.resolveValue(a, key);
      const valB = this.resolveValue(b, key);
      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB) * order;
      }
      return (valA > valB ? 1 : valA < valB ? -1 : 0) * order;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get groupedData(): { key: string; items: any[] }[] {
    if (!this.groupBy) return [];
    const groupsMap = new Map<string, any[]>();
    const rows = this.sortedPaginatedData;
    for (const row of rows) {
      const resolved = this.resolveValue(row, this.groupBy);
      const groupVal = resolved != null && resolved !== '' ? String(resolved) : 'Sem grupo';
      if (!groupsMap.has(groupVal)) {
        groupsMap.set(groupVal, []);
      }
      groupsMap.get(groupVal)!.push(row);
    }
    return Array.from(groupsMap.entries()).map(([key, items]) => ({ key, items }));
  }


  get paginationStart(): number {
    const total = this.serverPagination ? this.totalRecords || 0 : this.data.length;
    if (total === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEnd(): number {
    const total = this.serverPagination ? this.totalRecords || 0 : this.data.length;
    return Math.min(this.currentPage * this.pageSize, total);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get mobileData(): any[] {
    if (this.serverPagination) {
      // For infinite scroll with server pagination, mobile loaded count should track
      // items across multiple requests, but for now we just show what we have
      return this.data;
    }
    return this.data.slice(0, this.mobileLoadedCount);
  }

  get hasMoreMobileData(): boolean {
    if (this.serverPagination) {
      return this.data.length < (this.totalRecords || 0);
    }
    return this.mobileLoadedCount < this.data.length;
  }

  get columnCount(): number {
    const cols = this.columns ? this.columns.length : 0;
    return cols + (this.actionsTemplate ? 1 : 0);
  }

  get firstColumn(): ListColumnDirective | undefined {
    return this.columns?.first;
  }

  get restColumns(): ListColumnDirective[] {
    return this.columns ? this.columns.toArray().slice(1) : [];
  }

  get visiblePages(): number[] {
    const total = this.totalPages;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: number[] = [1];

    if (this.currentPage > 3) {
      pages.push(-1); // ellipsis marker
    }

    const start = Math.max(2, this.currentPage - 1);
    const end = Math.min(total - 1, this.currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (this.currentPage < total - 2) {
      pages.push(-1); // ellipsis marker
    }

    pages.push(total);
    return pages;
  }

  // ── Methods ──

  get hasRowClick(): boolean {
    return (
      this.rowClick.observed ||
      (this.rowClick.observers && this.rowClick.observers.length > 0) ||
      false
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRowClick(event: Event, row: any): void {
    const target = event.target as HTMLElement;

    // Prevent triggering if clicked inside an action column, a button, or an anchor/interactive element
    if (
      target.closest('.ds-list__actions-td') ||
      target.closest('.ds-list__actions-wrapper') ||
      target.closest('.ds-list__card-actions') ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('ds-button') ||
      target.closest('ds-search-modal') ||
      target.closest('app-task-timesheet-control')
    ) {
      return;
    }

    if (this.hasRowClick) {
      this.rowClick.emit(row);
    }
  }

  toggleSort(col: ListColumnDirective): void {
    if (!col || !col.sortable) return;
    if (this.sortKey === col.key) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = col.key;
      this.sortOrder = 'asc';
    }
    this.sortChange.emit({ key: this.sortKey, order: this.sortOrder });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolveValue(row: any, key: string): any {
    if (!row || !key) return '';
    if (key.includes('.')) {
      return key.split('.').reduce((acc, part) => (acc != null ? acc[part] : undefined), row);
    }
    return row[key];
  }


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _trackByFn = (_index: number, item: any): any => {
    return this.trackByKey ? item[this.trackByKey] : _index;
  };

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    if (this.serverPagination) {
      this.pageChange.emit(this.currentPage);
    }
  }

  // ── Infinite Scroll (IntersectionObserver) ──

  private setupObserver(element: HTMLElement): void {
    this.disconnectObserver();
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !this.isLoadingMore) {
          this.ngZone.run(() => this.loadMore());
        }
      },
      { threshold: 0.1, rootMargin: '200px' },
    );
    this.observer.observe(element);
  }

  private disconnectObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
    }
  }

  private loadMore(): void {
    this.isLoadingMore = true;
    this.mobileLoadedCount = Math.min(this.mobileLoadedCount + this.pageSize, this.data.length);
    // The IntersectionObserver callback runs outside the template event flow,
    // so under OnPush we must explicitly mark the view to render the new rows.
    this.cdr.markForCheck();
    // Prevent rapid re-triggering while DOM updates
    setTimeout(() => {
      this.isLoadingMore = false;
    }, 300);
  }
}
