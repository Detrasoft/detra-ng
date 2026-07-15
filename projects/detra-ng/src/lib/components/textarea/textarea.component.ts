import { ChangeDetectionStrategy, Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'ds-textarea',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div
      class="ds-textarea-wrapper"
      [class.ds-textarea--error]="error"
      [class.ds-textarea--disabled]="disabled"
    >
      <label *ngIf="label" class="ds-textarea__label" [attr.for]="inputId">
        {{ label }}
        <span *ngIf="required" class="ds-textarea__required">*</span>
      </label>
      <div class="ds-textarea__container">
        <textarea
          [id]="inputId"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [value]="value"
          [rows]="rows"
          class="ds-textarea__field"
          (input)="onInput($event)"
          (blur)="onTouched()"
        ></textarea>
      </div>
      <span *ngIf="error" class="ds-textarea__error">{{ error }}</span>
      <span *ngIf="hint && !error" class="ds-textarea__hint">{{ hint }}</span>
    </div>
  `,
  styleUrl: './textarea.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextareaComponent),
      multi: true,
    },
  ],
})
export class TextareaComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() rows = 4;
  @Input() error = '';
  @Input() hint = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() inputId = `ds-textarea-${Math.random().toString(36).slice(2, 9)}`;

  value = '';

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: string): void {
    const stringValue = value != null ? String(value) : '';
    this.value = stringValue;
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.value = target.value;
    this.onChange(this.value);
  }
}
