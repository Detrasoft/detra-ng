import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  forwardRef,
  inject,
  Input,
  OnDestroy,
  ViewChild,
  ViewContainerRef,
  TemplateRef,
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

@Component({
  selector: 'ds-time',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, OverlayModule],
  styleUrl: './time.component.css',
  template: `
    <div
      class="ds-time-wrapper"
      [class.ds-time--error]="error"
      [class.ds-time--disabled]="disabled"
    >
      <label *ngIf="label" class="ds-time__label" [attr.for]="inputId">
        {{ label }}
        <span *ngIf="required" class="ds-time__required">*</span>
      </label>

      <div class="ds-time__container" #origin>
        <button
          type="button"
          [id]="inputId"
          class="ds-time__field"
          [class.ds-time__field--focused]="isPanelOpen"
          [disabled]="disabled"
          (click)="onToggle($event)"
          (keydown)="onKeydown($event)"
        >
          <span class="ds-time__value" [class.ds-time__placeholder]="!value">
            {{ value || placeholder || '00:00' }}
          </span>

          <span class="ds-time__icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </span>
        </button>
      </div>

      <span *ngIf="error" class="ds-time__error">{{ error }}</span>
      <span *ngIf="hint && !error" class="ds-time__hint">{{ hint }}</span>
    </div>

    <!-- ═══════════════════════════════════════════
         Overlay Panel Template
         ═══════════════════════════════════════════ -->
    <ng-template #panelTemplate>
      <div class="ds-time__picker-panel" (click)="$event.stopPropagation()">
        <!-- Hours Column -->
        <div class="ds-time__picker-col" (wheel)="onHoursWheel($event)">
          <button type="button" class="ds-time__arrow-btn" (click)="incrementHours()">
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
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </button>

          <span class="ds-time__num-display">{{ formattedHours }}</span>

          <button type="button" class="ds-time__arrow-btn" (click)="decrementHours()">
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
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>

        <!-- Separator -->
        <div class="ds-time__picker-sep">:</div>

        <!-- Minutes Column -->
        <div class="ds-time__picker-col" (wheel)="onMinutesWheel($event)">
          <button type="button" class="ds-time__arrow-btn" (click)="incrementMinutes()">
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
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </button>

          <span class="ds-time__num-display">{{ formattedMinutes }}</span>

          <button type="button" class="ds-time__arrow-btn" (click)="decrementMinutes()">
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
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </ng-template>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TimeComponent),
      multi: true,
    },
  ],
})
export class TimeComponent implements ControlValueAccessor, OnDestroy {
  private readonly overlay = inject(Overlay);
  private readonly vcr = inject(ViewContainerRef);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() label = '';
  @Input() placeholder = '';
  @Input() error = '';
  @Input() hint = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() inputId = `ds-time-${Math.random().toString(36).slice(2, 9)}`;

  @ViewChild('panelTemplate') panelTemplate!: TemplateRef<unknown>;
  @ViewChild('origin') originRef!: ElementRef<HTMLElement>;

  value = '';
  hours = 8;
  minutes = 0;

  isPanelOpen = false;
  private overlayRef: OverlayRef | null = null;
  private backdropSub?: Subscription;
  private justClosedByBackdrop = false;

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  get formattedHours(): string {
    return String(this.hours).padStart(2, '0');
  }

  get formattedMinutes(): string {
    return String(this.minutes).padStart(2, '0');
  }

  ngOnDestroy(): void {
    this.closePanel();
  }

  writeValue(val: string | null): void {
    this.value = val ?? '';
    this.parseValueToHM(this.value);
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  incrementHours(): void {
    this.hours = (this.hours + 1) % 24;
    this.updateValue();
  }

  decrementHours(): void {
    this.hours = (this.hours - 1 + 24) % 24;
    this.updateValue();
  }

  incrementMinutes(): void {
    this.minutes = (this.minutes + 1) % 60;
    this.updateValue();
  }

  decrementMinutes(): void {
    this.minutes = (this.minutes - 1 + 60) % 60;
    this.updateValue();
  }

  onHoursWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.deltaY < 0) {
      this.incrementHours();
    } else {
      this.decrementHours();
    }
  }

  onMinutesWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.deltaY < 0) {
      this.incrementMinutes();
    } else {
      this.decrementMinutes();
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
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onToggle(event);
    } else if (event.key === 'Escape' && this.isPanelOpen) {
      event.preventDefault();
      this.closePanel();
    }
  }

  private updateValue(): void {
    this.value = `${this.formattedHours}:${this.formattedMinutes}`;
    this.onChange(this.value);
    this.cdr.markForCheck();
  }

  private parseValueToHM(val: string): void {
    if (!val || typeof val !== 'string') return;
    const parts = val.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!Number.isNaN(h) && h >= 0 && h <= 23) {
        this.hours = h;
      }
      if (!Number.isNaN(m) && m >= 0 && m <= 59) {
        this.minutes = m;
      }
    }
  }

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
      this.onTouched();
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
}
