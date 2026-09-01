import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  OnChanges,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  forwardRef,
} from '@angular/core';
import { TabbarComponent } from './tabbar.component';

/**
 * Represents a single tab panel inside a `<ds-tabbar>`.
 *
 * Usage:
 * ```html
 * <ds-tab id="personal" header="Dados Pessoais" icon="fa-solid fa-user" [badge]="3">
 *   <p>Content here...</p>
 * </ds-tab>
 * ```
 */
@Component({
  selector: 'ds-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template #content>
      <ng-content></ng-content>
    </ng-template>
  `,
})
export class TabComponent implements OnChanges {
  private readonly tabbar = inject(forwardRef(() => TabbarComponent), { optional: true });

  /** Unique identifier for this tab. */
  @Input({ required: true }) id!: string;

  /** Label displayed in the tab bar. */
  @Input({ required: true }) header!: string;

  /** Icon CSS class (e.g. 'fa-solid fa-user'). */
  @Input() icon = '';

  /** Optional numeric badge shown on the tab button. */
  @Input() badge: number | null = null;

  @ViewChild('content', { static: true }) contentTemplate!: TemplateRef<void>;

  ngOnChanges(changes: SimpleChanges): void {
    if (this.tabbar) {
      this.tabbar.markForCheck();
    }
  }
}
