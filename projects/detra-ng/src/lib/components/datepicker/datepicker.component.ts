import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  forwardRef,
  HostBinding,
  HostListener,
  inject,
  Input,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/* ═══════════════════════════════════════════
   Locale & Types
   ═══════════════════════════════════════════ */

export interface DatepickerLocale {
  dayNames: string[];
  dayNamesShort: string[];
  monthNames: string[];
  monthNamesShort: string[];
  firstDayOfWeek: number;
}

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isDisabled: boolean;
}

export const DATEPICKER_LOCALE_PT_BR: DatepickerLocale = {
  dayNames: [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  monthNames: [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ],
  monthNamesShort: [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ],
  firstDayOfWeek: 0,
};

export const DATEPICKER_LOCALE_EN: DatepickerLocale = {
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  monthNames: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  monthNamesShort: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ],
  firstDayOfWeek: 0,
};

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */

@Component({
  selector: 'ds-datepicker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styleUrl: './datepicker.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatepickerComponent),
      multi: true,
    },
  ],
  template: `
    <div
      class="ds-datepicker-wrapper"
      [class.ds-datepicker--error]="error"
      [class.ds-datepicker--disabled]="disabled"
      [class.ds-datepicker--open]="isOpen"
    >
      <!-- Label -->
      <label *ngIf="label" class="ds-datepicker__label" [attr.for]="inputId">
        {{ label }}
        <span *ngIf="required" class="ds-datepicker__required">*</span>
      </label>

      <!-- Field + Dropdown anchor -->
      <div class="ds-datepicker__container">
        <input
          [id]="inputId"
          type="text"
          class="ds-datepicker__field"
          [value]="displayValue"
          [placeholder]="placeholder"
          [disabled]="disabled"
          (click)="toggleCalendar()"
          (blur)="onInputBlur($event)"
          (keyup.enter)="onInputBlur($event)"
        />
        <button
          type="button"
          class="ds-datepicker__toggle"
          [disabled]="disabled"
          (click)="toggleCalendar()"
          tabindex="-1"
          aria-label="Abrir calendário"
        >
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
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>

        <!-- Calendar Dropdown -->
        <div class="ds-datepicker__dropdown" *ngIf="isOpen">
          <div class="ds-datepicker__nav">
            <button
              type="button"
              class="ds-datepicker__nav-btn"
              (click)="prev($event)"
              aria-label="Anterior"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <button
              type="button"
              class="ds-datepicker__nav-title ds-datepicker__nav-title--btn"
              (click)="toggleViewMode($event)"
            >
              <ng-container *ngIf="viewMode === 'days'">
                {{ currentMonthName }}&nbsp;&nbsp;{{ viewYear }}
              </ng-container>
              <ng-container *ngIf="viewMode === 'years'">
                {{ yearsMatrix[0] }} - {{ yearsMatrix[yearsMatrix.length - 1] }}
              </ng-container>
            </button>

            <button
              type="button"
              class="ds-datepicker__nav-btn"
              (click)="next($event)"
              aria-label="Próximo"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <ng-container *ngIf="viewMode === 'days'">
            <div class="ds-datepicker__weekdays">
              <span *ngFor="let d of weekdayHeaders" class="ds-datepicker__weekday">{{ d }}</span>
            </div>

            <div class="ds-datepicker__days">
              <button
                *ngFor="let cell of calendarDays"
                type="button"
                class="ds-datepicker__day"
                [class.ds-datepicker__day--other]="!cell.isCurrentMonth"
                [class.ds-datepicker__day--today]="cell.isToday"
                [class.ds-datepicker__day--selected]="cell.isSelected"
                [class.ds-datepicker__day--disabled]="cell.isDisabled"
                [disabled]="!cell.isCurrentMonth || cell.isDisabled"
                (click)="selectDate(cell, $event)"
              >
                {{ cell.day }}
              </button>
            </div>
          </ng-container>

          <div class="ds-datepicker__years" *ngIf="viewMode === 'years'">
            <button
              *ngFor="let year of yearsMatrix"
              type="button"
              class="ds-datepicker__year"
              [class.ds-datepicker__year--selected]="year === viewYear"
              (click)="selectYear(year, $event)"
            >
              {{ year }}
            </button>
          </div>
        </div>
      </div>

      <!-- Error / Hint -->
      <span *ngIf="error" class="ds-datepicker__error">{{ error }}</span>
      <span *ngIf="hint && !error" class="ds-datepicker__hint">{{ hint }}</span>
    </div>
  `,
})
export class DatepickerComponent implements ControlValueAccessor, OnInit {
  private readonly el = inject(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);

  /* ── Inputs ── */
  @Input() label = '';
  @Input() placeholder = '';
  @Input() dateFormat = 'dd/mm/yy';
  @Input() locale: DatepickerLocale = DATEPICKER_LOCALE_PT_BR;
  @Input() required = false;
  @Input() disabled = false;
  @Input() error = '';
  @Input() hint = '';
  @Input() minDate = '';
  @Input() maxDate = '';
  @Input() inputId = `ds-dp-${Math.random().toString(36).slice(2, 9)}`;
  /** 'date' emite 'YYYY-MM-DD'; 'datetime' emite 'YYYY-MM-DDT00:00:00' (para backends com LocalDateTime) */
  @Input() outputFormat: 'date' | 'datetime' = 'date';

  /* ── State ── */
  selectedDate: Date | null = null;
  viewMonth = new Date().getMonth();
  viewYear = new Date().getFullYear();
  isOpen = false;

  @HostBinding('class.ds-datepicker--open') get isOpenClass(): boolean {
    return this.isOpen;
  }

  calendarDays: CalendarDay[] = [];
  displayValue = '';

  viewMode: 'days' | 'years' = 'days';
  yearsMatrix: number[] = [];

  private today = new Date();

  /* ── CVA ── */
  onChange: (v: string) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: any): void {
    if (value) {
      let d: Date | null = null;
      if (value instanceof Date) {
        d = value;
      } else if (typeof value === 'string') {
        d = this.parseISO(value);
      }

      if (d && !isNaN(d.getTime())) {
        this.selectedDate = d;
        this.viewYear = d.getFullYear();
        this.viewMonth = d.getMonth();
        this.displayValue = this.formatDate(d);
      } else {
        this.selectedDate = null;
        this.displayValue = '';
      }
    } else {
      this.selectedDate = null;
      this.displayValue = '';
    }
    this.generateCalendar();
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  /* ── Lifecycle ── */
  ngOnInit(): void {
    this.generateCalendar();
  }

  /* ── Computed ── */
  get currentMonthName(): string {
    return this.locale.monthNames[this.viewMonth];
  }

  get weekdayHeaders(): string[] {
    return Array.from(
      { length: 7 },
      (_, i) => this.locale.dayNamesShort[(this.locale.firstDayOfWeek + i) % 7],
    );
  }

  /* ── Actions ── */
  toggleCalendar(): void {
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.viewMode = 'days';
      if (this.selectedDate) {
        this.viewYear = this.selectedDate.getFullYear();
        this.viewMonth = this.selectedDate.getMonth();
      }
      this.generateCalendar();
    }
  }

  toggleViewMode(e: Event): void {
    e.stopPropagation();
    this.viewMode = this.viewMode === 'days' ? 'years' : 'days';
    if (this.viewMode === 'years') this.generateYears();
  }

  prev(e: Event): void {
    if (this.viewMode === 'days') this.prevMonth(e);
    else this.prevDecade(e);
  }

  next(e: Event): void {
    if (this.viewMode === 'days') this.nextMonth(e);
    else this.nextDecade(e);
  }

  prevMonth(e: Event): void {
    e.stopPropagation();
    if (--this.viewMonth < 0) {
      this.viewMonth = 11;
      this.viewYear--;
    }
    this.generateCalendar();
  }

  nextMonth(e: Event): void {
    e.stopPropagation();
    if (++this.viewMonth > 11) {
      this.viewMonth = 0;
      this.viewYear++;
    }
    this.generateCalendar();
  }

  prevDecade(e: Event): void {
    e.stopPropagation();
    this.viewYear -= 20;
    this.generateYears();
  }

  nextDecade(e: Event): void {
    e.stopPropagation();
    this.viewYear += 20;
    this.generateYears();
  }

  selectYear(year: number, e: Event): void {
    e.stopPropagation();
    this.viewYear = year;
    this.viewMode = 'days';
    this.generateCalendar();
  }

  selectDate(cell: CalendarDay, e: Event): void {
    e.stopPropagation();
    if (!cell.isCurrentMonth || cell.isDisabled) return;
    this.selectedDate = cell.date;
    this.displayValue = this.formatDate(cell.date);
    this.onChange(this.toISO(cell.date));
    this.isOpen = false;
    this.generateCalendar();
  }

  onInputBlur(event: Event): void {
    this.onTouched();
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();

    if (!value) {
      this.selectedDate = null;
      this.displayValue = '';
      this.onChange('');
      return;
    }

    const parsed = this.parseDateString(value);
    if (parsed) {
      if (!this.isDisabled(parsed)) {
        this.selectedDate = parsed;
        this.viewYear = parsed.getFullYear();
        this.viewMonth = parsed.getMonth();
        this.displayValue = this.formatDate(parsed);
        this.onChange(this.toISO(parsed));
      } else {
        this.displayValue = this.selectedDate ? this.formatDate(this.selectedDate) : '';
      }
    } else {
      this.displayValue = this.selectedDate ? this.formatDate(this.selectedDate) : '';
    }
    input.value = this.displayValue;
    this.generateCalendar();
  }

  /* ── Global listeners ── */
  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (this.isOpen && !this.el.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.isOpen) this.isOpen = false;
  }

  /* ═══════════════════════════════════════════
     Calendar grid generation
     ═══════════════════════════════════════════ */
  private generateCalendar(): void {
    const first = new Date(this.viewYear, this.viewMonth, 1);
    const last = new Date(this.viewYear, this.viewMonth + 1, 0);
    const offset = (first.getDay() - this.locale.firstDayOfWeek + 7) % 7;
    const totalCells = Math.ceil((offset + last.getDate()) / 7) * 7;
    const prevLast = new Date(this.viewYear, this.viewMonth, 0).getDate();

    const days: CalendarDay[] = [];

    // Previous month
    for (let i = offset - 1; i >= 0; i--) {
      days.push(
        this.mkDay(new Date(this.viewYear, this.viewMonth - 1, prevLast - i), prevLast - i, false),
      );
    }
    // Current month
    for (let i = 1; i <= last.getDate(); i++) {
      days.push(this.mkDay(new Date(this.viewYear, this.viewMonth, i), i, true));
    }
    // Next month
    for (let i = 1; days.length < totalCells; i++) {
      days.push(this.mkDay(new Date(this.viewYear, this.viewMonth + 1, i), i, false));
    }

    this.calendarDays = days;
  }

  private mkDay(date: Date, day: number, isCurrent: boolean): CalendarDay {
    return {
      date,
      day,
      isCurrentMonth: isCurrent,
      isToday: this.isSameDay(date, this.today),
      isSelected: !!this.selectedDate && this.isSameDay(date, this.selectedDate),
      isDisabled: this.isDisabled(date),
    };
  }

  private isDisabled(date: Date): boolean {
    if (this.minDate) {
      const m = this.parseISO(this.minDate);
      if (m && date < m) return true;
    }
    if (this.maxDate) {
      const m = this.parseISO(this.maxDate);
      if (m && date > m) return true;
    }
    return false;
  }

  /* ═══════════════════════════════════════════
     Date formatting (i18n tokens)

     d  → day (no leading zero)      dd → day (two digits)
     o  → day of year (no zeros)     oo → day of year (three digits)
     D  → abbreviated day name       DD → full day name
     m  → month (no leading zero)    mm → month (two digits)
     M  → abbreviated month name     MM → full month name
     y  → year (two digits)          yy → year (four digits)
     ═══════════════════════════════════════════ */
  formatDate(date: Date): string {
    const loc = this.locale;
    const tokenMap: Record<string, string> = {
      DD: loc.dayNames[date.getDay()],
      D: loc.dayNamesShort[date.getDay()],
      oo: String(this.dayOfYear(date)).padStart(3, '0'),
      o: String(this.dayOfYear(date)),
      dd: String(date.getDate()).padStart(2, '0'),
      d: String(date.getDate()),
      MM: loc.monthNames[date.getMonth()],
      M: loc.monthNamesShort[date.getMonth()],
      mm: String(date.getMonth() + 1).padStart(2, '0'),
      m: String(date.getMonth() + 1),
      yy: String(date.getFullYear()),
      y: String(date.getFullYear()).slice(-2),
    };

    return this.dateFormat.replace(/DD|D|oo|o|dd|d|MM|M|mm|m|yy|y/g, (tok) => tokenMap[tok] ?? tok);
  }

  /* ── Helpers ── */
  private dayOfYear(d: Date): number {
    const start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
  }

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  private getTimezoneOffsetString(date: Date): string {
    const offsetMinutes = date.getTimezoneOffset();
    if (offsetMinutes === 0) return 'Z';
    const sign = offsetMinutes > 0 ? '-' : '+';
    const absMinutes = Math.abs(offsetMinutes);
    const hours = String(Math.floor(absMinutes / 60)).padStart(2, '0');
    const mins = String(absMinutes % 60).padStart(2, '0');
    return `${sign}${hours}:${mins}`;
  }

  private toISO(d: Date): string {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yy}-${mm}-${dd}`;
    if (this.outputFormat === 'datetime') {
      const offsetStr = this.getTimezoneOffsetString(d);
      return `${dateStr}T00:00:00${offsetStr}`;
    }
    return dateStr;
  }

  private parseISO(s: string): Date | null {
    if (!s || typeof s !== 'string') return null;
    const dateStr = s.includes('T') ? s.split('T')[0] : s;
    const p = dateStr.split('-');
    if (p.length !== 3) return null;
    const d = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(d.getTime()) ? null : d;
  }

  private parseDateString(val: string): Date | null {
    const nums = val.match(/\d+/g);
    if (!nums) {
      const dt = new Date(val);
      return !isNaN(dt.getTime()) ? dt : null;
    }

    let d = 0,
      m = 0,
      y = 0;
    const rawDigits = nums.join('');

    if (val.includes('-') && nums.length === 3 && nums[0].length === 4) {
      y = parseInt(nums[0], 10);
      m = parseInt(nums[1], 10);
      d = parseInt(nums[2], 10);
    } else if (nums.length === 1 && (rawDigits.length === 8 || rawDigits.length === 6)) {
      d = parseInt(rawDigits.slice(0, 2), 10);
      m = parseInt(rawDigits.slice(2, 4), 10);
      y = parseInt(rawDigits.slice(4), 10);
      if (y < 100) y += 2000;
    } else if (nums.length >= 3) {
      d = parseInt(nums[0], 10);
      m = parseInt(nums[1], 10);
      y = parseInt(nums[2], 10);
      if (y < 100) y += 2000;
    } else if (nums.length === 2 && this.selectedDate) {
      d = parseInt(nums[0], 10);
      m = parseInt(nums[1], 10);
      y = this.selectedDate.getFullYear();
    } else {
      const dt = new Date(val);
      if (!isNaN(dt.getTime())) return dt;
      return null;
    }

    if (m < 1 || m > 12) return null;
    const lastDay = new Date(y, m, 0).getDate();
    if (d < 1 || d > lastDay) return null;

    return new Date(y, m - 1, d);
  }

  private generateYears(): void {
    const startYear = Math.floor(this.viewYear / 10) * 10 - 5;
    this.yearsMatrix = Array.from({ length: 20 }, (_, i) => startYear + i);
  }
}
