import {
  Component,
  Input,
  forwardRef,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import {
  FlowchartEditorComponent,
  FlowchartData,
  FlowchartNode,
  FlowchartEdge,
  FlowchartResult,
} from '../flowchart-editor/flowchart-editor.component';

let nextId = 0;

@Component({
  selector: 'ds-md-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, FlowchartEditorComponent],
  template: `
    <div
      class="ds-md-editor-wrapper"
      [class.ds-md-editor--error]="error"
      [class.ds-md-editor--disabled]="disabled"
    >
      <label *ngIf="label" class="ds-md-editor__label" [attr.for]="inputId">
        {{ label }}
        <span *ngIf="required" class="ds-md-editor__required">*</span>
      </label>

      <div
        class="editor-container"
        [class.editor-container--disabled]="disabled"
      >
        <!-- Toolbar Visual WYSIWYG -->
        <div class="editor-toolbar" *ngIf="!disabled">
          <!-- Formatação Básica -->
          <div class="toolbar-group">
            <button
              type="button"
              class="toolbar-btn"
              (mousedown)="$event.preventDefault()"
              (click)="exec('bold')"
              title="Negrito (Ctrl+B)"
            >
              <i class="fa-solid fa-bold"></i>
            </button>
            <button
              type="button"
              class="toolbar-btn"
              (mousedown)="$event.preventDefault()"
              (click)="exec('italic')"
              title="Itálico (Ctrl+I)"
            >
              <i class="fa-solid fa-italic"></i>
            </button>
            <button
              type="button"
              class="toolbar-btn"
              (mousedown)="$event.preventDefault()"
              (click)="exec('strikeThrough')"
              title="Tachado"
            >
              <i class="fa-solid fa-strikethrough"></i>
            </button>
            <button
              type="button"
              class="toolbar-btn"
              (mousedown)="$event.preventDefault()"
              (click)="insertInlineCode()"
              title="Código inline"
            >
              <i class="fa-solid fa-code"></i>
            </button>
          </div>

          <div class="toolbar-separator"></div>

          <!-- Títulos / Formatos de Bloco -->
          <div class="toolbar-group">
            <button
              type="button"
              class="toolbar-btn"
              (mousedown)="$event.preventDefault()"
              (click)="setHeading('H1')"
              title="Título 1"
            >
              H1
            </button>
            <button
              type="button"
              class="toolbar-btn"
              (mousedown)="$event.preventDefault()"
              (click)="setHeading('H2')"
              title="Título 2"
            >
              H2
            </button>
            <button
              type="button"
              class="toolbar-btn"
              (mousedown)="$event.preventDefault()"
              (click)="setHeading('H3')"
              title="Título 3"
            >
              H3
            </button>
            <button
              type="button"
              class="toolbar-btn"
              (mousedown)="$event.preventDefault()"
              (click)="setHeading('P')"
              title="Parágrafo normal"
            >
              <i class="fa-solid fa-paragraph"></i>
            </button>
          </div>

          <div class="toolbar-separator"></div>

          <!-- Listas e Checklists -->
          <div class="toolbar-group">
            <button
              type="button"
              class="toolbar-btn"
              (mousedown)="$event.preventDefault()"
              (click)="exec('insertUnorderedList')"
              title="Lista com marcadores"
            >
              <i class="fa-solid fa-list-ul"></i>
            </button>
            <button
              type="button"
              class="toolbar-btn"
              (mousedown)="$event.preventDefault()"
              (click)="exec('insertOrderedList')"
              title="Lista numerada"
            >
              <i class="fa-solid fa-list-ol"></i>
            </button>
            <button
              type="button"
              class="toolbar-btn"
              (mousedown)="$event.preventDefault()"
              (click)="insertChecklist()"
              title="Inserir Checklist"
            >
              <i class="fa-solid fa-square-check"></i>
            </button>
          </div>

          <div class="toolbar-separator"></div>

          <!-- Citações, Blocos e Tabelas -->
          <div class="toolbar-group">
            <button
              type="button"
              class="toolbar-btn"
              (mousedown)="$event.preventDefault()"
              (click)="toggleBlockquote()"
              title="Citação"
            >
              <i class="fa-solid fa-quote-left"></i>
            </button>
            <button
              type="button"
              class="toolbar-btn"
              (mousedown)="$event.preventDefault()"
              (click)="insertCodeBlock()"
              title="Bloco de código"
            >
              <i class="fa-solid fa-file-code"></i>
            </button>
            <button
              type="button"
              class="toolbar-btn"
              (mousedown)="$event.preventDefault()"
              (click)="insertLink()"
              title="Inserir link"
            >
              <i class="fa-solid fa-link"></i>
            </button>
            <button
              type="button"
              class="toolbar-btn"
              (mousedown)="$event.preventDefault()"
              (click)="insertHorizontalRule()"
              title="Linha divisória"
            >
              <i class="fa-solid fa-minus"></i>
            </button>

            <!-- Menu de Tabela -->
            <div class="table-picker-wrapper">
              <button
                type="button"
                class="toolbar-btn"
                (mousedown)="$event.preventDefault()"
                (click)="toggleTableMenu()"
                title="Inserir tabela"
              >
                <i class="fa-solid fa-table"></i>
              </button>
              <div
                class="table-menu-dropdown"
                *ngIf="showTableMenu"
                (mousedown)="$event.preventDefault()"
              >
                <div class="table-grid-picker">
                  <div class="grid-picker-header">Inserir Tabela</div>
                  <div class="grid-picker-box">
                    <div *ngFor="let r of gridRows" class="grid-picker-row">
                      <div
                        *ngFor="let c of gridCols"
                        class="grid-picker-cell"
                        [class.active]="r <= hoverRow && c <= hoverCol"
                        (mouseenter)="onGridHover(r, c)"
                        (click)="onGridSelect(r, c)"
                      ></div>
                    </div>
                  </div>
                  <div class="grid-picker-footer">{{ hoverRow }} x {{ hoverCol }}</div>
                </div>
              </div>
            </div>

            <!-- Botão de Fluxograma / Diagrama Visual -->
            <button
              type="button"
              class="toolbar-btn toolbar-btn--flowchart"
              (mousedown)="$event.preventDefault()"
              (click)="openFlowchartEditor()"
              title="Desenhar Fluxograma / Diagrama"
            >
              <i class="fa-solid fa-diagram-project"></i>
            </button>

            <button
              type="button"
              class="toolbar-btn"
              (mousedown)="$event.preventDefault()"
              (click)="exec('removeFormat')"
              title="Limpar formatação"
            >
              <i class="fa-solid fa-remove-format"></i>
            </button>
          </div>
        </div>

        <!-- Área Editável WYSIWYG (o usuário já vê o resultado final estilizado) -->
        <div
          #editorArea
          [id]="inputId"
          class="editor-area"
          [attr.contenteditable]="!disabled"
          [attr.data-placeholder]="placeholder"
          [style.min-height]="minHeight"
          (input)="onEditorInput()"
          (click)="onEditorClick($event)"
          (blur)="onEditorBlur()"
          (paste)="onEditorPaste($event)"
          (keydown)="onEditorKeydown($event)"
        ></div>

        <!-- Modal do Desenhador de Fluxogramas -->
        <ds-flowchart-editor
          *ngIf="showFlowchartModal"
          [initialData]="currentFlowchartData"
          (save)="onFlowchartSave($event)"
          (cancel)="onFlowchartCancel()"
        ></ds-flowchart-editor>

        <div *ngIf="error" class="editor-error">
          <i class="fa-solid fa-circle-exclamation"></i>
          {{ error }}
        </div>
      </div>
    </div>
  `,
  styleUrl: './md-editor.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MdEditorComponent),
      multi: true,
    },
  ],
})
export class MdEditorComponent implements AfterViewInit, ControlValueAccessor {
  @Input() label?: string;
  @Input() placeholder = 'Escreva sua mensagem...';
  @Input() required = false;
  @Input() disabled = false;
  @Input() error?: string;
  @Input() minHeight = '100px';

  @ViewChild('editorArea') editorArea!: ElementRef<HTMLDivElement>;

  readonly inputId = `ds-md-editor-${++nextId}`;

  // Controle de tabela
  showTableMenu = false;
  hoverRow = 2;
  hoverCol = 2;
  gridRows = [1, 2, 3, 4, 5, 6];
  gridCols = [1, 2, 3, 4, 5, 6];

  // Controle de Fluxograma (Flowchart Designer)
  showFlowchartModal = false;
  currentFlowchartData: FlowchartData | null = null;
  private editingFlowchartTarget: HTMLElement | null = null;

  // Armazena último Markdown emitido para evitar loops de digitação
  private lastMarkdown = '';

  // ControlValueAccessor
  onChange: (val: string) => void = () => {};
  onTouched: () => void = () => {};

  ngAfterViewInit(): void {
    if (this.lastMarkdown && this.editorArea) {
      this.editorArea.nativeElement.innerHTML = this.markdownToHtml(this.lastMarkdown);
    }
  }

  // ─────────────── ControlValueAccessor ───────────────

  writeValue(value: any): void {
    const md = typeof value === 'string' ? value : '';
    if (md === this.lastMarkdown) return;

    this.lastMarkdown = md;
    if (this.editorArea) {
      this.editorArea.nativeElement.innerHTML = this.markdownToHtml(md);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // ─────────────── Eventos de Edição ───────────────

  onEditorInput(): void {
    if (!this.editorArea) return;
    const md = this.htmlToMarkdown(this.editorArea.nativeElement);
    this.lastMarkdown = md;
    this.onChange(md);
  }

  onEditorBlur(): void {
    this.onTouched();
  }

  onEditorPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') || '';
    if (!text) return;

    // Se estiver dentro de um bloco <pre>, cola o texto cru de código
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const pre = this.findParentTag(sel.anchorNode, 'pre');
      if (pre) {
        document.execCommand('insertText', false, text);
        this.onEditorInput();
        return;
      }
    }

    // Converte Markdown colado para HTML formatado visualmente
    const html = this.markdownToHtml(text);

    // Se o editor estiver vazio, define o conteúdo diretamente
    const currentText = this.editorArea?.nativeElement.textContent?.trim() || '';
    if (!currentText && this.editorArea) {
      this.editorArea.nativeElement.innerHTML = html;
    } else {
      this.insertHtmlAtSelection(html);
    }

    // Atualiza o value do modelo imediatamente
    this.onEditorInput();
  }

  // ─────────────── Ações de Fluxograma (Flowchart) ───────────────

  onEditorClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target) return;

    // Botão de editar fluxograma
    const editBtn = target.closest('.btn-edit-flowchart');
    if (editBtn) {
      event.preventDefault();
      event.stopPropagation();
      const card = editBtn.closest('.md-flowchart-card') as HTMLElement;
      if (card) {
        this.openFlowchartEditorFromCard(card);
      }
      return;
    }

    // Botão de remover fluxograma
    const removeBtn = target.closest('.btn-remove-flowchart');
    if (removeBtn) {
      event.preventDefault();
      event.stopPropagation();
      const card = removeBtn.closest('.md-flowchart-card') as HTMLElement;
      if (card) {
        card.remove();
        this.onEditorInput();
      }
      return;
    }

    // Duplo clique no card para reabrir
    const card = target.closest('.md-flowchart-card') as HTMLElement;
    if (card && event.detail === 2) {
      event.preventDefault();
      event.stopPropagation();
      this.openFlowchartEditorFromCard(card);
    }
  }

  openFlowchartEditor(existingData?: FlowchartData | null, targetElement?: HTMLElement | null): void {
    this.currentFlowchartData = existingData || null;
    this.editingFlowchartTarget = targetElement || null;
    this.showFlowchartModal = true;
  }

  openFlowchartEditorFromCard(card: HTMLElement): void {
    const jsonStr = card.getAttribute('data-flowchart-json');
    let data: FlowchartData | null = null;
    if (jsonStr) {
      try {
        data = JSON.parse(decodeURIComponent(jsonStr));
      } catch (e) {}
    } else {
      const codeStr = card.getAttribute('data-flowchart-code');
      if (codeStr) {
        data = this.parseMermaidToFlowchartData(decodeURIComponent(codeStr));
      }
    }

    this.openFlowchartEditor(data, card);
  }

  onFlowchartSave(result: FlowchartResult): void {
    this.showFlowchartModal = false;
    const cardHtml = this.renderMermaidCard(result.mermaid, result.svg, result.data);

    if (this.editingFlowchartTarget) {
      this.editingFlowchartTarget.outerHTML = cardHtml;
      this.editingFlowchartTarget = null;
    } else {
      this.insertHtmlAtSelection(cardHtml);
    }

    this.onEditorInput();
  }

  onFlowchartCancel(): void {
    this.showFlowchartModal = false;
    this.editingFlowchartTarget = null;
  }

  renderMermaidCard(mermaidCode: string, svg: string, data?: FlowchartData): string {
    const encodedData = encodeURIComponent(JSON.stringify(data || null));
    const encodedCode = encodeURIComponent(mermaidCode);
    return `
      <div class="md-flowchart-card" contenteditable="false" data-flowchart-code="${encodedCode}" data-flowchart-json="${encodedData}">
        <div class="md-flowchart-header">
          <span class="md-flowchart-badge"><i class="fa-solid fa-diagram-project"></i> Fluxograma</span>
          <div class="md-flowchart-actions">
            <button type="button" class="btn-card-action btn-edit-flowchart" title="Editar Fluxograma">
              <i class="fa-solid fa-pen"></i> Editar
            </button>
            <button type="button" class="btn-card-action btn-remove-flowchart" title="Remover">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="md-flowchart-body">
          ${svg}
        </div>
      </div>
    `;
  }

  renderQuickSvgFromData(data: FlowchartData): string {
    const nodes = data.nodes || [];
    if (nodes.length === 0) return '';

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

    const padding = 35;
    const viewBoxX = Math.max(0, minX - padding);
    const viewBoxY = Math.max(0, minY - padding);
    const viewBoxW = maxX - minX + padding * 2;
    const viewBoxH = maxY - minY + padding * 2;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" class="detra-flowchart-svg" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}" width="100%" height="auto" style="max-height: 480px; display: block; margin: 0 auto;">`;
    svg += `
      <defs>
        <marker id="card-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--flowchart-line-stroke, #896ff4)"/>
        </marker>
        <filter id="card-node-shadow" x="-8%" y="-8%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.08"/>
        </filter>
      </defs>
    `;

    // Arestas
    for (const edge of data.edges || []) {
      const src = nodes.find((n) => n.id === edge.sourceId);
      const tgt = nodes.find((n) => n.id === edge.targetId);
      if (src && tgt) {
        let sx = src.x + src.width;
        let sy = src.y + src.height / 2;
        let tx = tgt.x;
        let ty = tgt.y + tgt.height / 2;

        const dx = tx - sx;
        let path = '';
        if (dx > 30) {
          const mx = (sx + tx) / 2;
          path = `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`;
        } else {
          const mx = (src.x + src.width / 2 + tgt.x + tgt.width / 2) / 2;
          path = `M ${src.x + src.width / 2} ${src.y + src.height} C ${mx} ${src.y + src.height + 40}, ${mx} ${tgt.y - 40}, ${tgt.x + tgt.width / 2} ${tgt.y}`;
        }

        svg += `<path d="${path}" fill="none" stroke="var(--flowchart-line-stroke, #896ff4)" stroke-width="2" marker-end="url(#card-arrow)"/>`;
        if (edge.label) {
          const midX = (sx + tx) / 2;
          const midY = (sy + ty) / 2 - 4;
          svg += `
            <g transform="translate(${midX}, ${midY})">
              <rect x="-32" y="-10" width="64" height="18" rx="4" fill="var(--flowchart-label-bg, #ffffff)" stroke="var(--detra-flowchart-border, #e2e8f0)" stroke-width="1"/>
              <text x="0" y="3" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="var(--flowchart-label-text, #716894)" font-weight="600">${edge.label}</text>
            </g>
          `;
        }
      }
    }

    // Nós
    for (const n of nodes) {
      const rx = n.type === 'terminal' ? n.height / 2 : 8;
      const stroke = n.type === 'terminal' ? '#34d399' : n.type === 'decision' ? '#fbbf24' : 'var(--flowchart-node-stroke, #896ff4)';

      svg += `<g transform="translate(${n.x}, ${n.y})" filter="url(#card-node-shadow)">`;
      if (n.type === 'decision') {
        const hw = n.width / 2;
        const hh = n.height / 2;
        svg += `<polygon points="${hw},0 ${n.width},${hh} ${hw},${n.height} 0,${hh}" fill="var(--flowchart-node-bg, #ffffff)" stroke="${stroke}" stroke-width="2"/>`;
      } else if (n.type === 'database') {
        svg += `<rect width="${n.width}" height="${n.height}" rx="${rx}" fill="var(--flowchart-node-bg, #ffffff)" stroke="${stroke}" stroke-width="2"/>`;
        svg += `<line x1="0" y1="12" x2="${n.width}" y2="12" stroke="${stroke}" stroke-width="1.5"/>`;
      } else {
        svg += `<rect width="${n.width}" height="${n.height}" rx="${rx}" fill="var(--flowchart-node-bg, #ffffff)" stroke="${stroke}" stroke-width="2"/>`;
      }
      svg += `<text x="${n.width / 2}" y="${n.height / 2 + 4}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="var(--flowchart-node-text, #2a2440)">${n.label}</text>`;
      svg += `</g>`;
    }

    svg += '</svg>';
    return svg;
  }

  parseMermaidToFlowchartData(code: string): FlowchartData {
    const lines = code.split('\n');
    let dir: 'LR' | 'TB' = 'LR';
    const nodesMap = new Map<string, FlowchartNode>();
    const edges: FlowchartEdge[] = [];

    const upsertNode = (
      id: string,
      label: string,
      type: 'process' | 'terminal' | 'decision' | 'database' = 'process'
    ) => {
      const cleanLabel = (label || id).trim();
      const existing = nodesMap.get(id);
      if (existing) {
        if (cleanLabel !== id) existing.label = cleanLabel;
        if (type !== 'process') existing.type = type;
      } else {
        nodesMap.set(id, {
          id,
          label: cleanLabel,
          type,
          x: 0,
          y: 0,
          width: cleanLabel.length > 18 ? 160 : 130,
          height: type === 'decision' ? 60 : 50,
        });
      }
    };

    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith('flowchart') || line.startsWith('graph')) {
        if (line.includes('TB') || line.includes('TD')) dir = 'TB';
        else dir = 'LR';
        continue;
      }

      // 1. Terminal: id(["label"]) ou id([label])
      const termMatch = line.match(/^(\w+)\(\[?"?([^"\]]+)"?\]\)/);
      if (termMatch) {
        upsertNode(termMatch[1], termMatch[2], 'terminal');
        continue;
      }

      // 2. Decisão: id{"label"} ou id{label}
      const decMatch = line.match(/^(\w+)\{"?([^"}]+)"?\}/);
      if (decMatch) {
        upsertNode(decMatch[1], decMatch[2], 'decision');
        continue;
      }

      // 3. Banco: id[("label")] ou id[(label)]
      const dbMatch = line.match(/^(\w+)\[\("?([^"\)]+)"?\)\]/);
      if (dbMatch) {
        upsertNode(dbMatch[1], dbMatch[2], 'database');
        continue;
      }

      // 4. Processo: id["label"] ou id[label]
      const procMatch = line.match(/^(\w+)\["?([^"\]]+)"?\]/);
      if (procMatch) {
        upsertNode(procMatch[1], procMatch[2], 'process');
        continue;
      }

      // 5. Conexões com possíveis declarações inline de nós:
      const edgeMatch = line.match(
        /^(\w+)(?:\["?([^"\]]+)"?\]|\(\[?"?([^"\]]+)"?\]\)|\{"?([^"}]+)"?\}|\[\("?([^"\)]+)"?\)\])?\s*-->\s*(?:\|"?([^"|]+)"?\|\s*)?(\w+)(?:\["?([^"\]]+)"?\]|\(\[?"?([^"\]]+)"?\]\)|\{"?([^"}]+)"?\}|\[\("?([^"\)]+)"?\)\])?/
      );

      if (edgeMatch) {
        const sourceId = edgeMatch[1];
        const sourceLabel =
          edgeMatch[2] || edgeMatch[3] || edgeMatch[4] || edgeMatch[5] || sourceId;
        const sourceType = edgeMatch[3]
          ? 'terminal'
          : edgeMatch[4]
          ? 'decision'
          : edgeMatch[5]
          ? 'database'
          : 'process';

        const label = (edgeMatch[6] || '').trim();

        const targetId = edgeMatch[7];
        const targetLabel =
          edgeMatch[8] || edgeMatch[9] || edgeMatch[10] || edgeMatch[11] || targetId;
        const targetType = edgeMatch[9]
          ? 'terminal'
          : edgeMatch[10]
          ? 'decision'
          : edgeMatch[11]
          ? 'database'
          : 'process';

        upsertNode(sourceId, sourceLabel, sourceType);
        upsertNode(targetId, targetLabel, targetType);

        edges.push({
          id: `e_${sourceId}_${targetId}_${edges.length}`,
          sourceId,
          targetId,
          label,
        });
      }
    }

    // Ordenação Topológica para posicionamento limpo em camadas
    const nodes = Array.from(nodesMap.values());
    const isHorizontal = dir === 'LR';

    const incomingCount = new Map<string, number>();
    nodes.forEach((n) => incomingCount.set(n.id, 0));
    edges.forEach((e) => {
      incomingCount.set(e.targetId, (incomingCount.get(e.targetId) || 0) + 1);
    });

    const levels = new Map<string, number>();
    const queue: string[] = [];
    nodes.forEach((n) => {
      if ((incomingCount.get(n.id) || 0) === 0) {
        levels.set(n.id, 0);
        queue.push(n.id);
      }
    });

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const curLevel = levels.get(currentId) || 0;
      const outEdges = edges.filter((e) => e.sourceId === currentId);
      for (const edge of outEdges) {
        const nextId = edge.targetId;
        const prevLevel = levels.get(nextId) || 0;
        if (curLevel + 1 > prevLevel) {
          levels.set(nextId, curLevel + 1);
          queue.push(nextId);
        }
      }
    }

    nodes.forEach((n, idx) => {
      if (!levels.has(n.id)) {
        levels.set(n.id, idx);
      }
    });

    const levelGroups = new Map<number, FlowchartNode[]>();
    nodes.forEach((n) => {
      const lvl = levels.get(n.id) || 0;
      if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
      levelGroups.get(lvl)!.push(n);
    });

    levelGroups.forEach((group, lvl) => {
      group.forEach((node, rank) => {
        const rankOffset = (rank - (group.length - 1) / 2) * 110;
        if (isHorizontal) {
          node.x = 50 + lvl * 190;
          node.y = 120 + rankOffset;
        } else {
          node.x = 200 + rankOffset;
          node.y = 50 + lvl * 120;
        }
      });
    });

    return {
      direction: dir,
      nodes,
      edges,
      subgraphs: [],
    };
  }

  onEditorKeydown(event: KeyboardEvent): void {
    // Tecla Enter ou Tab dentro de bloco de código <pre>
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const pre = this.findParentTag(sel.anchorNode, 'pre');
      if (pre) {
        if (event.key === 'Enter') {
          event.preventDefault();
          document.execCommand('insertText', false, '\n');
          this.onEditorInput();
          return;
        } else if (event.key === 'Tab') {
          event.preventDefault();
          document.execCommand('insertText', false, '  ');
          this.onEditorInput();
          return;
        }
      }
    }

    // Atalhos úteis: Ctrl+B / Cmd+B, Ctrl+I / Cmd+I, Ctrl+K / Cmd+K
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'b' || event.key === 'B') {
        event.preventDefault();
        this.exec('bold');
      } else if (event.key === 'i' || event.key === 'I') {
        event.preventDefault();
        this.exec('italic');
      } else if (event.key === 'k' || event.key === 'K') {
        event.preventDefault();
        this.insertLink();
      }
    }
  }

  private findParentTag(node: Node | null, tagName: string): HTMLElement | null {
    let curr = node;
    while (curr && curr !== this.editorArea?.nativeElement) {
      if (
        curr.nodeType === Node.ELEMENT_NODE &&
        (curr as HTMLElement).tagName.toLowerCase() === tagName.toLowerCase()
      ) {
        return curr as HTMLElement;
      }
      curr = curr.parentNode;
    }
    return null;
  }

  // ─────────────── Ações da Toolbar WYSIWYG ───────────────

  exec(command: string, value: string | undefined = undefined): void {
    this.focusEditor();
    document.execCommand(command, false, value);
    this.onEditorInput();
  }

  setHeading(tag: 'H1' | 'H2' | 'H3' | 'P'): void {
    this.focusEditor();
    const formatTag = tag === 'P' ? '<p>' : `<${tag.toLowerCase()}>`;
    document.execCommand('formatBlock', false, formatTag);
    this.onEditorInput();
  }

  toggleBlockquote(): void {
    this.focusEditor();
    document.execCommand('formatBlock', false, '<blockquote>');
    this.onEditorInput();
  }

  insertInlineCode(): void {
    this.focusEditor();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString() || 'código';
    const codeEl = document.createElement('code');
    codeEl.textContent = selectedText;

    range.deleteContents();
    range.insertNode(codeEl);

    // Reposiciona o cursor logo após o código
    range.setStartAfter(codeEl);
    range.setEndAfter(codeEl);
    selection.removeAllRanges();
    selection.addRange(range);

    this.onEditorInput();
  }

  insertCodeBlock(): void {
    this.focusEditor();
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = '// seu código aqui';
    pre.appendChild(code);

    this.insertNodeAtSelection(pre);
    this.onEditorInput();
  }

  insertHorizontalRule(): void {
    this.exec('insertHorizontalRule');
  }

  insertLink(): void {
    this.focusEditor();
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    const url = prompt('Digite a URL do link:', 'https://');
    if (!url) return;

    if (!selectedText) {
      const a = document.createElement('a');
      a.href = url;
      a.textContent = url;
      a.target = '_blank';
      this.insertNodeAtSelection(a);
    } else {
      document.execCommand('createLink', false, url);
    }
    this.onEditorInput();
  }

  insertChecklist(): void {
    this.focusEditor();
    const checkItem = document.createElement('div');
    checkItem.className = 'md-check-item';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.addEventListener('change', () => this.onEditorInput());

    const span = document.createElement('span');
    span.textContent = ' Novo item';

    checkItem.appendChild(cb);
    checkItem.appendChild(span);

    this.insertNodeAtSelection(checkItem);
    this.onEditorInput();
  }

  toggleTableMenu(): void {
    this.showTableMenu = !this.showTableMenu;
  }

  onGridHover(r: number, c: number): void {
    this.hoverRow = r;
    this.hoverCol = c;
  }

  onGridSelect(rows: number, cols: number): void {
    this.showTableMenu = false;
    this.insertTable(rows, cols);
  }

  private insertTable(rows: number, cols: number): void {
    this.focusEditor();
    const table = document.createElement('table');
    table.className = 'editor-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (let c = 1; c <= cols; c++) {
      const th = document.createElement('th');
      th.textContent = `Cabeçalho ${c}`;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let r = 1; r <= rows; r++) {
      const tr = document.createElement('tr');
      for (let c = 1; c <= cols; c++) {
        const td = document.createElement('td');
        td.textContent = `Item ${r},${c}`;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    this.insertNodeAtSelection(table);
    this.onEditorInput();
  }

  private insertNodeAtSelection(node: Node): void {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      if (this.editorArea) {
        this.editorArea.nativeElement.appendChild(node);
      }
      return;
    }
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(node);

    range.setStartAfter(node);
    range.setEndAfter(node);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  private insertHtmlAtSelection(html: string): void {
    this.focusEditor();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      if (this.editorArea) {
        this.editorArea.nativeElement.innerHTML += html;
      }
      return;
    }

    const range = sel.getRangeAt(0);
    range.deleteContents();

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const frag = document.createDocumentFragment();
    let node: Node | null;
    let lastNode: Node | null = null;
    while ((node = tempDiv.firstChild)) {
      lastNode = frag.appendChild(node);
    }
    range.insertNode(frag);

    if (lastNode) {
      range.setStartAfter(lastNode);
      range.setEndAfter(lastNode);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  private focusEditor(): void {
    if (this.editorArea) {
      this.editorArea.nativeElement.focus();
    }
  }

  // ─────────────── Conversão Bidirecional Markdown <-> HTML ───────────────

  /**
   * Converte Markdown (vindo do banco ou colado pelo usuário) para HTML renderizável no editor.
   */
  markdownToHtml(md: string): string {
    if (!md) return '';

    let html = md;

    // 1. Proteger Fenced Code Blocks com placeholders ANTES de qualquer transformação
    // para evitar que comentários (# bash/python, //, *, etc) sejam convertidos em headers ou estilos
    const codeBlocks: string[] = [];
    html = html.replace(/```(\w*)[\r\n]+([\s\S]*?)```/g, (_m, lang, code) => {
      const idx = codeBlocks.length;
      if (lang === 'mermaid') {
        const data = this.parseMermaidToFlowchartData(code.trim());
        const svg = this.renderQuickSvgFromData(data);
        const card = this.renderMermaidCard(code.trim(), svg, data);
        codeBlocks.push(card);
      } else {
        const safeCode = code
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        codeBlocks.push(`<pre><code>${safeCode.trim()}</code></pre>`);
      }
      return `\n\n%%CODE_BLOCK_${idx}%%\n\n`;
    });

    // 2. Proteger Inline Code com placeholders
    const inlineCodes: string[] = [];
    html = html.replace(/`([^`]+)`/g, (_m, code) => {
      const idx = inlineCodes.length;
      const safeCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      inlineCodes.push(`<code>${safeCode}</code>`);
      return `%%INLINE_CODE_${idx}%%`;
    });

    // 3. Escapar tags brutas restantes do texto fora dos blocos de código
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 4. Headers (de H6 até H1 em ordem decrescente de cerquilhas)
    html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // 5. Blockquote
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    // 6. Linha horizontal
    html = html.replace(/^---$/gm, '<hr>');

    // 7. Negrito, Itálico e Tachado
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // 8. Checklists interativas
    html = html.replace(
      /^- \[x\] (.+)$/gm,
      '<div class="md-check-item"><input type="checkbox" checked> <span>$1</span></div>'
    );
    html = html.replace(
      /^- \[ \] (.+)$/gm,
      '<div class="md-check-item"><input type="checkbox"> <span>$1</span></div>'
    );

    // 9. Listas simples
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.+<\/li>\n?)+)/g, '<ul>$1</ul>');

    // 10. Links
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );

    // 11. Tabelas simples
    html = this.parseMarkdownTables(html);

    // 12. Parágrafos
    html = html.replace(/\n\n+/g, '</p><p>');
    html = `<p>${html}</p>`;
    html = html.replace(/([^>])\n([^<])/g, '$1<br>$2');
    html = html.replace(/<p>\s*<\/p>/g, '');

    // 13. Limpar tags de parágrafo que envelopem placeholders de blocos de código
    html = html.replace(/<p>\s*(?:<br>)*\s*%%CODE_BLOCK_(\d+)%%\s*(?:<br>)*\s*<\/p>/g, '%%CODE_BLOCK_$1%%');
    html = html.replace(/<p>\s*%%CODE_BLOCK_(\d+)%%\s*<\/p>/g, '%%CODE_BLOCK_$1%%');

    // 14. Restaurar inline code
    html = html.replace(/%%INLINE_CODE_(\d+)%%/g, (_m, i) => inlineCodes[Number(i)] ?? '');

    // 15. Restaurar fenced code blocks
    html = html.replace(/%%CODE_BLOCK_(\d+)%%/g, (_m, i) => codeBlocks[Number(i)] ?? '');

    return html;
  }

  /**
   * Converte a árvore DOM do editor WYSIWYG de volta para Markdown limpo.
   */
  htmlToMarkdown(container: HTMLElement): string {
    let md = '';
    container.childNodes.forEach((node) => {
      md += this.nodeToMarkdown(node);
    });

    // Limpeza de quebras e espaços em branco excessivos
    return md
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private nodeToMarkdown(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent || '').replace(/\u00A0/g, ' ');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    const getChildrenMd = () => {
      let res = '';
      node.childNodes.forEach((child) => {
        res += this.nodeToMarkdown(child);
      });
      return res;
    };

    switch (tag) {
      case 'strong':
      case 'b': {
        const content = getChildrenMd().trim();
        return content ? `**${content}**` : '';
      }
      case 'em':
      case 'i': {
        const content = getChildrenMd().trim();
        return content ? `*${content}*` : '';
      }
      case 'del':
      case 's':
      case 'strike': {
        const content = getChildrenMd().trim();
        return content ? `~~${content}~~` : '';
      }
      case 'code': {
        if (el.parentElement?.tagName.toLowerCase() === 'pre') {
          return el.textContent || '';
        }
        const content = getChildrenMd().trim();
        return content ? `\`${content}\`` : '';
      }
      case 'pre': {
        const codeText = this.extractCodeText(el);
        return `\n\n\`\`\`\n${codeText.trim()}\n\`\`\`\n\n`;
      }
      case 'h1':
        return `\n\n# ${getChildrenMd().trim()}\n\n`;
      case 'h2':
        return `\n\n## ${getChildrenMd().trim()}\n\n`;
      case 'h3':
        return `\n\n### ${getChildrenMd().trim()}\n\n`;
      case 'h4':
        return `\n\n#### ${getChildrenMd().trim()}\n\n`;
      case 'h5':
        return `\n\n##### ${getChildrenMd().trim()}\n\n`;
      case 'h6':
        return `\n\n###### ${getChildrenMd().trim()}\n\n`;
      case 'blockquote': {
        const text = getChildrenMd().trim();
        const lines = text.split('\n');
        return '\n\n' + lines.map((l) => `> ${l}`).join('\n') + '\n\n';
      }
      case 'a': {
        const href = el.getAttribute('href') || '';
        return `[${getChildrenMd().trim()}](${href})`;
      }
      case 'hr':
        return '\n\n---\n\n';
      case 'ul': {
        let listStr = '\n\n';
        el.querySelectorAll(':scope > li').forEach((li) => {
          const checkbox = li.querySelector('input[type="checkbox"]') as HTMLInputElement;
          if (checkbox) {
            const checked = checkbox.checked ? 'x' : ' ';
            const clone = li.cloneNode(true) as HTMLElement;
            clone.querySelector('input[type="checkbox"]')?.remove();
            listStr += `- [${checked}] ${this.nodeToMarkdown(clone).trim()}\n`;
          } else {
            listStr += `- ${this.nodeToMarkdown(li).trim()}\n`;
          }
        });
        return listStr + '\n';
      }
      case 'ol': {
        let listStr = '\n\n';
        let idx = 1;
        el.querySelectorAll(':scope > li').forEach((li) => {
          listStr += `${idx++}. ${this.nodeToMarkdown(li).trim()}\n`;
        });
        return listStr + '\n';
      }
      case 'table':
        return '\n\n' + this.tableToMarkdown(el) + '\n\n';
      case 'br':
        return '\n';
      case 'div': {
        if (el.classList.contains('md-flowchart-card')) {
          const encodedCode = el.getAttribute('data-flowchart-code') || '';
          const code = encodedCode ? decodeURIComponent(encodedCode) : '';
          return `\n\n\`\`\`mermaid\n${code}\n\`\`\`\n\n`;
        }
        if (el.classList.contains('md-check-item')) {
          const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
          const checked = checkbox && checkbox.checked ? 'x' : ' ';
          const clone = el.cloneNode(true) as HTMLElement;
          clone.querySelector('input[type="checkbox"]')?.remove();
          return `\n- [${checked}] ${this.nodeToMarkdown(clone).trim()}\n`;
        }
        const text = getChildrenMd().trim();
        return text ? `\n\n${text}\n\n` : '';
      }
      case 'p': {
        const text = getChildrenMd().trim();
        return text ? `\n\n${text}\n\n` : '';
      }
      default:
        return getChildrenMd();
    }
  }

  private tableToMarkdown(table: HTMLElement): string {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return '';

    let md = '';
    const headerCols = Array.from(rows[0].querySelectorAll('th, td')).map(
      (c) => this.nodeToMarkdown(c).trim() || ' '
    );

    md += '| ' + headerCols.join(' | ') + ' |\n';
    md += '| ' + headerCols.map(() => '---').join(' | ') + ' |\n';

    for (let i = 1; i < rows.length; i++) {
      const cols = Array.from(rows[i].querySelectorAll('td, th')).map(
        (c) => this.nodeToMarkdown(c).trim() || ' '
      );
      while (cols.length < headerCols.length) cols.push(' ');
      md += '| ' + cols.slice(0, headerCols.length).join(' | ') + ' |\n';
    }

    return md;
  }

  private parseMarkdownTables(content: string): string {
    const tableRegex = /((?:\|.+?\|\n?)+)/g;
    return content.replace(tableRegex, (match) => {
      const lines = match.trim().split('\n').filter((l) => l.includes('|'));
      if (lines.length < 2) return match;

      let htmlTable = '<table class="editor-table"><tbody>';
      let isHeader = true;

      for (const line of lines) {
        if (line.includes('---')) {
          isHeader = false;
          continue;
        }

        const cells = line
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());

        htmlTable += '<tr>';
        for (const cell of cells) {
          const tag = isHeader ? 'th' : 'td';
          htmlTable += `<${tag}>${cell}</${tag}>`;
        }
        htmlTable += '</tr>';
      }

      htmlTable += '</tbody></table>';
      return htmlTable;
    });
  }

  private extractCodeText(el: HTMLElement): string {
    const clone = el.cloneNode(true) as HTMLElement;
    // Converte todas as tags <br> em quebras de linha reais
    clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
    // Converte elementos de bloco em quebras de linha
    clone.querySelectorAll('div, p, li').forEach((block) => {
      block.before('\n');
    });
    const text = clone.innerText !== undefined ? clone.innerText : (clone.textContent || '');
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }
}
