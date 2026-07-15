import { ContentChild, Directive, Input, TemplateRef } from '@angular/core';

/**
 * Directive to define a column in ListComponent.
 *
 * Usage:
 *   <ds-list-column key="nome" label="Nome">
 *     <ng-template let-value let-row="row">
 *       <strong>{{ value }}</strong>
 *     </ng-template>
 *   </ds-list-column>
 */
@Directive({
  selector: 'ds-list-column',
  standalone: true,
})
export class ListColumnDirective {
  @Input({ required: true }) key!: string;
  @Input() label = '';
  @Input() width = '';
  @Input() align: 'left' | 'center' | 'right' = 'left';

  @ContentChild(TemplateRef) cellTemplate?: TemplateRef<{ $implicit: unknown; row: unknown }>;
}
