import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  OrgChartMember,
  OrgChartNode,
  OrgChartOrientation,
  OrgChartSelectionMode,
} from './organization-chart.types';

const COLOR_PRESETS = [
  'primary',
  'secondary',
  'success',
  'warning',
  'danger',
  'info',
  'purple',
  'amber',
  'teal',
  'sky',
];

@Component({
  selector: 'ds-organization-chart-node',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './organization-chart-node.component.html',
  styleUrl: './organization-chart.component.css',
})
export class OrganizationChartNodeComponent {
  @Input() node!: OrgChartNode;
  @Input() orientation: OrgChartOrientation = 'vertical';
  @Input() selectionMode: OrgChartSelectionMode = null;
  @Input() selection: OrgChartNode | OrgChartNode[] | null = null;
  @Input() collapsible = true;
  @Input() nodeTemplate?: TemplateRef<any>;

  @Output() nodeSelect = new EventEmitter<OrgChartNode>();
  @Output() nodeUnselect = new EventEmitter<OrgChartNode>();
  @Output() nodeExpand = new EventEmitter<OrgChartNode>();
  @Output() nodeCollapse = new EventEmitter<OrgChartNode>();
  @Output() selectionChange = new EventEmitter<OrgChartNode | OrgChartNode[] | null>();
  @Output() nodeMoveUp = new EventEmitter<OrgChartNode>();
  @Output() nodeMoveDown = new EventEmitter<OrgChartNode>();

  onMoveUp(event: MouseEvent | Event): void {
    event.stopPropagation();
    this.nodeMoveUp.emit(this.node);
  }

  onMoveDown(event: MouseEvent | Event): void {
    event.stopPropagation();
    this.nodeMoveDown.emit(this.node);
  }

  onMemberMoveUp(member: OrgChartMember, event: MouseEvent | Event): void {
    event.stopPropagation();
    if (member.data) {
      this.nodeMoveUp.emit({ id: member.data.id, data: member.data } as OrgChartNode);
    }
  }

  onMemberMoveDown(member: OrgChartMember, event: MouseEvent | Event): void {
    event.stopPropagation();
    if (member.data) {
      this.nodeMoveDown.emit({ id: member.data.id, data: member.data } as OrgChartNode);
    }
  }

  /* ── Estado derivado ── */

  get isVertical(): boolean {
    return this.orientation !== 'horizontal';
  }

  get isExpanded(): boolean {
    return this.node.expanded !== false;
  }

  get hasChildren(): boolean {
    return !!this.node.children && this.node.children.length > 0;
  }

  get childCount(): number {
    return this.node.children ? this.node.children.length : 0;
  }

  /** Total de descendentes na subárvore, usado no badge de nó colapsado. */
  get descendantCount(): number {
    return this.countDescendants(this.node);
  }

  private countDescendants(node: OrgChartNode): number {
    if (!node.children || node.children.length === 0) return 0;
    return node.children.reduce(
      (total, child) => total + 1 + this.countDescendants(child),
      0
    );
  }

  get displayTitle(): string {
    return this.node.title || this.node.label || '';
  }

  get nodeLink(): string | null {
    const raw = this.node.link || this.node.data?.link;
    if (!raw || typeof raw !== 'string' || raw.trim() === '') return null;
    let url = raw.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    return url;
  }

  getMemberLink(member: OrgChartMember): string | null {
    const raw = member.link || member.data?.link;
    if (!raw || typeof raw !== 'string' || raw.trim() === '') return null;
    let url = raw.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    return url;
  }

  get isDepartment(): boolean {
    return this.node.nodeType === 'department';
  }

  get departmentDisplayLabel(): string {
    return this.node.departmentLabel || this.displayTitle;
  }

  get hasMembers(): boolean {
    return this.isDepartment && !!this.node.members && this.node.members.length > 0;
  }

  get isSelectable(): boolean {
    return !!this.selectionMode && this.node.selectable !== false;
  }

  get toggleLabel(): string {
    return this.isExpanded ? 'Colapsar' : 'Expandir';
  }

  get isSelected(): boolean {
    if (!this.selectionMode || !this.selection) return false;

    if (Array.isArray(this.selection)) {
      return this.selection.some((s) => this.isSameNode(s, this.node));
    }
    return this.isSameNode(this.selection, this.node);
  }

  /**
   * Classes de cor e customização do card.
   * Concentradas em um único binding porque combinar `class` estático,
   * `[class]` e `[ngClass]` no mesmo elemento faz um sobrescrever o outro.
   */
  get cardClasses(): string[] {
    const classes = [this.colorClass];
    if (this.node.styleClass) classes.push(this.node.styleClass);
    return classes;
  }

  private get colorClass(): string {
    const color = this.node.color;
    if (!color) return 'ds-org-color-primary';
    if (COLOR_PRESETS.includes(color.toLowerCase())) {
      return `ds-org-color-${color.toLowerCase()}`;
    }
    return 'ds-org-color-custom';
  }

  get nodeBgColor(): string | null {
    return this.node.bgColor || this.node.data?.bgColor || null;
  }

  getMemberBgColor(member: OrgChartMember): string | null {
    return member.bgColor || member.data?.bgColor || null;
  }

  /** Variáveis CSS quando node.color é hex/rgb/hsl em vez de preset, ou se houver bgColor customizado. */
  get customColorStyles(): { [key: string]: string } | null {
    const color = this.node.color;
    const bgColor = this.nodeBgColor;
    const styles: { [key: string]: string } = {};

    if (bgColor) {
      styles['background-color'] = bgColor;
    }

    if (color) {
      const isRawColor =
        color.startsWith('#') || color.startsWith('rgb') || color.startsWith('hsl');
      if (isRawColor) {
        styles['--ds-node-color'] = color;
        const rgb = this.toRgbTriplet(color);
        if (rgb) styles['--ds-node-color-rgb'] = rgb;
      }
    }

    return Object.keys(styles).length > 0 ? styles : null;
  }

  /**
   * Converte hex (#rgb ou #rrggbb) em "r, g, b" para uso com rgba().
   * Cores rgb()/hsl() já vêm prontas do autor e dispensam conversão.
   */
  private toRgbTriplet(color: string): string | null {
    if (!color.startsWith('#')) return null;

    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (hex.length !== 6 || !/^[0-9a-f]{6}$/i.test(hex)) return null;

    const value = parseInt(hex, 16);
    // eslint-disable-next-line no-bitwise
    return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
  }

  trackByNode = (index: number, node: OrgChartNode): string | number =>
    node.id ?? index;

  trackByMember = (index: number, _member: OrgChartMember): number => index;

  getMemberColorClass(member: OrgChartMember): string {
    const color = member.color;
    if (!color) return 'ds-org-color-primary';
    if (COLOR_PRESETS.includes(color.toLowerCase())) {
      return `ds-org-color-${color.toLowerCase()}`;
    }
    return 'ds-org-color-custom';
  }

  getMemberCustomColorStyles(member: OrgChartMember): { [key: string]: string } | null {
    const color = member.color;
    const bgColor = this.getMemberBgColor(member);
    const styles: { [key: string]: string } = {};

    if (bgColor) {
      styles['background-color'] = bgColor;
    }

    if (color) {
      const isRawColor =
        color.startsWith('#') || color.startsWith('rgb') || color.startsWith('hsl');
      if (isRawColor) {
        styles['--ds-node-color'] = color;
        const rgb = this.toRgbTriplet(color);
        if (rgb) styles['--ds-node-color-rgb'] = rgb;
      }
    }

    return Object.keys(styles).length > 0 ? styles : null;
  }

  /* ── Interação ── */

  onNodeClick(event: MouseEvent): void {
    if (!this.isSelectable) return;
    event.stopPropagation();
    this.applySelection();
  }

  onNodeKeydown(event: KeyboardEvent): void {
    if (!this.isSelectable) return;
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;

    event.preventDefault();
    event.stopPropagation();
    this.applySelection();
  }

  private applySelection(): void {
    const selected = this.isSelected;

    if (this.selectionMode === 'single') {
      if (selected) {
        this.selectionChange.emit(null);
        this.nodeUnselect.emit(this.node);
      } else {
        this.selectionChange.emit(this.node);
        this.nodeSelect.emit(this.node);
      }
      return;
    }

    if (this.selectionMode === 'multiple') {
      const current = Array.isArray(this.selection)
        ? [...this.selection]
        : this.selection
        ? [this.selection]
        : [];

      if (selected) {
        this.selectionChange.emit(current.filter((s) => !this.isSameNode(s, this.node)));
        this.nodeUnselect.emit(this.node);
      } else {
        this.selectionChange.emit([...current, this.node]);
        this.nodeSelect.emit(this.node);
      }
    }
  }

  onMemberClick(member: OrgChartMember, event: MouseEvent): void {
    if (!this.isSelectable) return;
    event.stopPropagation();
    this.applyMemberSelection(member);
  }

  onMemberKeydown(member: OrgChartMember, event: KeyboardEvent): void {
    if (!this.isSelectable) return;
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
    event.preventDefault();
    event.stopPropagation();
    this.applyMemberSelection(member);
  }

  isMemberSelected(member: OrgChartMember): boolean {
    if (!this.selectionMode || !this.selection) return false;
    const memberNode = this.toMemberNode(member);

    if (Array.isArray(this.selection)) {
      return this.selection.some((s) => this.isSameNode(s, memberNode));
    }
    return this.isSameNode(this.selection, memberNode);
  }

  private toMemberNode(member: OrgChartMember): OrgChartNode {
    return {
      id: member.data?.id ?? (member as any).id ?? member.title,
      title: member.title,
      subtitle: member.subtitle,
      description: member.description,
      icon: member.icon,
      avatar: member.avatar,
      color: member.color,
      bgColor: member.bgColor,
      data: member.data,
      selectable: true,
    };
  }

  private applyMemberSelection(member: OrgChartMember): void {
    const memberNode = this.toMemberNode(member);
    const selected = this.isMemberSelected(member);

    if (this.selectionMode === 'single') {
      if (selected) {
        this.selectionChange.emit(null);
        this.nodeUnselect.emit(memberNode);
      } else {
        this.selectionChange.emit(memberNode);
        this.nodeSelect.emit(memberNode);
      }
      return;
    }

    if (this.selectionMode === 'multiple') {
      const current = Array.isArray(this.selection)
        ? [...this.selection]
        : this.selection
        ? [this.selection]
        : [];

      if (selected) {
        this.selectionChange.emit(current.filter((s) => !this.isSameNode(s, memberNode)));
        this.nodeUnselect.emit(memberNode);
      } else {
        this.selectionChange.emit([...current, memberNode]);
        this.nodeSelect.emit(memberNode);
      }
    }
  }

  toggleExpand(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.collapsible || !this.hasChildren) return;

    this.node.expanded = !this.isExpanded;

    if (this.node.expanded) {
      this.nodeExpand.emit(this.node);
    } else {
      this.nodeCollapse.emit(this.node);
    }
  }

  private isSameNode(a: OrgChartNode, b: OrgChartNode): boolean {
    if (a === b) return true;
    if (a.id !== undefined && b.id !== undefined && a.id === b.id) return true;
    if (a.data && b.data && a.data.id !== undefined && b.data.id !== undefined) {
      return a.data.id === b.data.id;
    }
    return false;
  }
}
