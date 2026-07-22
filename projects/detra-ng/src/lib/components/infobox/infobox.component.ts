import {
  ChangeDetectionStrategy,
  Component,
  Input,
  signal,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type InfoboxColor = 'primary' | 'info' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'ds-infobox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './infobox.component.html',
  styleUrl: './infobox.component.css',
})
export class InfoboxComponent {
  /** Ícone FontAwesome exibido no infobox. Padrão: 'fa-solid fa-circle-info' */
  @Input() icon: string = 'fa-solid fa-circle-info';

  /** Título/Rótulo exibido na pílula recolhida */
  @Input() title: string = 'Ver impacto';

  /** Texto explicativo detalhado exibido ao expandir */
  @Input() body: string = '';

  /** Tema de cor do infobox: 'primary' | 'info' | 'success' | 'warning' | 'danger' */
  @Input() color: InfoboxColor = 'primary';

  /** Indica se o componente pode ser recolhido/expandido pelo usuário. Padrão: true. Se false, permanece sempre aberto. */
  @Input() set collapsible(val: boolean) {
    this._collapsible.set(val);
    if (!val) {
      this.isExpanded.set(true);
    }
  }
  get collapsible(): boolean {
    return this._collapsible();
  }

  /** Permite controlar o estado inicial de expansão */
  @Input() set expanded(val: boolean) {
    this.isExpanded.set(val);
  }

  @Output() expandedChange = new EventEmitter<boolean>();

  readonly _collapsible = signal<boolean>(true);
  readonly isExpanded = signal<boolean>(false);

  toggle(): void {
    if (!this.collapsible) return;
    const next = !this.isExpanded();
    this.isExpanded.set(next);
    this.expandedChange.emit(next);
  }
}
