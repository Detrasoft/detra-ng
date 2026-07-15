import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogComponent } from '../dialog/dialog.component';

@Component({
  selector: 'ds-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DialogComponent],
  template: `
    <ds-dialog [isOpen]="isOpen" (onClose)="onCancel()" cardClass="ds-dialog-card">
      <div class="ds-dialog-header">
        <div class="ds-dialog-icon">
          <i [class]="iconClass"></i>
        </div>
        <h3 class="ds-dialog-title">{{ title }}</h3>
      </div>

      <div class="ds-dialog-body">
        <p class="ds-dialog-message">{{ message }}</p>
        <p *ngIf="hint" class="ds-dialog-hint">{{ hint }}</p>
      </div>

      <div class="ds-dialog-footer">
        <button
          class="ds-dialog-btn ds-dialog-btn--cancel"
          (click)="onCancel()"
          [disabled]="loading"
        >
          {{ cancelText }}
        </button>
        <button
          class="ds-dialog-btn ds-dialog-btn--confirm"
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
