import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/* ═══════════════════════════════════════════
   Public Types & Interfaces
   ═══════════════════════════════════════════ */

export type CalendarView = 'month' | 'week' | 'day' | 'list';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date | string;
  end?: Date | string;
  allDay?: boolean;
  color?: string;
  textColor?: string;
  className?: string;
  data?: any;
}

export interface EventDropPayload {
  event: CalendarEvent;
  oldEvent: CalendarEvent;
  delta: {
    days: number;
    milliseconds: number;
  };
}

export interface EventResizePayload {
  event: CalendarEvent;
  oldEvent: CalendarEvent;
  edge: 'start' | 'end';
  delta: {
    days: number;
    milliseconds: number;
  };
}

export interface CalendarLocale {
  dayNames: string[];
  dayNamesShort: string[];
  dayNamesMin: string[];
  monthNames: string[];
  monthNamesShort: string[];
  firstDayOfWeek: number;
  todayLabel: string;
  allDayLabel: string;
  noEventsLabel: string;
}

export const CALENDAR_LOCALE_PT_BR: CalendarLocale = {
  dayNames: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
  monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  firstDayOfWeek: 0,
  todayLabel: 'Hoje',
  allDayLabel: 'Dia inteiro',
  noEventsLabel: 'Sem eventos neste período',
};

export const CALENDAR_LOCALE_EN: CalendarLocale = {
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  dayNamesMin: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  firstDayOfWeek: 0,
  todayLabel: 'Today',
  allDayLabel: 'All day',
  noEventsLabel: 'No events in this period',
};

/* ═══════════════════════════════════════════
   Internal Types
   ═══════════════════════════════════════════ */

interface MonthCell {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
  overflowCount: number;
}

interface GridDay {
  date: Date;
  dayNameShort: string;
  dayNameFull: string;
  dayNumber: number;
  isToday: boolean;
}

interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
}

interface PositionedEvent {
  event: CalendarEvent;
  top: number;
  height: number;
  left: number;
  width: number;
}

interface ListGroup {
  date: Date;
  dayName: string;
  dateLabel: string;
  isToday: boolean;
  events: CalendarEvent[];
}

interface ViewOption {
  key: CalendarView;
  label: string;
}

interface ActiveDragState {
  event: CalendarEvent;
  sourceDate: Date;
  view: CalendarView;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  targetDate?: Date;
  targetHour?: number;
  targetMinute?: number;
}

interface ActiveResizeState {
  event: CalendarEvent;
  edge: 'start' | 'end';
  startY: number;
  originalStart: Date;
  originalEnd: Date;
  currentStart: Date;
  currentEnd: Date;
  colElement: HTMLElement;
  isResizing: boolean;
}

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */

@Component({
  selector: 'ds-calendar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  styleUrl: './calendar.component.css',
  template: `
    <div class="ds-calendar" [style.height]="height !== 'auto' ? height : null" #calendarContainer>

      <!-- ═══════════════ TOOLBAR ═══════════════ -->
      <div class="ds-calendar__toolbar" *ngIf="headerToolbar">
        <div class="ds-calendar__toolbar-start">
          <button type="button" class="ds-calendar__toolbar-btn" (click)="navigatePrev($event)" aria-label="Anterior">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button type="button" class="ds-calendar__toolbar-btn ds-calendar__toolbar-btn--today"
                  (click)="navigateToday($event)">
            {{ locale.todayLabel }}
          </button>
          <button type="button" class="ds-calendar__toolbar-btn" (click)="navigateNext($event)" aria-label="Próximo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        <h2 class="ds-calendar__toolbar-title">{{ titleText }}</h2>

        <div class="ds-calendar__toolbar-views">
          <button type="button"
                  *ngFor="let v of viewOptions"
                  class="ds-calendar__toolbar-view-btn"
                  [class.ds-calendar__toolbar-view-btn--active]="currentView === v.key"
                  (click)="setView(v.key, $event)">
            {{ v.label }}
          </button>
        </div>
      </div>

      <!-- ═══════════════ MONTH VIEW ═══════════════ -->
      <div class="ds-calendar__month" *ngIf="currentView === 'month'">
        <div class="ds-calendar__month-header">
          <div class="ds-calendar__month-header-cell" *ngFor="let d of weekdayHeaders">{{ d }}</div>
        </div>
        <div class="ds-calendar__month-body">
          <div class="ds-calendar__month-row" *ngFor="let week of monthWeeks; trackBy: trackByIndex">
            <div class="ds-calendar__month-cell" *ngFor="let cell of week; trackBy: trackByCellDate"
                 [attr.data-calendar-date]="dateKey(cell.date)"
                 [class.ds-calendar__month-cell--today]="cell.isToday"
                 [class.ds-calendar__month-cell--other]="!cell.isCurrentMonth"
                 [class.ds-calendar__month-cell--drop-target]="activeDrag?.isDragging && activeDrag?.targetDate && isSameDay(cell.date, activeDrag!.targetDate!)"
                 (click)="onCellClick(cell.date, $event)">
              <span class="ds-calendar__month-day-num"
                    [class.ds-calendar__month-day-num--today]="cell.isToday">
                {{ cell.day }}
              </span>

              <!-- Skeleton for month cells -->
              <div *ngIf="loading" class="ds-calendar__skeleton-events">
                <div class="ds-calendar__skeleton-pill" [style.width.%]="70"></div>
                <div class="ds-calendar__skeleton-pill" [style.width.%]="85" *ngIf="cell.day % 2 === 0"></div>
              </div>

              <!-- Real events -->
              <div class="ds-calendar__month-events" *ngIf="!loading">
                <div *ngFor="let e of cell.events | slice:0:eventMaxStack; trackBy: trackByEventId"
                     class="ds-calendar__event ds-calendar__event--dot"
                     [class.ds-calendar__event--draggable]="isDraggable(e)"
                     [class.ds-calendar__event--dragging]="activeDrag?.isDragging && activeDrag?.event?.id === e.id"
                     [style.backgroundColor]="e.color || 'var(--color-primary-600)'"
                     [style.color]="getEventTextColor(e)"
                     (mousedown)="onEventMouseDown(e, cell.date, 'month', $event)"
                     (touchstart)="onEventTouchStart(e, cell.date, 'month', $event)"
                     (click)="onEventClick(e, $event)">
                  <span class="ds-calendar__event-time" *ngIf="!isAllDayEvent(e)">{{ formatTime(parseDate(e.start)) }}</span>
                  <span class="ds-calendar__event-title">{{ e.title }}</span>
                </div>
                <div *ngIf="cell.overflowCount > 0" class="ds-calendar__more-link">
                  +{{ cell.overflowCount }} mais
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════ WEEK / DAY VIEW (timegrid) ═══════════════ -->
      <ng-container *ngIf="currentView === 'week' || currentView === 'day'">
        <div class="ds-calendar__timegrid">
          <!-- Header -->
          <div class="ds-calendar__timegrid-header">
            <div class="ds-calendar__timegrid-gutter-spacer"></div>
            <div class="ds-calendar__timegrid-col-header" *ngFor="let day of gridDays; trackBy: trackByGridDay"
                 [class.ds-calendar__timegrid-col-header--today]="day.isToday">
              <span class="ds-calendar__timegrid-day-name">{{ day.dayNameShort }}</span>
              <span class="ds-calendar__timegrid-day-num"
                    [class.ds-calendar__timegrid-day-num--today]="day.isToday">
                {{ day.dayNumber }}
              </span>
            </div>
          </div>

          <!-- All-day row -->
          <div class="ds-calendar__timegrid-allday" *ngIf="hasAnyAllDayEvents || loading">
            <div class="ds-calendar__timegrid-gutter-allday">
              <span>{{ locale.allDayLabel }}</span>
            </div>
            <div class="ds-calendar__timegrid-allday-col" *ngFor="let day of gridDays; trackBy: trackByGridDay"
                 [class.ds-calendar__timegrid-allday-col--today]="day.isToday">
              <ng-container *ngIf="!loading">
                <div *ngFor="let e of getAllDayEventsForDate(day.date); trackBy: trackByEventId"
                     class="ds-calendar__event ds-calendar__event--allday"
                     [class.ds-calendar__event--draggable]="isDraggable(e)"
                     [class.ds-calendar__event--dragging]="activeDrag?.isDragging && activeDrag?.event?.id === e.id"
                     [style.backgroundColor]="e.color || 'var(--color-primary-600)'"
                     [style.color]="getEventTextColor(e)"
                     (mousedown)="onEventMouseDown(e, day.date, currentView, $event)"
                     (touchstart)="onEventTouchStart(e, day.date, currentView, $event)"
                     (click)="onEventClick(e, $event)">
                  {{ e.title }}
                </div>
              </ng-container>
              <div *ngIf="loading && day.isToday" class="ds-calendar__skeleton-pill" style="width: 80%; margin: 2px;"></div>
            </div>
          </div>

          <!-- Scrollable Time Body -->
          <div class="ds-calendar__timegrid-body" #timegridBody>
            <div class="ds-calendar__timegrid-slots-wrapper">
              <!-- Time Gutter -->
              <div class="ds-calendar__timegrid-gutter">
                <div class="ds-calendar__timegrid-gutter-slot" *ngFor="let slot of timeSlots; trackBy: trackBySlot">
                  <span *ngIf="slot.minute === 0" class="ds-calendar__timegrid-gutter-label">{{ slot.label }}</span>
                </div>
              </div>

              <!-- Day Columns -->
              <div class="ds-calendar__timegrid-cols">
                <div class="ds-calendar__timegrid-col"
                     #colEl
                     *ngFor="let day of gridDays; trackBy: trackByGridDay"
                     [attr.data-calendar-col-date]="dateKey(day.date)"
                     [class.ds-calendar__timegrid-col--today]="day.isToday"
                     [class.ds-calendar__timegrid-col--drop-target]="activeDrag?.isDragging && activeDrag?.targetDate && isSameDay(day.date, activeDrag!.targetDate!)">
                  <!-- Slot lines -->
                  <div *ngFor="let slot of timeSlots; trackBy: trackBySlot"
                       class="ds-calendar__timegrid-slot"
                       [class.ds-calendar__timegrid-slot--hour]="slot.minute === 0"
                       (click)="onSlotClick(day.date, slot, $event)">
                  </div>

                  <!-- Skeleton timegrid blocks -->
                  <div *ngIf="loading" class="ds-calendar__skeleton-timegrid">
                    <div class="ds-calendar__skeleton-block"
                         *ngIf="day.dayNumber % 2 === 0"
                         style="top: 20%; height: 16%; left: 6%; width: 88%;"></div>
                    <div class="ds-calendar__skeleton-block"
                         *ngIf="day.dayNumber % 3 === 0"
                         style="top: 48%; height: 22%; left: 6%; width: 88%;"></div>
                  </div>

                  <!-- Positioned timed events -->
                  <ng-container *ngIf="!loading">
                    <div *ngFor="let pe of getPositionedEventsForDate(day.date); trackBy: trackByPosEvent"
                         class="ds-calendar__event ds-calendar__event--timed"
                         [class.ds-calendar__event--draggable]="isDraggable(pe.event)"
                         [class.ds-calendar__event--dragging]="activeDrag?.isDragging && activeDrag?.event?.id === pe.event.id"
                         [class.ds-calendar__event--resizing]="activeResize?.isResizing && activeResize?.event?.id === pe.event.id"
                         [style.top.%]="pe.top"
                         [style.height.%]="pe.height"
                         [style.left]="pe.left + '%'"
                         [style.width]="'calc(' + pe.width + '% - 2px)'"
                         [style.backgroundColor]="pe.event.color || 'var(--color-primary-600)'"
                         [style.color]="getEventTextColor(pe.event)"
                         (mousedown)="onEventMouseDown(pe.event, day.date, currentView, $event)"
                         (touchstart)="onEventTouchStart(pe.event, day.date, currentView, $event)"
                         (click)="onEventClick(pe.event, $event)">
                      <!-- Top Resizer (adjust start time) -->
                      <div *ngIf="isResizable(pe.event)"
                           class="ds-calendar__event-resizer ds-calendar__event-resizer--top"
                           title="Arrastar para alterar horário de início"
                           (mousedown)="onResizeHandleMouseDown(pe.event, 'start', colEl, $event)"
                           (touchstart)="onResizeHandleTouchStart(pe.event, 'start', colEl, $event)"></div>

                      <span class="ds-calendar__event-time">{{ formatEventTime(pe.event) }}</span>
                      <span class="ds-calendar__event-title">{{ pe.event.title }}</span>

                      <!-- Bottom Resizer (adjust end time) -->
                      <div *ngIf="isResizable(pe.event)"
                           class="ds-calendar__event-resizer ds-calendar__event-resizer--bottom"
                           title="Arrastar para alterar horário de término"
                           (mousedown)="onResizeHandleMouseDown(pe.event, 'end', colEl, $event)"
                           (touchstart)="onResizeHandleTouchStart(pe.event, 'end', colEl, $event)"></div>
                    </div>
                  </ng-container>

                  <!-- Now Indicator -->
                  <div class="ds-calendar__now-indicator"
                       *ngIf="nowIndicator && day.isToday && nowIndicatorTop >= 0"
                       [style.top.%]="nowIndicatorTop">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- ═══════════════ LIST VIEW ═══════════════ -->
      <div class="ds-calendar__list" *ngIf="currentView === 'list'">
        <!-- Skeleton list -->
        <div *ngIf="loading" class="ds-calendar__skeleton-list">
          <div class="ds-calendar__skeleton-list-item" *ngFor="let _ of [1,2,3,4,5]">
            <div class="ds-calendar__skeleton-pill" style="width: 4px; height: 32px; border-radius: 2px;"></div>
            <div class="ds-calendar__skeleton-pill" style="width: 100px; height: 16px;"></div>
            <div class="ds-calendar__skeleton-pill" style="flex: 1; height: 16px;"></div>
          </div>
        </div>

        <ng-container *ngIf="!loading">
          <div *ngIf="listGroups.length === 0" class="ds-calendar__list-empty">
            {{ locale.noEventsLabel }}
          </div>
          <div class="ds-calendar__list-group" *ngFor="let group of listGroups; trackBy: trackByGroupDate">
            <div class="ds-calendar__list-group-header"
                 [class.ds-calendar__list-group-header--today]="group.isToday">
              <span class="ds-calendar__list-group-day">{{ group.dayName }}</span>
              <span class="ds-calendar__list-group-date">{{ group.dateLabel }}</span>
            </div>
            <div class="ds-calendar__list-item" *ngFor="let e of group.events; trackBy: trackByEventId"
                 (click)="onEventClick(e, $event)">
              <div class="ds-calendar__list-item-color"
                   [style.backgroundColor]="e.color || 'var(--color-primary-600)'"></div>
              <div class="ds-calendar__list-item-time">
                <ng-container *ngIf="!isAllDayEvent(e)">
                  {{ formatTime(parseDate(e.start)) }} – {{ formatTime(parseDate(e.end || e.start)) }}
                </ng-container>
                <ng-container *ngIf="isAllDayEvent(e)">
                  {{ locale.allDayLabel }}
                </ng-container>
              </div>
              <div class="ds-calendar__list-item-title">{{ e.title }}</div>
            </div>
          </div>
        </ng-container>
      </div>

      <!-- ═══════════════ FLOATING DRAG GHOST ═══════════════ -->
      <div *ngIf="activeDrag?.isDragging"
           class="ds-calendar__drag-ghost"
           [style.left.px]="activeDrag!.currentX + 12"
           [style.top.px]="activeDrag!.currentY + 12"
           [style.backgroundColor]="activeDrag!.event.color || 'var(--color-primary-600)'"
           [style.color]="activeDrag!.event.textColor || '#fff'">
        <span class="ds-calendar__drag-ghost-title">{{ activeDrag!.event.title }}</span>
        <span class="ds-calendar__drag-ghost-target" *ngIf="activeDrag!.targetDate">
          → {{ formatDateShort(activeDrag!.targetDate!) }}
          <ng-container *ngIf="activeDrag!.targetHour != null">
            {{ formatHourMinute(activeDrag!.targetHour!, activeDrag!.targetMinute || 0) }}
          </ng-container>
        </span>
      </div>

      <!-- ═══════════════ EVENT DETAILS POPOVER BALLOON ═══════════════ -->
      <div *ngIf="activePopoverEvent"
           class="ds-calendar__popover-backdrop"
           (click)="closePopover($event)">
        <div class="ds-calendar__popover"
             [style.top]="popoverStyle.top"
             [style.left]="popoverStyle.left"
             (click)="$event.stopPropagation()">

          <div class="ds-calendar__popover-header">
            <div class="ds-calendar__popover-accent"
                 [style.backgroundColor]="activePopoverEvent.color || 'var(--color-primary-600)'"></div>
            <div class="ds-calendar__popover-title-box">
              <h3 class="ds-calendar__popover-title">{{ activePopoverEvent.title }}</h3>
            </div>
            <button type="button" class="ds-calendar__popover-close" (click)="closePopover($event)" aria-label="Fechar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="ds-calendar__popover-body">
            <div class="ds-calendar__popover-row">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ds-calendar__popover-icon">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span class="ds-calendar__popover-text">
                {{ formatPopoverDate(activePopoverEvent) }}
              </span>
            </div>

            <div class="ds-calendar__popover-row" *ngIf="activePopoverEvent.data?.projectName || activePopoverEvent.data?.project">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ds-calendar__popover-icon">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span class="ds-calendar__popover-text">
                {{ activePopoverEvent.data?.projectName || activePopoverEvent.data?.project?.name }}
              </span>
            </div>

            <div class="ds-calendar__popover-row" *ngIf="activePopoverEvent.data?.stepTitle || activePopoverEvent.data?.stepStatus || activePopoverEvent.data?.status">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ds-calendar__popover-icon">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span class="ds-calendar__popover-badge" [style.borderColor]="activePopoverEvent.color">
                {{ activePopoverEvent.data?.stepTitle || activePopoverEvent.data?.stepStatus || activePopoverEvent.data?.status }}
              </span>
            </div>
          </div>

          <div class="ds-calendar__popover-footer">
            <button type="button"
                    class="ds-calendar__popover-btn-edit"
                    (click)="onEditEventFromPopover($event)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Editar Tarefa
            </button>
          </div>

        </div>
      </div>

    </div>
  `,
})
export class CalendarComponent implements OnInit, OnChanges, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);

  /* ── Inputs ── */
  @Input() events: CalendarEvent[] = [];
  @Input() view: CalendarView = 'month';
  @Input() date: Date | string = new Date();
  @Input() locale: CalendarLocale = CALENDAR_LOCALE_PT_BR;
  @Input() slotDuration = 30;
  @Input() dayStartHour = 6;
  @Input() dayEndHour = 22;
  @Input() weekends = true;
  @Input() height = 'auto';
  @Input() headerToolbar = true;
  @Input() nowIndicator = true;
  @Input() eventMaxStack = 3;

  /** Editable capabilities */
  @Input() editable = true;
  @Input() eventStartEditable = true;
  @Input() eventDurationEditable = true;

  /** Loading / Skeleton */
  @Input() loading = false;

  /** Default Event Color Fallback */
  @Input() defaultEventColor = 'var(--color-primary-600, #896ff4)';

  /* ── Outputs ── */
  @Output() viewChange = new EventEmitter<CalendarView>();
  @Output() dateChange = new EventEmitter<Date>();
  @Output() eventClick = new EventEmitter<CalendarEvent>();
  @Output() eventEdit = new EventEmitter<CalendarEvent>();
  @Output() dateClick = new EventEmitter<{ date: Date; allDay: boolean }>();
  @Output() eventDrop = new EventEmitter<EventDropPayload>();
  @Output() eventResize = new EventEmitter<EventResizePayload>();

  /* ── ViewChild ── */
  @ViewChild('calendarContainer') calendarContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('timegridBody') timegridBody?: ElementRef<HTMLDivElement>;

  /* ── State ── */
  currentView: CalendarView = 'month';
  currentDate = new Date();
  titleText = '';

  /* Month */
  monthWeeks: MonthCell[][] = [];
  weekdayHeaders: string[] = [];

  /* Week / Day */
  gridDays: GridDay[] = [];
  timeSlots: TimeSlot[] = [];
  hasAnyAllDayEvents = false;
  nowIndicatorTop = -1;

  /* List */
  listGroups: ListGroup[] = [];

  viewOptions: ViewOption[] = [
    { key: 'month', label: 'Mês' },
    { key: 'week', label: 'Semana' },
    { key: 'day', label: 'Dia' },
    { key: 'list', label: 'Lista' },
  ];

  /* Pointer Drag State */
  activeDrag: ActiveDragState | null = null;
  private pointerMoveListener?: (e: MouseEvent | TouchEvent) => void;
  private pointerUpListener?: (e: MouseEvent | TouchEvent) => void;
  private didDragOrResize = false;

  /* Resize State */
  activeResize: ActiveResizeState | null = null;

  /* Popover Balloon State */
  activePopoverEvent: CalendarEvent | null = null;
  popoverStyle: { top: string; left: string } = { top: '0px', left: '0px' };

  private today = new Date();
  private nowTimerId: any;
  private scrolledToNow = false;

  /* Positioned events cache (per-date string key) */
  private positionedCache = new Map<string, PositionedEvent[]>();
  private allDayCache = new Map<string, CalendarEvent[]>();

  /* ═══════════════════════════════════════════
     Lifecycle
     ═══════════════════════════════════════════ */

  ngOnInit(): void {
    this.currentView = this.view;
    this.currentDate = this.parseDate(this.date);
    this.buildViewOptions();
    this.regenerate();
    this.startNowTimer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['view'] && !changes['view'].firstChange) {
      this.currentView = this.view;
    }
    if (changes['date'] && !changes['date'].firstChange) {
      this.currentDate = this.parseDate(this.date);
    }
    if (changes['locale'] && !changes['locale'].firstChange) {
      this.buildViewOptions();
    }
    if (!changes['view']?.firstChange) {
      this.regenerate();
    }
  }

  ngOnDestroy(): void {
    if (this.nowTimerId) {
      clearInterval(this.nowTimerId);
    }
    this.cleanupPointerListeners();
  }

  @HostListener('window:keydown.escape')
  onEscapePress(): void {
    this.closePopover();
  }

  /* ═══════════════════════════════════════════
     Capabilities check
     ═══════════════════════════════════════════ */

  isDraggable(e: CalendarEvent): boolean {
    return this.editable && this.eventStartEditable && !this.loading;
  }

  isResizable(e: CalendarEvent): boolean {
    return this.editable && this.eventDurationEditable && !this.isAllDayEvent(e) && !this.loading;
  }

  /* ═══════════════════════════════════════════
     Pointer-Based Drag and Drop (Mouse & Touch)
     ═══════════════════════════════════════════ */

  onEventMouseDown(event: CalendarEvent, sourceDate: Date, view: CalendarView, e: MouseEvent): void {
    if (!this.isDraggable(event) || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.ds-calendar__event-resizer')) return;

    this.startPointerDrag(event, sourceDate, view, e.clientX, e.clientY);
  }

  onEventTouchStart(event: CalendarEvent, sourceDate: Date, view: CalendarView, e: TouchEvent): void {
    if (!this.isDraggable(event) || e.touches.length !== 1) return;
    if ((e.target as HTMLElement).closest('.ds-calendar__event-resizer')) return;

    this.startPointerDrag(event, sourceDate, view, e.touches[0].clientX, e.touches[0].clientY);
  }

  private startPointerDrag(event: CalendarEvent, sourceDate: Date, view: CalendarView, startX: number, startY: number): void {
    this.activeDrag = {
      event,
      sourceDate,
      view,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      isDragging: false,
      targetDate: sourceDate,
    };

    this.setupPointerListeners();
  }

  private setupPointerListeners(): void {
    this.cleanupPointerListeners();

    this.pointerMoveListener = (e: MouseEvent | TouchEvent) => {
      if (!this.activeDrag) return;
      const clientX = 'touches' in e ? e.touches[0]?.clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY : (e as MouseEvent).clientY;
      if (clientX == null || clientY == null) return;

      const dist = Math.hypot(clientX - this.activeDrag.startX, clientY - this.activeDrag.startY);
      if (!this.activeDrag.isDragging && dist > 5) {
        this.activeDrag.isDragging = true;
        this.didDragOrResize = true;
        this.closePopover();
      }

      if (this.activeDrag.isDragging) {
        e.preventDefault();
        this.ngZone.run(() => {
          this.activeDrag!.currentX = clientX;
          this.activeDrag!.currentY = clientY;

          const elemBelow = document.elementFromPoint(clientX, clientY);
          if (elemBelow) {
            this.detectDropTarget(elemBelow, clientX, clientY);
          }
          this.cdr.detectChanges();
        });
      }
    };

    this.pointerUpListener = () => {
      this.ngZone.run(() => {
        if (this.activeDrag) {
          if (this.activeDrag.isDragging && this.activeDrag.targetDate) {
            this.executeDrop(this.activeDrag);
          }
        }

        this.cleanupPointerListeners();
        this.activeDrag = null;
        setTimeout(() => {
          this.didDragOrResize = false;
        }, 100);
        this.cdr.detectChanges();
      });
    };

    window.addEventListener('mousemove', this.pointerMoveListener, { passive: false });
    window.addEventListener('touchmove', this.pointerMoveListener, { passive: false });
    window.addEventListener('mouseup', this.pointerUpListener);
    window.addEventListener('touchend', this.pointerUpListener);
  }

  private detectDropTarget(elem: Element, clientX: number, clientY: number): void {
    if (!this.activeDrag) return;

    // 1. Check for month cell
    const monthCell = elem.closest('.ds-calendar__month-cell') as HTMLElement;
    if (monthCell) {
      const dateStr = monthCell.getAttribute('data-calendar-date');
      if (dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number);
        this.activeDrag.targetDate = new Date(y, m, d);
        this.activeDrag.targetHour = undefined;
        this.activeDrag.targetMinute = undefined;
        return;
      }
    }

    // 2. Check for timegrid column
    const timeCol = elem.closest('.ds-calendar__timegrid-col') as HTMLElement;
    if (timeCol) {
      const dateStr = timeCol.getAttribute('data-calendar-col-date');
      if (dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number);
        const colRect = timeCol.getBoundingClientRect();
        const relativeY = Math.max(0, Math.min(clientY - colRect.top, colRect.height));

        const totalMinutes = (this.dayEndHour - this.dayStartHour) * 60;
        const fraction = relativeY / colRect.height;
        let droppedMinutes = Math.floor(fraction * totalMinutes);
        droppedMinutes = Math.round(droppedMinutes / this.slotDuration) * this.slotDuration;

        this.activeDrag.targetDate = new Date(y, m, d);
        this.activeDrag.targetHour = this.dayStartHour + Math.floor(droppedMinutes / 60);
        this.activeDrag.targetMinute = droppedMinutes % 60;
      }
    }
  }

  private executeDrop(drag: ActiveDragState): void {
    const oldEvent = { ...drag.event };
    const oldStart = this.parseDate(drag.event.start);
    const oldEnd = drag.event.end ? this.parseDate(drag.event.end) : null;
    const durationMs = oldEnd ? oldEnd.getTime() - oldStart.getTime() : 60 * 60 * 1000;

    let newStart: Date;
    let newEnd: Date | undefined;

    if (drag.targetHour != null && drag.targetMinute != null) {
      // Timegrid drop
      newStart = new Date(drag.targetDate!);
      newStart.setHours(drag.targetHour, drag.targetMinute, 0, 0);
      newEnd = new Date(newStart.getTime() + durationMs);
    } else {
      // Month drop (preserving hour/minute)
      const targetMidnight = new Date(drag.targetDate!.getFullYear(), drag.targetDate!.getMonth(), drag.targetDate!.getDate()).getTime();
      const sourceMidnight = new Date(oldStart.getFullYear(), oldStart.getMonth(), oldStart.getDate()).getTime();
      const daysDelta = Math.round((targetMidnight - sourceMidnight) / (24 * 3600 * 1000));
      const msDelta = daysDelta * 24 * 3600 * 1000;

      newStart = new Date(oldStart.getTime() + msDelta);
      newEnd = oldEnd ? new Date(oldEnd.getTime() + msDelta) : undefined;
    }

    const totalMsDelta = newStart.getTime() - oldStart.getTime();
    const daysDelta = Math.round((new Date(newStart).setHours(0, 0, 0, 0) - new Date(oldStart).setHours(0, 0, 0, 0)) / (24 * 3600 * 1000));

    if (totalMsDelta !== 0) {
      const updatedEvent: CalendarEvent = {
        ...drag.event,
        start: newStart,
        end: newEnd,
      };

      this.eventDrop.emit({
        event: updatedEvent,
        oldEvent,
        delta: {
          days: daysDelta,
          milliseconds: totalMsDelta,
        },
      });
    }
  }

  /* ═══════════════════════════════════════════
     TimeGrid Resizing (Top/Bottom Handles)
     ═══════════════════════════════════════════ */

  onResizeHandleMouseDown(event: CalendarEvent, edge: 'start' | 'end', colEl: HTMLElement, e: MouseEvent): void {
    e.stopPropagation();
    e.preventDefault();
    const col = colEl || (e.target as HTMLElement).closest('.ds-calendar__timegrid-col') as HTMLElement;
    this.startResize(event, edge, col, e.clientY);
  }

  onResizeHandleTouchStart(event: CalendarEvent, edge: 'start' | 'end', colEl: HTMLElement, e: TouchEvent): void {
    e.stopPropagation();
    if (e.touches.length === 1) {
      const col = colEl || (e.target as HTMLElement).closest('.ds-calendar__timegrid-col') as HTMLElement;
      this.startResize(event, edge, col, e.touches[0].clientY);
    }
  }

  private startResize(event: CalendarEvent, edge: 'start' | 'end', colEl: HTMLElement, startY: number): void {
    const start = this.parseDate(event.start);
    const end = event.end ? this.parseDate(event.end) : new Date(start.getTime() + 60 * 60 * 1000);

    this.activeResize = {
      event,
      edge,
      startY,
      originalStart: start,
      originalEnd: end,
      currentStart: start,
      currentEnd: end,
      colElement: colEl,
      isResizing: true,
    };
    this.didDragOrResize = true;
    this.closePopover();

    this.setupResizeListeners();
    this.cdr.detectChanges();
  }

  private setupResizeListeners(): void {
    this.cleanupResizeListeners();

    const mouseMove = (e: MouseEvent | TouchEvent) => {
      if (!this.activeResize) return;
      const clientX = 'touches' in e ? e.touches[0]?.clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY : (e as MouseEvent).clientY;
      if (clientY == null) return;

      this.ngZone.run(() => {
        const { colElement, startY, edge, originalStart, originalEnd } = this.activeResize!;
        const rect = colElement ? colElement.getBoundingClientRect() : { height: 400, top: 0 };
        const deltaPx = clientY - startY;

        const totalMinutes = (this.dayEndHour - this.dayStartHour) * 60;
        const deltaMinutesRaw = (deltaPx / rect.height) * totalMinutes;
        const deltaMinutes = Math.round(deltaMinutesRaw / this.slotDuration) * this.slotDuration;
        const deltaMs = deltaMinutes * 60 * 1000;

        const minDurationMs = this.slotDuration * 60 * 1000;

        let newStart = new Date(originalStart);
        let newEnd = new Date(originalEnd);

        if (edge === 'start') {
          const proposedStart = new Date(originalStart.getTime() + deltaMs);
          if (originalEnd.getTime() - proposedStart.getTime() >= minDurationMs) {
            newStart = proposedStart;
          }
        } else {
          const proposedEnd = new Date(originalEnd.getTime() + deltaMs);
          if (proposedEnd.getTime() - originalStart.getTime() >= minDurationMs) {
            newEnd = proposedEnd;
          }
        }

        this.activeResize!.currentStart = newStart;
        this.activeResize!.currentEnd = newEnd;

        // Update active resize event in place for instantaneous live rendering
        this.activeResize!.event = {
          ...this.activeResize!.event,
          start: newStart,
          end: newEnd,
        };

        this.positionedCache.clear();
        this.cdr.detectChanges();
      });
    };

    const mouseUp = () => {
      this.ngZone.run(() => {
        if (this.activeResize) {
          const { event, edge, originalStart, originalEnd, currentStart, currentEnd } = this.activeResize;
          const oldEvent: CalendarEvent = {
            ...event,
            start: originalStart,
            end: originalEnd,
          };

          const updatedEvent: CalendarEvent = {
            ...event,
            start: currentStart,
            end: currentEnd,
          };

          const deltaMs = edge === 'start'
            ? currentStart.getTime() - originalStart.getTime()
            : currentEnd.getTime() - originalEnd.getTime();

          if (deltaMs !== 0) {
            this.eventResize.emit({
              event: updatedEvent,
              oldEvent,
              edge,
              delta: {
                days: 0,
                milliseconds: deltaMs,
              },
            });
          }
        }

        this.cleanupResizeListeners();
        this.activeResize = null;
        setTimeout(() => {
          this.didDragOrResize = false;
        }, 100);
        this.regenerate();
      });
    };

    window.addEventListener('mousemove', mouseMove, { passive: false });
    window.addEventListener('touchmove', mouseMove, { passive: false });
    window.addEventListener('mouseup', mouseUp);
    window.addEventListener('touchend', mouseUp);

    (this as any)._resizeMove = mouseMove;
    (this as any)._resizeUp = mouseUp;
  }

  private cleanupResizeListeners(): void {
    if ((this as any)._resizeMove) {
      window.removeEventListener('mousemove', (this as any)._resizeMove);
      window.removeEventListener('touchmove', (this as any)._resizeMove);
      (this as any)._resizeMove = undefined;
    }
    if ((this as any)._resizeUp) {
      window.removeEventListener('mouseup', (this as any)._resizeUp);
      window.removeEventListener('touchend', (this as any)._resizeUp);
      (this as any)._resizeUp = undefined;
    }
  }

  private cleanupPointerListeners(): void {
    if (this.pointerMoveListener) {
      window.removeEventListener('mousemove', this.pointerMoveListener);
      window.removeEventListener('touchmove', this.pointerMoveListener);
      this.pointerMoveListener = undefined;
    }
    if (this.pointerUpListener) {
      window.removeEventListener('mouseup', this.pointerUpListener);
      window.removeEventListener('touchend', this.pointerUpListener);
      this.pointerUpListener = undefined;
    }
    this.cleanupResizeListeners();
  }

  /* ═══════════════════════════════════════════
     Popover Details Balloon
     ═══════════════════════════════════════════ */

  openEventPopover(event: CalendarEvent, e: MouseEvent): void {
    this.activePopoverEvent = event;

    const calendarEl = this.calendarContainer?.nativeElement;
    const target = (e.currentTarget || e.target) as HTMLElement;
    const rect = target.getBoundingClientRect();
    const popoverWidth = 310;
    const popoverHeight = 220;

    let top = 0;
    let left = 0;

    if (calendarEl) {
      const calRect = calendarEl.getBoundingClientRect();
      // Relative to calendar container
      left = (rect.left - calRect.left) + (rect.width / 2) - (popoverWidth / 2);
      top = (rect.bottom - calRect.top) + 8;

      // Ensure it stays inside horizontal boundaries of the calendar
      if (left < 10) left = 10;
      if (left + popoverWidth > calRect.width - 10) {
        left = calRect.width - popoverWidth - 10;
      }

      // If bottom overflows the calendar height, place it above the event
      if (top + popoverHeight > calRect.height - 10) {
        top = Math.max(10, (rect.top - calRect.top) - popoverHeight - 8);
      }
    } else {
      left = rect.left + rect.width / 2 - popoverWidth / 2;
      top = rect.bottom + 8;
    }

    this.popoverStyle = {
      top: `${top}px`,
      left: `${left}px`,
    };

    this.cdr.detectChanges();
  }

  closePopover(e?: Event): void {
    if (e) e.stopPropagation();
    this.activePopoverEvent = null;
    this.cdr.detectChanges();
  }

  onEditEventFromPopover(e: Event): void {
    e.stopPropagation();
    if (this.activePopoverEvent) {
      const ev = this.activePopoverEvent;
      this.closePopover();
      this.eventEdit.emit(ev);
    }
  }

  formatPopoverDate(event: CalendarEvent): string {
    const start = this.parseDate(event.start);
    const end = event.end ? this.parseDate(event.end) : null;
    const dateStr = `${start.getDate()} de ${this.locale.monthNames[start.getMonth()]}`;

    if (this.isAllDayEvent(event)) {
      return `${dateStr} · ${this.locale.allDayLabel}`;
    }
    if (end) {
      return `${dateStr} · ${this.formatTime(start)} – ${this.formatTime(end)}`;
    }
    return `${dateStr} · ${this.formatTime(start)}`;
  }

  /* ═══════════════════════════════════════════
     Navigation
     ═══════════════════════════════════════════ */

  navigatePrev(e: Event): void {
    e.stopPropagation();
    this.closePopover();
    this.navigate(-1);
  }

  navigateNext(e: Event): void {
    e.stopPropagation();
    this.closePopover();
    this.navigate(1);
  }

  navigateToday(e: Event): void {
    e.stopPropagation();
    this.closePopover();
    this.currentDate = new Date();
    this.dateChange.emit(this.currentDate);
    this.scrolledToNow = false;
    this.regenerate();
  }

  private navigate(direction: number): void {
    const d = new Date(this.currentDate);
    switch (this.currentView) {
      case 'month':
        d.setMonth(d.getMonth() + direction);
        break;
      case 'week':
        d.setDate(d.getDate() + 7 * direction);
        break;
      case 'day':
      case 'list':
        d.setDate(d.getDate() + (this.currentView === 'list' ? 7 : 1) * direction);
        break;
    }
    this.currentDate = d;
    this.dateChange.emit(d);
    this.scrolledToNow = false;
    this.regenerate();
  }

  setView(v: CalendarView, e: Event): void {
    e.stopPropagation();
    if (this.currentView === v) return;
    this.closePopover();
    this.currentView = v;
    this.viewChange.emit(v);
    this.scrolledToNow = false;
    this.regenerate();
  }

  /* ═══════════════════════════════════════════
     Event handlers
     ═══════════════════════════════════════════ */

  onEventClick(event: CalendarEvent, e: MouseEvent): void {
    e.stopPropagation();
    if (this.didDragOrResize) return;
    this.openEventPopover(event, e);
    this.eventClick.emit(event);
  }

  onCellClick(date: Date, e: Event): void {
    e.stopPropagation();
    if (this.didDragOrResize) return;
    this.closePopover();
    this.dateClick.emit({ date, allDay: true });
  }

  onSlotClick(date: Date, slot: TimeSlot, e: Event): void {
    e.stopPropagation();
    if (this.didDragOrResize) return;
    this.closePopover();
    const d = new Date(date);
    d.setHours(slot.hour, slot.minute, 0, 0);
    this.dateClick.emit({ date: d, allDay: false });
  }

  /* ═══════════════════════════════════════════
     Regeneration
     ═══════════════════════════════════════════ */

  private regenerate(): void {
    this.today = new Date();
    this.positionedCache.clear();
    this.allDayCache.clear();
    this.updateTitle();
    this.generateWeekdayHeaders();

    switch (this.currentView) {
      case 'month':
        this.generateMonth();
        break;
      case 'week':
      case 'day':
        this.generateTimeGrid();
        this.scheduleScrollToNow();
        break;
      case 'list':
        this.generateList();
        break;
    }

    this.updateNowIndicator();
    this.cdr.markForCheck();
  }

  /* ═══════════════════════════════════════════
     Title
     ═══════════════════════════════════════════ */

  private updateTitle(): void {
    const d = this.currentDate;
    switch (this.currentView) {
      case 'month':
        this.titleText = `${this.locale.monthNames[d.getMonth()]} ${d.getFullYear()}`;
        break;
      case 'week': {
        const start = this.getStartOfWeek(d);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        if (start.getMonth() === end.getMonth()) {
          this.titleText = `${start.getDate()} – ${end.getDate()} ${this.locale.monthNamesShort[start.getMonth()]} ${start.getFullYear()}`;
        } else {
          this.titleText = `${start.getDate()} ${this.locale.monthNamesShort[start.getMonth()]} – ${end.getDate()} ${this.locale.monthNamesShort[end.getMonth()]} ${end.getFullYear()}`;
        }
        break;
      }
      case 'day':
        this.titleText = `${d.getDate()} ${this.locale.monthNames[d.getMonth()]} ${d.getFullYear()}`;
        break;
      case 'list': {
        const ls = this.getStartOfWeek(d);
        const le = new Date(ls);
        le.setDate(le.getDate() + 6);
        this.titleText = `${ls.getDate()} ${this.locale.monthNamesShort[ls.getMonth()]} – ${le.getDate()} ${this.locale.monthNamesShort[le.getMonth()]} ${le.getFullYear()}`;
        break;
      }
    }
  }

  private generateWeekdayHeaders(): void {
    this.weekdayHeaders = Array.from(
      { length: 7 },
      (_, i) => this.locale.dayNamesShort[(this.locale.firstDayOfWeek + i) % 7],
    );
  }

  private buildViewOptions(): void {
    this.viewOptions = [
      { key: 'month', label: this.locale === CALENDAR_LOCALE_EN ? 'Month' : 'Mês' },
      { key: 'week', label: this.locale === CALENDAR_LOCALE_EN ? 'Week' : 'Semana' },
      { key: 'day', label: this.locale === CALENDAR_LOCALE_EN ? 'Day' : 'Dia' },
      { key: 'list', label: this.locale === CALENDAR_LOCALE_EN ? 'List' : 'Lista' },
    ];
  }

  /* ═══════════════════════════════════════════
     Month Generation
     ═══════════════════════════════════════════ */

  private generateMonth(): void {
    const d = this.currentDate;
    const year = d.getFullYear();
    const month = d.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const offset = (first.getDay() - this.locale.firstDayOfWeek + 7) % 7;
    const totalCells = Math.ceil((offset + last.getDate()) / 7) * 7;

    const cells: MonthCell[] = [];
    const prevLast = new Date(year, month, 0).getDate();

    for (let i = offset - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevLast - i);
      cells.push(this.mkMonthCell(date, prevLast - i, false));
    }
    for (let i = 1; i <= last.getDate(); i++) {
      cells.push(this.mkMonthCell(new Date(year, month, i), i, true));
    }
    for (let i = 1; cells.length < totalCells; i++) {
      cells.push(this.mkMonthCell(new Date(year, month + 1, i), i, false));
    }

    this.monthWeeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      this.monthWeeks.push(cells.slice(i, i + 7));
    }
  }

  private mkMonthCell(date: Date, day: number, isCurrentMonth: boolean): MonthCell {
    const events = this.getEventsForDate(date);
    return {
      date,
      day,
      isCurrentMonth,
      isToday: this.isSameDay(date, this.today),
      events,
      overflowCount: Math.max(0, events.length - this.eventMaxStack),
    };
  }

  /* ═══════════════════════════════════════════
     Time Grid Generation (Week / Day)
     ═══════════════════════════════════════════ */

  private generateTimeGrid(): void {
    if (this.currentView === 'week') {
      const start = this.getStartOfWeek(this.currentDate);
      this.gridDays = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        if (!this.weekends && (d.getDay() === 0 || d.getDay() === 6)) continue;
        this.gridDays.push({
          date: d,
          dayNameShort: this.locale.dayNamesShort[d.getDay()],
          dayNameFull: this.locale.dayNames[d.getDay()],
          dayNumber: d.getDate(),
          isToday: this.isSameDay(d, this.today),
        });
      }
    } else {
      const d = this.currentDate;
      this.gridDays = [{
        date: d,
        dayNameShort: this.locale.dayNamesShort[d.getDay()],
        dayNameFull: this.locale.dayNames[d.getDay()],
        dayNumber: d.getDate(),
        isToday: this.isSameDay(d, this.today),
      }];
    }

    this.timeSlots = [];
    const slotsPerHour = 60 / this.slotDuration;
    for (let h = this.dayStartHour; h < this.dayEndHour; h++) {
      for (let s = 0; s < slotsPerHour; s++) {
        const minute = s * this.slotDuration;
        this.timeSlots.push({
          hour: h,
          minute,
          label: `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        });
      }
    }

    this.hasAnyAllDayEvents = this.gridDays.some(day => this.getAllDayEventsForDate(day.date).length > 0);
  }

  /* ═══════════════════════════════════════════
     List Generation
     ═══════════════════════════════════════════ */

  private generateList(): void {
    const start = this.getStartOfWeek(this.currentDate);
    const groups: ListGroup[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const events = this.getEventsForDate(d);
      if (events.length === 0) continue;
      const isToday = this.isSameDay(d, this.today);
      groups.push({
        date: d,
        dayName: this.locale.dayNames[d.getDay()],
        dateLabel: `${d.getDate()} ${this.locale.monthNamesShort[d.getMonth()]} ${d.getFullYear()}`,
        isToday,
        events: events.sort((a, b) => {
          if (this.isAllDayEvent(a) && !this.isAllDayEvent(b)) return -1;
          if (!this.isAllDayEvent(a) && this.isAllDayEvent(b)) return 1;
          return this.parseDate(a.start).getTime() - this.parseDate(b.start).getTime();
        }),
      });
    }

    this.listGroups = groups;
  }

  /* ═══════════════════════════════════════════
     Event Queries
     ═══════════════════════════════════════════ */

  private getEventsForDate(date: Date): CalendarEvent[] {
    return this.events.filter(e => {
      const start = this.parseDate(e.start);
      const end = e.end ? this.parseDate(e.end) : start;
      return this.dateInRange(date, start, end);
    });
  }

  getAllDayEventsForDate(date: Date): CalendarEvent[] {
    const key = this.dateKey(date);
    if (this.allDayCache.has(key)) return this.allDayCache.get(key)!;
    const result = this.events.filter(e => {
      if (!this.isAllDayEvent(e)) return false;
      const start = this.parseDate(e.start);
      const end = e.end ? this.parseDate(e.end) : start;
      return this.dateInRange(date, start, end);
    });
    this.allDayCache.set(key, result);
    return result;
  }

  getPositionedEventsForDate(date: Date): PositionedEvent[] {
    const key = this.dateKey(date);
    if (this.positionedCache.has(key)) return this.positionedCache.get(key)!;

    const totalMinutes = (this.dayEndHour - this.dayStartHour) * 60;
    const dayStartMin = this.dayStartHour * 60;

    const timedEvents = this.events
      .filter(e => {
        if (this.isAllDayEvent(e)) return false;
        const eventToUse = this.activeResize && this.activeResize.event.id === e.id ? this.activeResize.event : e;
        const start = this.parseDate(eventToUse.start);
        return this.isSameDay(start, date);
      })
      .map(e => {
        const eventToUse = this.activeResize && this.activeResize.event.id === e.id ? this.activeResize.event : e;
        const start = this.parseDate(eventToUse.start);
        const end = eventToUse.end ? this.parseDate(eventToUse.end) : new Date(start.getTime() + 60 * 60 * 1000);
        const startMin = Math.max(start.getHours() * 60 + start.getMinutes(), dayStartMin);
        const endMin = Math.min(end.getHours() * 60 + end.getMinutes() || this.dayEndHour * 60, this.dayEndHour * 60);
        return { event: eventToUse, startMin, endMin };
      })
      .sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));

    const columns: number[][] = [];
    const assigned: { event: CalendarEvent; startMin: number; endMin: number; col: number }[] = [];

    for (const te of timedEvents) {
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        const lastEnd = columns[c][columns[c].length - 1];
        if (lastEnd <= te.startMin) {
          columns[c].push(te.endMin);
          assigned.push({ ...te, col: c });
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([te.endMin]);
        assigned.push({ ...te, col: columns.length - 1 });
      }
    }

    const totalCols = columns.length || 1;
    const result: PositionedEvent[] = assigned.map(a => ({
      event: a.event,
      top: ((a.startMin - dayStartMin) / totalMinutes) * 100,
      height: Math.max(((a.endMin - a.startMin) / totalMinutes) * 100, 1.5),
      left: (a.col / totalCols) * 100,
      width: (1 / totalCols) * 100,
    }));

    this.positionedCache.set(key, result);
    return result;
  }

  /* ═══════════════════════════════════════════
     Now Indicator
     ═══════════════════════════════════════════ */

  private startNowTimer(): void {
    this.nowTimerId = setInterval(() => {
      this.today = new Date();
      this.updateNowIndicator();
      this.cdr.markForCheck();
    }, 60_000);
  }

  private updateNowIndicator(): void {
    if (!this.nowIndicator || (this.currentView !== 'week' && this.currentView !== 'day')) {
      this.nowIndicatorTop = -1;
      return;
    }
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const dayStartMin = this.dayStartHour * 60;
    const dayEndMin = this.dayEndHour * 60;
    if (nowMin < dayStartMin || nowMin > dayEndMin) {
      this.nowIndicatorTop = -1;
      return;
    }
    this.nowIndicatorTop = ((nowMin - dayStartMin) / (dayEndMin - dayStartMin)) * 100;
  }

  private scheduleScrollToNow(): void {
    if (this.scrolledToNow) return;
    setTimeout(() => {
      if (this.timegridBody?.nativeElement) {
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const dayStartMin = this.dayStartHour * 60;
        const dayEndMin = this.dayEndHour * 60;
        const totalMinutes = dayEndMin - dayStartMin;
        const fraction = Math.max(0, (nowMin - dayStartMin - 60) / totalMinutes);
        this.timegridBody.nativeElement.scrollTop = fraction * this.timegridBody.nativeElement.scrollHeight;
        this.scrolledToNow = true;
      }
    }, 50);
  }

  /* ═══════════════════════════════════════════
     Helpers
     ═══════════════════════════════════════════ */

  parseDate(value: Date | string | null | undefined): Date {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  isAllDayEvent(e: CalendarEvent): boolean {
    if (e.allDay === true) return true;
    if (e.allDay === false) return false;
    const start = this.parseDate(e.start);
    return start.getHours() === 0 && start.getMinutes() === 0;
  }

  formatTime(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  formatHourMinute(hour: number, minute: number): string {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  formatDateShort(d: Date): string {
    return `${d.getDate()} ${this.locale.monthNamesShort[d.getMonth()]}`;
  }

  formatEventTime(event: CalendarEvent): string {
    const eventToUse = this.activeResize && this.activeResize.event.id === event.id ? this.activeResize.event : event;
    const start = this.parseDate(eventToUse.start);
    const end = eventToUse.end ? this.parseDate(eventToUse.end) : null;
    if (end) {
      return `${this.formatTime(start)} – ${this.formatTime(end)}`;
    }
    return this.formatTime(start);
  }

  getEventColor(e?: CalendarEvent | null): string {
    return e?.color || this.defaultEventColor;
  }

  getEventTextColor(e: CalendarEvent): string {
    if (e.textColor) return e.textColor;
    const color = this.getEventColor(e);
    if (color && color.startsWith('#')) {
      const hex = color.replace('#', '');
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const yiq = (r * 299 + g * 587 + b * 114) / 1000;
        return yiq >= 160 ? '#0f172a' : '#ffffff';
      }
    }
    return '#ffffff';
  }

  isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  private dateInRange(target: Date, start: Date, end: Date): boolean {
    const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return t >= s && t <= e;
  }

  dateKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  private getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day - this.locale.firstDayOfWeek + 7) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /* ── TrackBy functions ── */
  trackByIndex(index: number): number { return index; }
  trackByCellDate(_: number, cell: MonthCell): number { return cell.date.getTime(); }
  trackByEventId(_: number, e: CalendarEvent): string { return e.id; }
  trackByGridDay(_: number, d: GridDay): number { return d.date.getTime(); }
  trackBySlot(_: number, s: TimeSlot): string { return `${s.hour}:${s.minute}`; }
  trackByPosEvent(_: number, pe: PositionedEvent): string { return pe.event.id; }
  trackByGroupDate(_: number, g: ListGroup): number { return g.date.getTime(); }
}
