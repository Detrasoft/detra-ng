import { ChangeDetectionStrategy, Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'ds-checkbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <label class="ds-checkbox-wrapper" [class.ds-checkbox-wrapper--disabled]="disabled">
      <input
        type="checkbox"
        class="ds-checkbox__input"
        [id]="inputId"
        [checked]="value"
        [disabled]="disabled"
        (change)="onToggle($event)"
        (blur)="onTouched()"
      />
      <span class="ds-checkbox__box">
        <span class="ds-checkbox__check">
          <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 8.5L6.5 12L13 4" />
          </svg>
        </span>
      </span>
      <span *ngIf="label" class="ds-checkbox__label">{{ label }}</span>
    </label>
  `,
  styleUrl: './checkbox.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxComponent),
      multi: true,
    },
  ],
})
export class CheckboxComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() disabled = false;
  @Input() inputId = `ds-checkbox-${Math.random().toString(36).slice(2, 9)}`;

  value = false;

  onChange: (value: boolean) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: boolean): void {
    this.value = !!value;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onToggle(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.checked;
    this.onChange(this.value);
  }
}
