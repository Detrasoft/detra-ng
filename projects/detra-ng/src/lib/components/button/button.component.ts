import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ds-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [class]="buttonClasses"
      [disabled]="disabled || loading"
      (click)="handleClick($event)"
    >
      <span *ngIf="loading" class="ds-btn__spinner"></span>
      <ng-content></ng-content>
    </button>
  `,
  styleUrl: './button.component.css',
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() fullWidth = false;

  get buttonClasses(): string {
    const classes = ['ds-btn', `ds-btn--${this.variant}`, `ds-btn--${this.size}`];
    if (this.fullWidth) classes.push('ds-btn--full');
    if (this.loading) classes.push('ds-btn--loading');
    return classes.join(' ');
  }

  handleClick(event: Event): void {
    if (this.disabled || this.loading) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
