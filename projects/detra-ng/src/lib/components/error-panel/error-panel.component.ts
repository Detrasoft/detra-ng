import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ApiFieldError {
  fieldName: string;
  message: string;
}

export interface ApiValidationError {
  detail: string;
  title: string;
  status: number;
  errors: ApiFieldError[];
  path?: string;
  timestamp?: string;
}

@Component({
  selector: 'ds-error-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './error-panel.component.html',
  styleUrl: './error-panel.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class ErrorPanelComponent implements OnChanges, OnDestroy {
  private readonly el = inject(ElementRef);

  @Input() error: ApiValidationError | null = null;
  @Output() dismissed = new EventEmitter<void>();

  private movedToBody = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['error']) {
      if (this.error) {
        this.appendToBody();
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    this.removeFromBody();
  }

  /** Group errors by their entity prefix (e.g., "addresses[0]" → "Endereços") */
  get groupedErrors(): { label: string; icon: string; errors: ApiFieldError[] }[] {
    if (!this.error?.errors?.length) return [];

    const groups = new Map<string, ApiFieldError[]>();

    for (const err of this.error.errors) {
      const prefix = this.extractPrefix(err.fieldName);
      if (!groups.has(prefix)) groups.set(prefix, []);
      groups.get(prefix)!.push(err);
    }

    return Array.from(groups.entries()).map(([key, errors]) => ({
      label: this.humanizePrefix(key),
      icon: this.getIconForPrefix(key),
      errors,
    }));
  }

  get errorCount(): number {
    return this.error?.errors?.length ?? 0;
  }

  dismiss(): void {
    this.dismissed.emit();
  }

  private appendToBody(): void {
    if (!this.movedToBody) {
      document.body.appendChild(this.el.nativeElement);
      this.movedToBody = true;
    }
  }

  private removeFromBody(): void {
    if (this.movedToBody) {
      try {
        document.body.removeChild(this.el.nativeElement);
      } catch {
        /* already removed */
      }
      this.movedToBody = false;
    }
  }

  private extractPrefix(fieldName: string): string {
    const match = fieldName.match(/^([a-zA-Z]+)/);
    return match ? match[1] : 'other';
  }

  private humanizePrefix(prefix: string): string {
    const map: Record<string, string> = {
      addresses: 'Endereços',
      contacts: 'Contatos',
      documents: 'Documentos',
      emergencyContacts: 'Contatos de Emergência',
      insurances: 'Convênios',
      allergies: 'Alergias',
      medicationHistories: 'Medicações',
      displayName: 'Dados Pessoais',
      dateOfBirth: 'Dados Pessoais',
      gender: 'Dados Pessoais',
      bloodType: 'Perfil Clínico',
    };
    return map[prefix] || this.camelToTitle(prefix);
  }

  private getIconForPrefix(prefix: string): string {
    const map: Record<string, string> = {
      addresses: 'fa-solid fa-location-dot',
      contacts: 'fa-solid fa-phone',
      documents: 'fa-solid fa-id-card',
      emergencyContacts: 'fa-solid fa-kit-medical',
      insurances: 'fa-solid fa-shield-halved',
      allergies: 'fa-solid fa-triangle-exclamation',
      medicationHistories: 'fa-solid fa-pills',
      displayName: 'fa-solid fa-user',
      dateOfBirth: 'fa-solid fa-user',
      gender: 'fa-solid fa-user',
      bloodType: 'fa-solid fa-heart-pulse',
    };
    return map[prefix] || 'fa-solid fa-circle-info';
  }

  private camelToTitle(str: string): string {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }
}
