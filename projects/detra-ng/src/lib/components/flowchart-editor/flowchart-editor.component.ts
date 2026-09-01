import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type FlowchartNodeType = 'process' | 'terminal' | 'decision' | 'database' | 'subgraph';

export interface FlowchartNode {
  id: string;
  type: FlowchartNodeType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  subgraphId?: string;
  colorVariant?: 'default' | 'primary' | 'success' | 'warning' | 'info';
}

export interface FlowchartEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  lineStyle?: 'solid' | 'dashed';
}

export interface FlowchartSubgraph {
  id: string;
  title: string;
}

export interface FlowchartData {
  direction: 'LR' | 'TB';
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  subgraphs: FlowchartSubgraph[];
}

export interface FlowchartResult {
  mermaid: string;
  svg: string;
  data: FlowchartData;
}

@Component({
  selector: 'ds-flowchart-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './flowchart-editor.component.html',
  styleUrls: ['./flowchart-editor.component.css'],
})
export class FlowchartEditorComponent implements OnInit {
  @Input() initialData?: FlowchartData | null = null;
  @Input() title = 'Desenhador de Fluxogramas';

  @Output() save = new EventEmitter<FlowchartResult>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('canvasSvg', { static: false }) canvasSvg?: ElementRef<SVGSVGElement>;

  // ─────────────── Estado do Diagrama ───────────────
  direction = signal<'LR' | 'TB'>('LR');
  nodes = signal<FlowchartNode[]>([]);
  edges = signal<FlowchartEdge[]>([]);
  subgraphs = signal<FlowchartSubgraph[]>([]);

  // ─────────────── Estado de Interação ───────────────
  selectedNodeId = signal<string | null>(null);
  selectedEdgeId = signal<string | null>(null);
  connectingSourceId = signal<string | null>(null);

  // Dragging
  private draggingNodeId: string | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private nodeStartX = 0;
  private nodeStartY = 0;

  // Edição inline de Nó/Aresta
  editingItem = signal<{ type: 'node' | 'edge'; id: string; label: string } | null>(null);

  // ─────────────── Computed ───────────────
  readonly hasSelection = computed(
    () => this.selectedNodeId() !== null || this.selectedEdgeId() !== null
  );

  ngOnInit(): void {
    if (this.initialData) {
      this.direction.set(this.initialData.direction || 'LR');
      this.nodes.set(this.initialData.nodes ? [...this.initialData.nodes] : []);
      this.edges.set(this.initialData.edges ? [...this.initialData.edges] : []);
      this.subgraphs.set(this.initialData.subgraphs ? [...this.initialData.subgraphs] : []);
    } else {
      this.loadTemplate('basic');
    }
  }

  // ─────────────── Ferramentas de Inserção de Nós ───────────────
  addNode(type: FlowchartNodeType): void {
    const id = 'n' + (this.nodes().length + 1) + '_' + Math.random().toString(36).substring(2, 5);
    const count = this.nodes().length;
    // Posição escalonada
    const x = 60 + (count % 4) * 170;
    const y = 80 + Math.floor(count / 4) * 110;

    let defaultLabel = 'Processo';
    let width = 140;
    let height = 50;

    switch (type) {
      case 'terminal':
        defaultLabel = 'Início / Fim';
        width = 130;
        height = 46;
        break;
      case 'decision':
        defaultLabel = 'Decisão?';
        width = 130;
        height = 65;
        break;
      case 'database':
        defaultLabel = 'Banco de Dados';
        width = 140;
        height = 54;
        break;
      case 'subgraph':
        defaultLabel = 'Submódulo';
        width = 180;
        height = 120;
        break;
    }

    const newNode: FlowchartNode = {
      id,
      type,
      label: defaultLabel,
      x,
      y,
      width,
      height,
      colorVariant: type === 'terminal' ? 'success' : type === 'decision' ? 'warning' : 'default',
    };

    this.nodes.update((list) => [...list, newNode]);
    this.selectedNodeId.set(id);
    this.selectedEdgeId.set(null);
  }

  // ─────────────── Seleção e Exclusão ───────────────
  selectNode(id: string, event: MouseEvent): void {
    event.stopPropagation();

    // Se estiver em modo de conexão
    const connectingFrom = this.connectingSourceId();
    if (connectingFrom) {
      if (connectingFrom !== id) {
        this.createEdge(connectingFrom, id);
      }
      this.connectingSourceId.set(null);
      return;
    }

    this.selectedNodeId.set(id);
    this.selectedEdgeId.set(null);
  }

  selectEdge(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedEdgeId.set(id);
    this.selectedNodeId.set(null);
    this.connectingSourceId.set(null);
  }

  deselectAll(): void {
    this.selectedNodeId.set(null);
    this.selectedEdgeId.set(null);
    this.connectingSourceId.set(null);
    this.editingItem.set(null);
  }

  deleteSelected(): void {
    const nodeId = this.selectedNodeId();
    if (nodeId) {
      this.nodes.update((list) => list.filter((n) => n.id !== nodeId));
      this.edges.update((list) => list.filter((e) => e.sourceId !== nodeId && e.targetId !== nodeId));
      this.selectedNodeId.set(null);
      return;
    }

    const edgeId = this.selectedEdgeId();
    if (edgeId) {
      this.edges.update((list) => list.filter((e) => e.id !== edgeId));
      this.selectedEdgeId.set(null);
    }
  }

  // ─────────────── Conexões (Edges) ───────────────
  toggleConnectMode(): void {
    const selected = this.selectedNodeId();
    if (!selected) return;

    if (this.connectingSourceId() === selected) {
      this.connectingSourceId.set(null);
    } else {
      this.connectingSourceId.set(selected);
    }
  }

  private createEdge(sourceId: string, targetId: string, label = ''): void {
    const edgeId = 'e_' + sourceId + '_' + targetId + '_' + Math.random().toString(36).substring(2, 5);
    // Evita duplicatas diretas idênticas
    const exists = this.edges().some((e) => e.sourceId === sourceId && e.targetId === targetId);
    if (exists) return;

    const newEdge: FlowchartEdge = {
      id: edgeId,
      sourceId,
      targetId,
      label,
      lineStyle: 'solid',
    };
    this.edges.update((list) => [...list, newEdge]);
  }

  // ─────────────── Drag and Drop de Nós ───────────────
  onNodeMouseDown(node: FlowchartNode, event: MouseEvent): void {
    if (event.button !== 0) return; // Apenas botão esquerdo
    this.draggingNodeId = node.id;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.nodeStartX = node.x;
    this.nodeStartY = node.y;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.draggingNodeId) return;
      const dx = moveEvent.clientX - this.dragStartX;
      const dy = moveEvent.clientY - this.dragStartY;

      const newX = Math.max(10, Math.round((this.nodeStartX + dx) / 5) * 5);
      const newY = Math.max(10, Math.round((this.nodeStartY + dy) / 5) * 5);

      this.nodes.update((list) =>
        list.map((n) => (n.id === this.draggingNodeId ? { ...n, x: newX, y: newY } : n))
      );
    };

    const onMouseUp = () => {
      this.draggingNodeId = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  // ─────────────── Edição de Rótulos ───────────────
  editNodeLabel(node: FlowchartNode, event: MouseEvent): void {
    event.stopPropagation();
    this.editingItem.set({
      type: 'node',
      id: node.id,
      label: node.label,
    });
  }

  editEdgeLabel(edge: FlowchartEdge, event: MouseEvent): void {
    event.stopPropagation();
    this.editingItem.set({
      type: 'edge',
      id: edge.id,
      label: edge.label || '',
    });
  }

  saveEditingItem(): void {
    const item = this.editingItem();
    if (!item) return;

    if (item.type === 'node') {
      this.nodes.update((list) =>
        list.map((n) => (n.id === item.id ? { ...n, label: item.label.trim() || 'Etapa' } : n))
      );
    } else {
      this.edges.update((list) =>
        list.map((e) => (e.id === item.id ? { ...e, label: item.label.trim() } : e))
      );
    }
    this.editingItem.set(null);
  }

  cancelEditingItem(): void {
    this.editingItem.set(null);
  }

  // ─────────────── Alternar Direção do Fluxo ───────────────
  toggleDirection(): void {
    this.direction.update((d) => (d === 'LR' ? 'TB' : 'LR'));
  }

  // ─────────────── Templates Prontos ───────────────
  loadTemplate(type: 'basic' | 'decision' | 'architecture'): void {
    if (type === 'basic') {
      this.direction.set('LR');
      this.nodes.set([
        { id: 'start', type: 'terminal', label: 'Início', x: 60, y: 150, width: 120, height: 46, colorVariant: 'success' },
        { id: 'step1', type: 'process', label: 'Processar Dados', x: 250, y: 148, width: 140, height: 50, colorVariant: 'primary' },
        { id: 'end', type: 'terminal', label: 'Concluído', x: 460, y: 150, width: 120, height: 46, colorVariant: 'default' },
      ]);
      this.edges.set([
        { id: 'e1', sourceId: 'start', targetId: 'step1' },
        { id: 'e2', sourceId: 'step1', targetId: 'end' },
      ]);
    } else if (type === 'decision') {
      this.direction.set('LR');
      this.nodes.set([
        { id: 'req', type: 'terminal', label: 'Requisição', x: 50, y: 150, width: 120, height: 46, colorVariant: 'info' },
        { id: 'auth', type: 'decision', label: 'Autenticado?', x: 230, y: 140, width: 130, height: 65, colorVariant: 'warning' },
        { id: 'exec', type: 'process', label: 'Executar Ação', x: 440, y: 80, width: 140, height: 50, colorVariant: 'success' },
        { id: 'deny', type: 'process', label: 'Acesso Negado (403)', x: 440, y: 220, width: 150, height: 50, colorVariant: 'default' },
      ]);
      this.edges.set([
        { id: 'e1', sourceId: 'req', targetId: 'auth' },
        { id: 'e2', sourceId: 'auth', targetId: 'exec', label: 'Sim' },
        { id: 'e3', sourceId: 'auth', targetId: 'deny', label: 'Não' },
      ]);
    } else if (type === 'architecture') {
      this.direction.set('LR');
      this.nodes.set([
        { id: 'ui', type: 'process', label: 'Frontend UI (Angular)', x: 50, y: 140, width: 160, height: 50, colorVariant: 'primary' },
        { id: 'gw', type: 'process', label: 'Gateway Server', x: 270, y: 140, width: 140, height: 50, colorVariant: 'info' },
        { id: 'api', type: 'process', label: 'Task API (Spring Boot)', x: 470, y: 80, width: 160, height: 50, colorVariant: 'success' },
        { id: 'ai', type: 'process', label: 'Task AI Agent', x: 470, y: 220, width: 150, height: 50, colorVariant: 'warning' },
        { id: 'db', type: 'database', label: 'PostgreSQL', x: 700, y: 140, width: 130, height: 54, colorVariant: 'default' },
      ]);
      this.edges.set([
        { id: 'e1', sourceId: 'ui', targetId: 'gw', label: 'HTTPS' },
        { id: 'e2', sourceId: 'gw', targetId: 'api' },
        { id: 'e3', sourceId: 'gw', targetId: 'ai' },
        { id: 'e4', sourceId: 'api', targetId: 'db', label: 'JPA' },
        { id: 'e5', sourceId: 'ai', targetId: 'db' },
      ]);
    }
  }

  // ─────────────── Geometria e Cálculo de Setas SVG ───────────────
  getNode(id: string): FlowchartNode | undefined {
    return this.nodes().find((n) => n.id === id);
  }

  getEdgePath(edge: FlowchartEdge): string {
    const source = this.getNode(edge.sourceId);
    const target = this.getNode(edge.targetId);
    if (!source || !target) return '';

    // Centros dos nós
    const scx = source.x + source.width / 2;
    const scy = source.y + source.height / 2;
    const tcx = target.x + target.width / 2;
    const tcy = target.y + target.height / 2;

    const dx = tcx - scx;
    const dy = tcy - scy;

    let sx = scx;
    let sy = scy;
    let tx = tcx;
    let ty = tcy;

    // Conexão horizontal (LR) ou vertical (TB)
    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx > 0) {
        sx = source.x + source.width;
        sy = scy;
        tx = target.x;
        ty = tcy;
      } else {
        sx = source.x;
        sy = scy;
        tx = target.x + target.width;
        ty = tcy;
      }
      const mx = (sx + tx) / 2;
      return `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`;
    } else {
      if (dy > 0) {
        sx = scx;
        sy = source.y + source.height;
        tx = tcx;
        ty = target.y;
      } else {
        sx = scx;
        sy = source.y;
        tx = tcx;
        ty = target.y + target.height;
      }
      const my = (sy + ty) / 2;
      return `M ${sx} ${sy} C ${sx} ${my}, ${tx} ${my}, ${tx} ${ty}`;
    }
  }

  getEdgeMidpoint(edge: FlowchartEdge): { x: number; y: number } {
    const source = this.getNode(edge.sourceId);
    const target = this.getNode(edge.targetId);
    if (!source || !target) return { x: 0, y: 0 };

    const scx = source.x + source.width / 2;
    const scy = source.y + source.height / 2;
    const tcx = target.x + target.width / 2;
    const tcy = target.y + target.height / 2;

    return {
      x: (scx + tcx) / 2,
      y: (scy + tcy) / 2 - 8,
    };
  }

  // ─────────────── Geração de Mermaid e SVG ───────────────
  toMermaid(): string {
    const dir = this.direction();
    let code = `flowchart ${dir}\n`;

    // Nós com seus formatos
    for (const node of this.nodes()) {
      const cleanLabel = (node.label || 'Etapa').replace(/"/g, "'");
      switch (node.type) {
        case 'terminal':
          code += `    ${node.id}(["${cleanLabel}"])\n`;
          break;
        case 'decision':
          code += `    ${node.id}{"${cleanLabel}"}\n`;
          break;
        case 'database':
          code += `    ${node.id}[("${cleanLabel}")]\n`;
          break;
        default:
          code += `    ${node.id}["${cleanLabel}"]\n`;
          break;
      }
    }

    code += '\n';

    // Arestas
    for (const edge of this.edges()) {
      if (edge.label && edge.label.trim()) {
        const cleanLabel = edge.label.replace(/"/g, "'");
        code += `    ${edge.sourceId} -->|"${cleanLabel}"| ${edge.targetId}\n`;
      } else {
        code += `    ${edge.sourceId} --> ${edge.targetId}\n`;
      }
    }

    return code.trim();
  }

  toSvg(): string {
    const nodes = this.nodes();
    if (nodes.length === 0) return '';

    // Calcula dimensões do viewBox
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const n of nodes) {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + n.width > maxX) maxX = n.x + n.width;
      if (n.y + n.height > maxY) maxY = n.y + n.height;
    }

    const padding = 40;
    const viewBoxX = Math.max(0, minX - padding);
    const viewBoxY = Math.max(0, minY - padding);
    const viewBoxW = maxX - minX + padding * 2;
    const viewBoxH = maxY - minY + padding * 2;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" class="detra-flowchart-svg" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}" width="100%" height="100%">`;
    svg += `
      <defs>
        <marker id="detra-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3b82f6"/>
        </marker>
        <filter id="card-shadow" x="-8%" y="-8%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.08"/>
        </filter>
      </defs>
    `;

    // Desenhar Arestas
    for (const edge of this.edges()) {
      const path = this.getEdgePath(edge);
      const mid = this.getEdgeMidpoint(edge);
      svg += `<path d="${path}" fill="none" stroke="#3b82f6" stroke-width="2" marker-end="url(#detra-arrow)"/>`;
      if (edge.label) {
        svg += `
          <g transform="translate(${mid.x}, ${mid.y})">
            <rect x="-35" y="-12" width="70" height="20" rx="4" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
            <text x="0" y="2" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#475569" font-weight="600">${edge.label}</text>
          </g>
        `;
      }
    }

    // Desenhar Nós
    for (const node of nodes) {
      const fill = node.colorVariant === 'primary' ? '#eff6ff' : node.colorVariant === 'success' ? '#f0fdf4' : node.colorVariant === 'warning' ? '#fffbeb' : '#ffffff';
      const stroke = node.colorVariant === 'primary' ? '#3b82f6' : node.colorVariant === 'success' ? '#22c55e' : node.colorVariant === 'warning' ? '#f59e0b' : '#cbd5e1';
      const textColor = '#0f172a';

      svg += `<g transform="translate(${node.x}, ${node.y})" filter="url(#card-shadow)">`;

      if (node.type === 'terminal') {
        svg += `<rect width="${node.width}" height="${node.height}" rx="${node.height / 2}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
      } else if (node.type === 'decision') {
        const hw = node.width / 2;
        const hh = node.height / 2;
        svg += `<polygon points="${hw},0 ${node.width},${hh} ${hw},${node.height} 0,${hh}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
      } else if (node.type === 'database') {
        svg += `<rect width="${node.width}" height="${node.height}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
        svg += `<line x1="0" y1="12" x2="${node.width}" y2="12" stroke="${stroke}" stroke-width="1.5"/>`;
      } else {
        svg += `<rect width="${node.width}" height="${node.height}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
      }

      svg += `<text x="${node.width / 2}" y="${node.height / 2 + 4}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="${textColor}">${node.label}</text>`;
      svg += `</g>`;
    }

    svg += `</svg>`;
    return svg;
  }

  // ─────────────── Ações Finais ───────────────
  onSave(): void {
    const mermaid = this.toMermaid();
    const svg = this.toSvg();
    const data: FlowchartData = {
      direction: this.direction(),
      nodes: this.nodes(),
      edges: this.edges(),
      subgraphs: this.subgraphs(),
    };

    this.save.emit({ mermaid, svg, data });
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
