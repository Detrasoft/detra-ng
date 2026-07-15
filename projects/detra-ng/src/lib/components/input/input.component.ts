import { ChangeDetectionStrategy, Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'ds-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div
      class="ds-input-wrapper"
      [class.ds-input--error]="error"
      [class.ds-input--disabled]="disabled"
    >
      <label *ngIf="label" class="ds-input__label" [attr.for]="inputId">
        {{ label }}
        <span *ngIf="required" class="ds-input__required">*</span>
      </label>
      <div class="ds-input__container">
        <input
          [id]="inputId"
          [type]="type"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [value]="value"
          [attr.autocomplete]="autocomplete"
          class="ds-input__field"
          (input)="onInput($event)"
          (blur)="onTouched()"
        />
      </div>
      <span *ngIf="error" class="ds-input__error">{{ error }}</span>
      <span *ngIf="hint && !error" class="ds-input__hint">{{ hint }}</span>
    </div>
  `,
  styleUrl: './input.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
})
export class InputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' = 'text';
  @Input() error = '';
  @Input() hint = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() autocomplete = 'off';
  @Input() inputId = `ds-input-${Math.random().toString(36).slice(2, 9)}`;
  @Input() mask = '';
  @Input() unmask = false;

  value = '';

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: string): void {
    const stringValue = value != null ? String(value) : '';
    this.value = this.mask ? this.applyMask(stringValue) : stringValue;
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
    const target = event.target as HTMLInputElement;
    let val = target.value;

    if (this.mask) {
      const start = target.selectionStart;
      const priorLen = target.value.length;

      val = this.applyMask(val);
      target.value = val;

      if (start !== null && start < priorLen) {
        target.setSelectionRange(start, start);
      }
    }

    this.value = val;
    const emitValue = this.unmask ? this.getUnmasked(val) : val;
    this.onChange(emitValue);
  }

  private applyMask(value: string): string {
    if (!this.mask) return value;

    const raw = value.replace(/[^a-zA-Z0-9]/g, '');
    let masked = '';
    let rawIndex = 0;

    for (let i = 0; i < this.mask.length; i++) {
      if (rawIndex >= raw.length) break;

      const m = this.mask[i];

      if (m === '0' || m === '9') {
        if (/\d/.test(raw[rawIndex])) {
          masked += raw[rawIndex];
          rawIndex++;
        } else {
          while (rawIndex < raw.length && !/\d/.test(raw[rawIndex])) rawIndex++;
          if (rawIndex < raw.length) {
            masked += raw[rawIndex];
            rawIndex++;
          } else break;
        }
      } else if (m === 'A') {
        if (/[a-zA-Z]/.test(raw[rawIndex])) {
          masked += raw[rawIndex];
          rawIndex++;
        } else {
          while (rawIndex < raw.length && !/[a-zA-Z]/.test(raw[rawIndex])) rawIndex++;
          if (rawIndex < raw.length) {
            masked += raw[rawIndex];
            rawIndex++;
          } else break;
        }
      } else if (m === '*') {
        if (/[a-zA-Z0-9]/.test(raw[rawIndex])) {
          masked += raw[rawIndex];
          rawIndex++;
        } else break;
      } else {
        masked += m;
      }
    }

    return masked;
  }

  private getUnmasked(maskedValue: string): string {
    if (!this.mask) return maskedValue;
    let unmasked = '';
    for (let i = 0; i < maskedValue.length && i < this.mask.length; i++) {
      const m = this.mask[i];
      if (m === '0' || m === '9' || m === 'A' || m === '*') {
        unmasked += maskedValue[i];
      }
    }
    return unmasked;
  }
}
