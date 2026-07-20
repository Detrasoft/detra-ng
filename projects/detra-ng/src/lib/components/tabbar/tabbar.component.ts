import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  EventEmitter,
  Input,
  Output,
  QueryList,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabComponent } from './tab.component';

/**
 * Reusable tabbar component for navigating between tab panels.
 *
 * Desktop: horizontal tab bar at the top with icons + labels.
 * Mobile (≤768px): a compact header showing the active tab's icon + name
 * with a menu button. Tapping the menu opens a dropdown panel listing
 * all tabs; selecting one closes the panel and switches content.
 *
 * Usage:
 * ```html
 * <ds-tabbar [(activeTab)]="selectedTab">
 *   <ds-tab id="personal" header="Dados Pessoais" icon="fa-solid fa-user" [badge]="3">
 *     <p>Content...</p>
 *   </ds-tab>
 * </ds-tabbar>
 * ```
 */
@Component({
  selector: 'ds-tabbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styleUrl: './tabbar.component.css',
  host: {
    '[class.ds-tabbar--vertical]': "layoutMode === 'vertical'",
    '[class.ds-tabbar--horizontal]': "layoutMode === 'horizontal'",
  },
  template: `
    <div class="ds-tabbar">
      <!-- ═══ DESKTOP: horizontal tab bar ═══ -->
      <nav class="ds-tabbar__nav-desktop" role="tablist">
        <button
          *ngFor="let tab of tabs"
          type="button"
          role="tab"
          class="ds-tabbar__tab"
          [class.ds-tabbar__tab--active]="activeTab === tab.id"
          [attr.aria-selected]="activeTab === tab.id"
          [attr.aria-controls]="'panel-' + tab.id"
          [attr.aria-label]="tab.header"
          [attr.title]="tab.header"
          (click)="selectTab(tab.id)"
        >
          <i *ngIf="tab.icon" [class]="tab.icon" class="ds-tabbar__icon"></i>
          <span class="ds-tabbar__label">{{ tab.header }}</span>
          <span class="ds-tabbar__badge" *ngIf="tab.badge">{{ tab.badge }}</span>
        </button>
      </nav>

      <!-- ═══ MOBILE: compact header + dropdown ═══ -->
      <div class="ds-tabbar__mobile-header">
        <button
          type="button"
          class="ds-tabbar__trigger"
          (click)="toggleMobileMenu()"
          [attr.aria-expanded]="mobileOpen"
        >
          <i
            *ngIf="activeTabRef?.icon"
            [class]="activeTabRef!.icon"
            class="ds-tabbar__trigger-icon"
          ></i>
          <span class="ds-tabbar__trigger-label">{{ activeTabRef?.header }}</span>
          <i
            class="fa-solid fa-chevron-down ds-tabbar__trigger-chevron"
            [class.ds-tabbar__trigger-chevron--open]="mobileOpen"
          ></i>
        </button>

        <!-- Mobile dropdown panel (inside header for correct positioning) -->
        <div class="ds-tabbar__dropdown" [class.ds-tabbar__dropdown--open]="mobileOpen">
          <button
            *ngFor="let tab of tabs"
            type="button"
            class="ds-tabbar__dropdown-item"
            [class.ds-tabbar__dropdown-item--active]="activeTab === tab.id"
            (click)="selectTab(tab.id)"
          >
            <i *ngIf="tab.icon" [class]="tab.icon" class="ds-tabbar__dropdown-icon"></i>
            <span class="ds-tabbar__dropdown-label">{{ tab.header }}</span>
            <span class="ds-tabbar__badge" *ngIf="tab.badge">{{ tab.badge }}</span>
          </button>
        </div>
      </div>

      <!-- Mobile overlay -->
      <div class="ds-tabbar__overlay" *ngIf="mobileOpen" (click)="closeMobileMenu()"></div>

      <!-- ═══ Content Panel ═══ -->
      <div class="ds-tabbar__panel" role="tabpanel" [attr.id]="'panel-' + activeTab">
        <ng-container *ngFor="let tab of tabs">
          <div
            [hidden]="tab.id !== activeTab"
            class="ds-tabbar__panel-enter"
            [class.ds-tabbar__panel-active]="tab.id === activeTab"
          >
            <ng-container [ngTemplateOutlet]="tab.contentTemplate"></ng-container>
          </div>
        </ng-container>
      </div>
    </div>
  `,
})
export class TabbarComponent implements AfterContentInit {
  @Input() activeTab = '';
  @Output() activeTabChange = new EventEmitter<string>();
  @ContentChildren(TabComponent) tabs!: QueryList<TabComponent>;

  /**
   * Controls the orientation of the tab bar.
   *
   * - `'horizontal'` (default): tabs run across the top with a bottom border
   *   and an underline indicator on the active tab.
   * - `'vertical'`: tabs stack along the left side with a right border and a
   *   vertical indicator on the active tab. On mobile (≤768px) the labels
   *   collapse so only icons remain.
   *
   * The default is fully backwards compatible with every existing consumer
   * that does not pass this input.
   */
  @Input() layoutMode: 'horizontal' | 'vertical' = 'horizontal';

  mobileOpen = false;

  /** Reference to the currently active TabComponent for reading icon/header. */
  get activeTabRef(): TabComponent | undefined {
    return this.tabs?.find((t) => t.id === this.activeTab);
  }

  ngAfterContentInit(): void {
    if (!this.activeTab && this.tabs.length > 0) {
      this.activeTab = this.tabs.first.id;
    }
  }

  selectTab(id: string): void {
    this.activeTab = id;
    this.activeTabChange.emit(id);
    this.mobileOpen = false;
  }

  toggleMobileMenu(): void {
    this.mobileOpen = !this.mobileOpen;
  }

  closeMobileMenu(): void {
    this.mobileOpen = false;
  }
}
