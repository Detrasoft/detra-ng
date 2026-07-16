import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/* ═══════════════════════════════════════════
   TreeNode — Public interface
   ═══════════════════════════════════════════ */

export interface TreeNode {
  /** Display label */
  label: string;
  /** Arbitrary payload attached to this node */
  data?: any;
  /** CSS icon class (e.g. 'fas fa-key') */
  icon?: string;
  /** Child nodes */
  children?: TreeNode[];
  /** Whether this node can be selected (default true) */
  selectable?: boolean;
  /** Unique key to identify this node in the selection array */
  key?: string;
  /** Internal — managed by the component */
  expanded?: boolean;
}

/* ═══════════════════════════════════════════
   Tree Component
   ═══════════════════════════════════════════ */

@Component({
  selector: 'ds-tree',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './tree.component.html',
  styleUrl: './tree.component.css',
})
export class TreeComponent {
  /* ── Inputs ── */

  /** The hierarchical data to display */
  @Input() value: TreeNode[] = [];

  /** Currently selected nodes (two-way bound) */
  @Input() selection: TreeNode[] = [];

  /** Selection mode — 'checkbox' or 'single' */
  @Input() selectionMode: 'checkbox' | 'single' = 'checkbox';

  /** Filter text to highlight matching nodes */
  @Input() filterText = '';

  /* ── Outputs ── */

  @Output() selectionChange = new EventEmitter<TreeNode[]>();

  /* ── Template ref for recursion ── */
  @ViewChild('nodeTemplate', { static: true })
  nodeTemplate!: TemplateRef<any>;

  /* ══════════════════════════════════════════
     Expand / Collapse
     ══════════════════════════════════════════ */

  toggleExpand(node: TreeNode, event: Event): void {
    event.stopPropagation();
    node.expanded = !node.expanded;
  }

  expandAll(): void {
    this.setExpandedRecursive(this.value, true);
  }

  collapseAll(): void {
    this.setExpandedRecursive(this.value, false);
  }

  private setExpandedRecursive(nodes: TreeNode[], expanded: boolean): void {
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        node.expanded = expanded;
        this.setExpandedRecursive(node.children, expanded);
      }
    }
  }

  /* ══════════════════════════════════════════
     Selection — Checkbox Mode
     ══════════════════════════════════════════ */

  isSelected(node: TreeNode): boolean {
    if (!node.key) return false;
    return this.selection.some((s) => s.key === node.key);
  }

  /**
   * Returns 'checked', 'indeterminate', or 'unchecked' for a given node.
   * Leaf selectable nodes: checked / unchecked.
   * Branch (non-selectable) nodes: derived from children.
   */
  getCheckState(node: TreeNode): 'checked' | 'indeterminate' | 'unchecked' {
    if (node.selectable !== false && node.key) {
      return this.isSelected(node) ? 'checked' : 'unchecked';
    }

    // Non-selectable branch — derive from selectable descendants
    const leaves = this.collectSelectableDescendants(node);
    if (leaves.length === 0) return 'unchecked';

    const selectedCount = leaves.filter((l) =>
      this.selection.some((s) => s.key === l.key),
    ).length;

    if (selectedCount === 0) return 'unchecked';
    if (selectedCount === leaves.length) return 'checked';
    return 'indeterminate';
  }

  /**
   * Toggles checkbox on a node — cascades to selectable descendants.
   */
  onCheckboxToggle(node: TreeNode, event: Event): void {
    event.stopPropagation();

    if (node.selectable !== false && node.key) {
      // Leaf selectable node
      this.toggleSingleNode(node);
    } else {
      // Branch — toggle all selectable descendants
      const leaves = this.collectSelectableDescendants(node);
      const allSelected = leaves.every((l) =>
        this.selection.some((s) => s.key === l.key),
      );

      if (allSelected) {
        // Deselect all
        const keysToRemove = new Set(leaves.map((l) => l.key));
        this.selection = this.selection.filter(
          (s) => !keysToRemove.has(s.key),
        );
      } else {
        // Select all not yet selected
        const currentKeys = new Set(this.selection.map((s) => s.key));
        const toAdd = leaves.filter((l) => !currentKeys.has(l.key));
        this.selection = [...this.selection, ...toAdd];
      }
    }

    this.selectionChange.emit([...this.selection]);
  }

  private toggleSingleNode(node: TreeNode): void {
    const idx = this.selection.findIndex((s) => s.key === node.key);
    if (idx >= 0) {
      this.selection = this.selection.filter((_, i) => i !== idx);
    } else {
      this.selection = [...this.selection, node];
    }
  }

  private collectSelectableDescendants(node: TreeNode): TreeNode[] {
    const result: TreeNode[] = [];
    this._collectSelectable(node, result);
    return result;
  }

  private _collectSelectable(node: TreeNode, acc: TreeNode[]): void {
    if (node.selectable !== false && node.key) {
      acc.push(node);
    }
    if (node.children) {
      for (const child of node.children) {
        this._collectSelectable(child, acc);
      }
    }
  }

  /* ══════════════════════════════════════════
     Helper — Counts
     ══════════════════════════════════════════ */

  /** Returns selected / total for selectable descendants of a branch node */
  getSelectionCount(node: TreeNode): { selected: number; total: number } {
    const leaves = this.collectSelectableDescendants(node);
    const selected = leaves.filter((l) =>
      this.selection.some((s) => s.key === l.key),
    ).length;
    return { selected, total: leaves.length };
  }

  hasChildren(node: TreeNode): boolean {
    return !!node.children && node.children.length > 0;
  }

  trackByKey(_index: number, node: TreeNode): string {
    return node.key || node.label + _index;
  }
}
