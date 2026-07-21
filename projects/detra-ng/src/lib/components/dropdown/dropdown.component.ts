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
  OnDestroy,
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
import { Subscription } from 'rxjs';

/* ═══════════════════════════════════════════
   Dropdown Component
   ═══════════════════════════════════════════ */

@Component({
  selector: 'ds-dropdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, OverlayModule],
  styleUrl: './dropdown.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DropdownComponent),
      multi: true,
    },
  ],
  template: `
    <div
      class="ds-dropdown-wrapper"
      [class.ds-dropdown--error]="error"
      [class.ds-dropdown--disabled]="disabled"
    >
      <!-- Label -->
      <label *ngIf="label" class="ds-dropdown__label" [attr.for]="inputId">
        {{ label }}
        <span *ngIf="required" class="ds-dropdown__required">*</span>
      </label>

      <!-- Field Container -->
      <div class="ds-dropdown__container" #origin>
        <button
          type="button"
          class="ds-dropdown__field"
          [class.ds-dropdown__field--focused]="isPanelOpen"
          [class.ds-dropdown__field--disabled]="disabled"
          [disabled]="disabled"
          [attr.aria-expanded]="isPanelOpen"
          [attr.aria-controls]="isPanelOpen ? panelId : null"
          [attr.aria-activedescendant]="activeIndex >= 0 ? panelId + '-' + activeIndex : null"
          aria-haspopup="listbox"
          (click)="onToggle($event)"
          (keydown)="onKeydown($event)"
        >
          <span
            class="ds-dropdown__value"
            [class.ds-dropdown__placeholder]="!hasValue"
            style="display: inline-flex; align-items: center; gap: 8px;"
          >
            <i *ngIf="hasValue && getSelectedIcon()" [class]="getSelectedIcon()"></i>
            <span>{{ getDisplayValue() }}</span>
          </span>

          <span
            class="ds-dropdown__toggle-icon"
            [class.ds-dropdown__toggle-icon--open]="isPanelOpen"
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
          </span>
        </button>
      </div>

      <!-- Error / Hint -->
      <span *ngIf="error" class="ds-dropdown__error">{{ error }}</span>
      <span *ngIf="hint && !error" class="ds-dropdown__hint">{{ hint }}</span>
    </div>

    <!-- ═══════════════════════════════════════════
         Overlay Panel Template
         ═══════════════════════════════════════════ -->
    <ng-template #panelTemplate>
      <div
        class="ds-dropdown__panel"
        [id]="panelId"
        role="listbox"
        [attr.aria-label]="label || 'Opções'"
      >
        <!-- Items -->
        <button
          *ngFor="let item of options; let i = index"
          type="button"
          class="ds-dropdown__item"
          [class.ds-dropdown__item--active]="i === activeIndex"
          [class.ds-dropdown__item--selected]="isSelected(item)"
          [id]="panelId + '-' + i"
          role="option"
          [attr.aria-selected]="isSelected(item)"
          (click)="selectItem(item, $event)"
          (mouseenter)="activeIndex = i"
        >
          <!-- Custom template or default label -->
          <ng-container *ngIf="itemTemplate; else defaultItemTpl">
            <ng-container
              *ngTemplateOutlet="itemTemplate; context: { $implicit: item }"
            ></ng-container>
          </ng-container>

          <ng-template #defaultItemTpl>
            <span style="display: inline-flex; align-items: center; gap: 8px;">
              <i *ngIf="item?.icone || item?.icon" [class]="item.icone || item.icon"></i>
              <span>{{ getItemLabel(item) }}</span>
            </span>
          </ng-template>
        </button>

        <!-- Empty state -->
        <div *ngIf="!options || options.length === 0" class="ds-dropdown__empty">
          {{ emptyMessage }}
        </div>
      </div>
    </ng-template>
  `,
})
export class DropdownComponent implements ControlValueAccessor, OnDestroy {
  private readonly overlay = inject(Overlay);
  private readonly vcr = inject(ViewContainerRef);
  private readonly cdr = inject(ChangeDetectorRef);

  /* ── Inputs ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() options: any[] = [];
  @Input() optionLabel = '';
  @Input() optionValue = '';
  @Input() emptyMessage = 'Nenhuma opção disponível.';
  @Input() placeholder = 'Selecione...';
  @Input() label = '';
  @Input() error = '';
  @Input() hint = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() inputId = `ds-dd-${Math.random().toString(36).slice(2, 9)}`;

  /* ── Outputs ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() onChange = new EventEmitter<any>();

  /* ── Content projection ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @ContentChild('itemTemplate') itemTemplate?: TemplateRef<{ $implicit: any }>;

  /* ── ViewChildren ── */
  @ViewChild('panelTemplate') panelTemplate!: TemplateRef<unknown>;
  @ViewChild('origin') originRef!: ElementRef<HTMLElement>;

  /* ── State ── */
  isPanelOpen = false;
  activeIndex = -1;
  panelId = `ds-dd-panel-${Math.random().toString(36).slice(2, 9)}`;

  /* ── Internals ── */
  private overlayRef: OverlayRef | null = null;
  private backdropSub?: Subscription;
  private justClosedByBackdrop = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private value: any = null;

  /* ── CVA ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onChangeFn: (v: any) => void = () => {};
  private onTouchedFn: () => void = () => {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  writeValue(value: any): void {
    this.value = value ?? null;
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

  ngOnDestroy(): void {
    this.destroyOverlay();
  }

  /* ══════════════════════════════════════════
     Public API / Template methods
     ══════════════════════════════════════════ */

  get hasValue(): boolean {
    return this.value != null;
  }

  getDisplayValue(): string {
    if (!this.hasValue) {
      return this.placeholder;
    }

    const selectedItem = this.findMatchingItem(this.value) || this.value;
    return this.getItemLabel(selectedItem);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getItemLabel(item: any): string {
    if (item == null) return '';
    if (typeof item === 'string' || typeof item === 'number') return String(item);
    if (this.optionLabel) {
      const val = this.resolveField(item, this.optionLabel);
      if (val != null && String(val).trim() !== '') {
        return String(val);
      }
    }
    if (item.valor != null && String(item.valor).trim() !== '') return String(item.valor);
    if (item.value != null && String(item.value).trim() !== '') return String(item.value);
    if (item.label != null && String(item.label).trim() !== '') return String(item.label);
    if (item.name != null && String(item.name).trim() !== '') return String(item.name);
    return String(item);
  }

  getSelectedIcon(): string | null {
    if (!this.hasValue) return null;
    const selectedItem = this.findMatchingItem(this.value) || this.value;
    if (selectedItem && typeof selectedItem === 'object') {
      return selectedItem.icone || selectedItem.icon || null;
    }
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolveField(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private findMatchingItem(val: any): any {
    if (!this.options || val == null) return null;
    return this.options.find((opt) => {
      if (this.optionValue) {
        return this.resolveField(opt, this.optionValue) === val;
      }
      if (opt.id != null && val.id != null) {
        return opt.id === val.id;
      }
      return opt === val;
    });
  }

  /* ── Input events ── */

  onKeydown(event: KeyboardEvent): void {
    if (!this.isPanelOpen) {
      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'Enter' ||
        event.key === ' '
      ) {
        event.preventDefault();
        this.openPanel();

        if (this.hasValue) {
          const match = this.findMatchingItem(this.value);
          this.activeIndex = match ? this.options.indexOf(match) : 0;
        } else {
          this.activeIndex = 0;
        }
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex = (this.activeIndex + 1) % (this.options?.length || 1);
        this.scrollToActive();
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex = this.activeIndex <= 0 ? (this.options?.length || 1) - 1 : this.activeIndex - 1;
        this.scrollToActive();
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.options && this.activeIndex >= 0 && this.activeIndex < this.options.length) {
          this.selectItem(this.options[this.activeIndex]);
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.closePanel();
        break;
    }
  }

  onToggle(event: Event): void {
    event.stopPropagation();
    if (this.disabled) return;

    if (this.justClosedByBackdrop) {
      this.justClosedByBackdrop = false;
      return;
    }

    if (this.isPanelOpen) {
      this.closePanel();
    } else {
      this.openPanel();
      if (this.hasValue) {
        const match = this.findMatchingItem(this.value);
        this.activeIndex = match ? this.options.indexOf(match) : 0;
        setTimeout(() => this.scrollToActive(), 50);
      } else {
        this.activeIndex = -1;
      }
    }
  }

  /* ── Selection ── */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectItem(item: any, event?: Event): void {
    event?.stopPropagation();
    const val = this.optionValue ? this.resolveField(item, this.optionValue) : item;
    this.value = val;
    this.onChangeFn(val);
    this.onChange.emit(val);
    this.onTouchedFn();
    this.closePanel();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isSelected(item: any): boolean {
    const match = this.findMatchingItem(this.value);
    return item === match;
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
    this.cdr.markForCheck();

    this.backdropSub?.unsubscribe();
    this.backdropSub = this.overlayRef.backdropClick().subscribe(() => {
      this.justClosedByBackdrop = true;
      this.closePanel();
      this.onTouchedFn();
      setTimeout(() => {
        this.justClosedByBackdrop = false;
      }, 200);
    });
  }

  private closePanel(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
    this.backdropSub?.unsubscribe();
    this.isPanelOpen = false;
    this.cdr.markForCheck();
  }

  private destroyOverlay(): void {
    this.closePanel();
  }

  /* ── Helpers ── */

  private scrollToActive(): void {
    const panel = this.overlayRef?.overlayElement?.querySelector('.ds-dropdown__panel');
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
}
