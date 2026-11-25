import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogComponent } from '../dialog/dialog.component';
import { DS_SKELETON_HOST, DsSkeletonDirective } from '../skeleton/skeleton.directive';

@Component({
  selector: 'ds-confirm-dialog',
  hostDirectives: [DS_SKELETON_HOST],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DialogComponent],
  template: `
    <ds-dialog [isOpen]="isOpen" (onClose)="onCancel()" cardClass="ds-dialog-card">
      <div class="ds-dialog-header" [class.ds-sk]="sk.active()">
        <div class="ds-dialog-icon" data-sk>
          <i [class]="iconClass"></i>
        </div>
        <h3 class="ds-dialog-title" data-sk="text">{{ title }}</h3>
      </div>

      <div class="ds-dialog-body" [class.ds-sk]="sk.active()">
        <p class="ds-dialog-message" data-sk="text">{{ message }}</p>
        <p *ngIf="hint" class="ds-dialog-hint" data-sk="text">{{ hint }}</p>
      </div>

      <div class="ds-dialog-footer" [class.ds-sk]="sk.active()">
        <button
          class="ds-dialog-btn ds-dialog-btn--cancel"
          data-sk
          (click)="onCancel()"
          [disabled]="loading"
        >
          {{ cancelText }}
        </button>
        <button
          class="ds-dialog-btn ds-dialog-btn--confirm"
          data-sk
          (click)="onConfirm()"
          [disabled]="loading"
        >
          <span *ngIf="loading" class="ds-dialog-spinner"></span>
          <span *ngIf="!loading"><i class="fa-solid fa-check"></i></span>
          <span>{{ confirmText }}</span>
        </button>
      </div>
    </ds-dialog>
  `,
  styleUrl: './confirm-dialog.component.css',
})
export class ConfirmDialogComponent {
  /** Estado do skeleton (`[skeleton]`), via host directive. */
  readonly sk = inject(DsSkeletonDirective);

  @Input() isOpen = false;
  @Input() title = 'Confirmar Ação';
  @Input() message = 'Tem certeza de que deseja realizar esta ação?';
  @Input() hint = '';
  @Input() confirmText = 'Confirmar';
  @Input() cancelText = 'Cancelar';
  @Input() loading = false;
  @Input() iconClass = 'fa-solid fa-triangle-exclamation';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onCancel(): void {
    if (this.loading) return;
    this.cancel.emit();
  }

  onConfirm(): void {
    if (this.loading) return;
    this.confirm.emit();
  }
}
