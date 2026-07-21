import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  ContentChildren,
  ContentChild,
  QueryList,
  TemplateRef,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  NgZone,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ListColumnDirective } from './list-column.directive';

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
              <div
                *ngIf="resizableColumns"
                class="ds-list__col-resizer"
                (mousedown)="onColumnResizeStart($event, col)"
                (touchstart)="onColumnResizeStart($event, col)"
                (click)="$event.stopPropagation()"
                title="Redimensionar coluna"
              ></div>
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

            <!-- Empty state -->
            <tr *ngIf="data.length === 0">
              <td [attr.colspan]="columnCount" class="ds-list__empty">
                {{ emptyMessage }}
              </td>
            </tr>
          </ng-template>
        </tbody>
      </table>

      <!-- Desktop Pagination -->
      <div *ngIf="totalPages > 1" class="ds-list__pagination">
        <span class="ds-list__pagination-info">
          Exibindo {{ paginationStart }}–{{ paginationEnd }} de
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
      <!-- ── Grouped Mobile View ── -->
      <ng-container *ngIf="groupBy; else flatMobileCards">
        <ng-container *ngFor="let group of mobileGroupedData">
          <div class="ds-list__mobile-group-header">
            <ng-container *ngIf="groupHeaderTemplate; else defaultMobileGroupHeader">
              <ng-container
                *ngTemplateOutlet="
                  groupHeaderTemplate;
                  context: { $implicit: group.key, groupKey: group.key, items: group.items }
                "
              ></ng-container>
            </ng-container>
            <ng-template #defaultMobileGroupHeader>
              <div class="ds-list__group-header">
                <strong>{{ group.key }}</strong>
                <span class="ds-list__group-count">({{ group.items.length }})</span>
              </div>
            </ng-template>
          </div>

          <div
            *ngFor="let row of group.items; trackBy: _trackByFn"
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
        </ng-container>
      </ng-container>

      <!-- ── Flat Mobile View ── -->
      <ng-template #flatMobileCards>
        <div
          *ngFor="let row of mobileData; trackBy: _trackByFn"
          class="ds-list__card"
          (click)="onRowClick($event, row)"
          [class.ds-list__row--clickable]="hasRowClick"
        >
          <!-- Custom card template -->
          <ng-container *ngIf="cardTemplate; else defaultFlatCardTpl">
            <ng-container
              *ngTemplateOutlet="cardTemplate; context: { $implicit: row }"
            ></ng-container>
          </ng-container>

          <!-- Default card layout -->
          <ng-template #defaultFlatCardTpl>
            <div class="ds-list__card-header" *ngIf="firstColumn">
              <span class="ds-list__card-title">
                <ng-container *ngIf="firstColumn.cellTemplate; else defaultTitleCellFlat">
                  <ng-container
                    *ngTemplateOutlet="
                      firstColumn.cellTemplate;
                      context: { $implicit: resolveValue(row, firstColumn.key), row: row }
                    "
                  ></ng-container>
                </ng-container>
                <ng-template #defaultTitleCellFlat>{{ resolveValue(row, firstColumn.key) }}</ng-template>
              </span>
            </div>

            <div class="ds-list__card-body" *ngIf="restColumns.length > 0">
              <div *ngFor="let col of restColumns" class="ds-list__card-field">
                <span class="ds-list__card-label">{{ col.label }}</span>
                <span class="ds-list__card-value">
                  <ng-container *ngIf="col.cellTemplate; else defaultFieldCellFlat">
                    <ng-container
                      *ngTemplateOutlet="
                        col.cellTemplate;
                        context: { $implicit: resolveValue(row, col.key), row: row }
                      "
                    ></ng-container>
                  </ng-container>
                  <ng-template #defaultFieldCellFlat>{{ resolveValue(row, col.key) }}</ng-template>
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
      </ng-template>

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

  // Resizable columns & localStorage inputs
  @Input() listId?: string;
  @Input() resizableColumns = true;

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
      if (!this.serverPagination) {
        this.currentPage = 1;
      }
      this.mobileLoadedCount = this.pageSize;
    }
  }

  private columnsSub?: Subscription;

  ngAfterViewInit(): void {
    setTimeout(() => this.restoreColumnWidths(), 0);
    if (this.columns) {
      this.columnsSub = this.columns.changes.subscribe(() => {
        setTimeout(() => this.restoreColumnWidths(), 0);
      });
    }
  }

  ngOnDestroy(): void {
    this.columnsSub?.unsubscribe();
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
      return this.data;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get mobileGroupedData(): { key: string; items: any[] }[] {
    if (!this.groupBy) return [];
    const groupsMap = new Map<string, any[]>();
    const rows = this.mobileData;
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

  get columnCount(): number {
    let count = this.columns ? this.columns.length : 0;
    if (this.actionsTemplate) count++;
    return count;
  }

  get firstColumn(): ListColumnDirective | undefined {
    return this.columns?.first;
  }

  get restColumns(): ListColumnDirective[] {
    if (!this.columns) return [];
    return this.columns.toArray().slice(1);
  }

  get visiblePages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: number[] = [1];
    if (current > 3) pages.push(-1);
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  }

  get hasRowClick(): boolean {
    return this.rowClick.observed;
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

  // ── Column Resize & localStorage ──

  onColumnResizeStart(event: MouseEvent | TouchEvent, col: ListColumnDirective): void {
    event.stopPropagation();
    event.preventDefault();

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const th = (event.target as HTMLElement).closest('th');
    const startWidth = th ? th.getBoundingClientRect().width : 100;

    this.ngZone.runOutsideAngular(() => {
      const onMove = (moveEvt: MouseEvent | TouchEvent) => {
        const currentX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
        const deltaX = currentX - clientX;
        const newWidth = Math.max(50, Math.round(startWidth + deltaX));
        col.width = `${newWidth}px`;
        this.cdr.markForCheck();
      };

      const onEnd = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onEnd);
        this.saveColumnWidths();
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onMove);
      window.addEventListener('touchend', onEnd);
    });
  }

  private saveColumnWidths(): void {
    if (!this.columns) return;
    const storageKey = `ds-list-col-widths-${this.listId || 'default'}`;
    const widths: Record<string, string> = {};
    for (const col of this.columns.toArray()) {
      if (col.key && col.width) {
        widths[col.key] = col.width;
      }
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(widths));
    } catch {
      // Ignora erro se localStorage estiver inacessível
    }
  }

  private restoreColumnWidths(): void {
    if (!this.columns || this.columns.length === 0) return;
    const storageKey = `ds-list-col-widths-${this.listId || 'default'}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const widths = JSON.parse(saved) as Record<string, string>;
      for (const col of this.columns.toArray()) {
        if (col.key && widths[col.key]) {
          col.width = widths[col.key];
        }
      }
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    } catch {
      // Ignora erro se json/localStorage falhar
    }
  }

  // ── Actions ──

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.pageChange.emit(page);
  }

  toggleSort(col: ListColumnDirective): void {
    if (!col.sortable || !col.key) return;
    if (this.sortKey === col.key) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = col.key;
      this.sortOrder = 'asc';
    }
    this.sortChange.emit({ key: this.sortKey, order: this.sortOrder });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRowClick(event: MouseEvent, row: any): void {
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, [role="button"], .row-actions, app-task-timesheet-control')) {
      return;
    }
    this.rowClick.emit(row);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolveValue(row: any, key: string): any {
    if (!row || !key) return undefined;
    if (key.includes('.')) {
      return key.split('.').reduce((acc, part) => acc && acc[part], row);
    }
    return row[key];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _trackByFn(_: number, item: any): any {
    return item ? item[this.trackByKey] ?? item : _;
  }

  // ── Intersection Observer for Infinite Scroll ──

  private setupObserver(sentinelEl: HTMLElement): void {
    this.disconnectObserver();
    this.observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !this.isLoadingMore && this.hasMoreMobileData) {
          this.loadMoreMobile();
        }
      },
      { rootMargin: '100px' }
    );
    this.observer.observe(sentinelEl);
  }

  private disconnectObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
    }
  }

  private loadMoreMobile(): void {
    this.isLoadingMore = true;
    this.mobileLoadedCount += this.pageSize;
    this.isLoadingMore = false;
  }
}
