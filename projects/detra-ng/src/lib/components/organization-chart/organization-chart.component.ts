import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  EventEmitter,
  Input,
  Output,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrganizationChartNodeComponent } from './organization-chart-node.component';
import {
  OrgChartNode,
  OrgChartOrientation,
  OrgChartSelectionMode,
} from './organization-chart.types';

@Component({
  selector: 'ds-organization-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, OrganizationChartNodeComponent],
  templateUrl: './organization-chart.component.html',
  styleUrl: './organization-chart.component.css',
})
export class OrganizationChartComponent {
  /** Hierarchical nodes data */
  @Input() value: OrgChartNode[] = [];

  /** Layout orientation: 'vertical' (top-to-bottom) or 'horizontal' (left-to-right) */
  @Input() orientation: OrgChartOrientation = 'vertical';

  /** Selection mode: 'single', 'multiple', or null */
  @Input() selectionMode: OrgChartSelectionMode = null;

  /** Selected node or array of nodes (supports two-way binding [(selection)]) */
  @Input() selection: OrgChartNode | OrgChartNode[] | null = null;

  /** Whether nodes can be expanded / collapsed by user click (default: true) */
  @Input() collapsible = true;

  /** Message shown when there is no data */
  @Input() emptyMessage = 'Nenhum dado para exibir.';

  /** Optional custom template for nodes passed inside <ng-template let-node> */
  @ContentChild(TemplateRef) nodeTemplate?: TemplateRef<any>;

  /* ── Outputs ── */

  /** Emitted when node selection changes */
  @Output() selectionChange = new EventEmitter<OrgChartNode | OrgChartNode[] | null>();

  /** Emitted when a node is selected */
  @Output() nodeSelect = new EventEmitter<OrgChartNode>();

  /** Emitted when a node is unselected */
  @Output() nodeUnselect = new EventEmitter<OrgChartNode>();

  /** Emitted when a node is expanded */
  @Output() nodeExpand = new EventEmitter<OrgChartNode>();

  /** Emitted when a node is collapsed */
  @Output() nodeCollapse = new EventEmitter<OrgChartNode>();

  /** Emitted when a node move up button is clicked */
  @Output() nodeMoveUp = new EventEmitter<OrgChartNode>();

  /** Emitted when a node move down button is clicked */
  @Output() nodeMoveDown = new EventEmitter<OrgChartNode>();

  trackByNode = (index: number, node: OrgChartNode): string | number =>
    node.id ?? index;

  /**
   * Mantém o estado interno alinhado antes de notificar o consumidor,
   * de modo que a seleção continue destacada mesmo sem two-way binding.
   */
  onSelectionChange(selection: OrgChartNode | OrgChartNode[] | null): void {
    this.selection = selection;
    this.selectionChange.emit(selection);
  }
}
