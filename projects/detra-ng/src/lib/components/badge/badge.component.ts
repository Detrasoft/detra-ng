import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ds-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <span class="ds-badge" [style.--badge-color]="color" [style.--badge-text]="textColor">
      <i [class]="icon" *ngIf="icon"></i>
      <span *ngIf="label" class="ds-badge__label">{{ label }}</span>
      <ng-content></ng-content>
    </span>
  `,
  styleUrl: './badge.component.css'
})
export class BadgeComponent {
  @Input() color: string = '#0066ff';
  @Input() label?: string;
  @Input() icon?: string;
  
  get textColor(): string {
    return this.color;
  }
}
