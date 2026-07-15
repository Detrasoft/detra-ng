import {
  Component,
  Input,
  forwardRef,
  ViewChild,
  ElementRef,
  AfterViewInit,
  HostListener,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'ds-html-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="ds-html-editor-wrapper"
      [class.ds-html-editor--error]="error"
      [class.ds-html-editor--disabled]="disabled"
    >
      <label *ngIf="label" class="ds-html-editor__label" [attr.for]="inputId">
        {{ label }}
        <span *ngIf="required" class="ds-html-editor__required">*</span>
      </label>

      <div
        class="editor-container"
        data-testid="editor-container"
        [class.editor-container--disabled]="disabled"
      >
        <!-- Toolbar -->
        <div class="editor-toolbar" *ngIf="!disabled">
          <div class="toolbar-group">
            <button type="button" class="toolbar-btn" (click)="toggleBold()" title="Negrito">
              <i class="fa-solid fa-bold"></i>
            </button>
            <button type="button" class="toolbar-btn" (click)="toggleItalic()" title="Itálico">
              <i class="fa-solid fa-italic"></i>
            </button>
            <button
              type="button"
              class="toolbar-btn"
              (click)="toggleUnderline()"
              title="Sublinhado"
            >
              <i class="fa-solid fa-underline"></i>
            </button>
            <button
              type="button"
              class="toolbar-btn"
              (click)="toggleStrikethrough()"
              title="Tachado"
            >
              <i class="fa-solid fa-strikethrough"></i>
            </button>
          </div>

          <div class="toolbar-separator"></div>

          <div class="toolbar-group">
            <div class="font-picker-wrapper">
              <button
                type="button"
                class="toolbar-btn"
                (mousedown)="$event.preventDefault()"
                (click)="toggleFontMenu()"
                title="Fonte"
              >
                <i class="fa-solid fa-font"></i>
              </button>
              <div
                class="font-menu-dropdown"
                *ngIf="showFontMenu"
                (mousedown)="$event.preventDefault()"
              >
                <div class="font-menu-header">Fonte</div>
                <div class="font-menu-list">
                  <button
                    *ngFor="let font of fonts"
                    type="button"
                    class="font-menu-item"
                    [style.fontFamily]="font.family"
                    (click)="setFontFamily(font.family)"
                  >
                    {{ font.name }}
                  </button>
                </div>
              </div>
            </div>

            <div class="font-size-picker-wrapper">
              <button
                type="button"
                class="toolbar-btn"
                (mousedown)="$event.preventDefault()"
                (click)="toggleFontSizeMenu()"
                title="Tamanho da fonte"
              >
                <i class="fa-solid fa-text-height"></i>
              </button>
              <div
                class="font-size-menu-dropdown"
                *ngIf="showFontSizeMenu"
                (mousedown)="$event.preventDefault()"
              >
                <div class="font-size-header">Tamanho</div>
                <div class="font-size-list">
                  <button
                    *ngFor="let size of fontSizes"
                    type="button"
                    class="font-size-item"
                    (click)="setFontSize(size)"
                  >
                    {{ size }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="toolbar-separator"></div>

          <div class="toolbar-group">
            <button type="button" class="toolbar-btn" (click)="setHeading('H1')" title="Título 1">
              H1
            </button>
            <button type="button" class="toolbar-btn" (click)="setHeading('H2')" title="Título 2">
              H2
            </button>
            <button type="button" class="toolbar-btn" (click)="setHeading('H3')" title="Título 3">
              H3
            </button>
            <button type="button" class="toolbar-btn" (click)="setHeading('P')" title="Parágrafo">
              <i class="fa-solid fa-paragraph"></i>
            </button>

            <div class="special-title-picker-wrapper">
              <button
                type="button"
                class="toolbar-btn"
                (mousedown)="$event.preventDefault()"
                (click)="toggleSpecialTitleMenu()"
                title="Título Especial"
              >
                <i
                  class="fa-solid fa-heading"
                  style="border-left: 2px solid var(--color-primary-500, #3b82f6); padding-left: 2px;"
                ></i>
              </button>
              <div
                class="special-title-menu-dropdown"
                *ngIf="showSpecialTitleMenu"
                (mousedown)="$event.preventDefault()"
              >
                <div class="special-title-header">Cor da Borda</div>
                <div class="color-swatches-grid">
                  <button
                    *ngFor="let color of specialTitleColors"
                    type="button"
                    class="color-swatch"
                    [style.background]="color"
                    (click)="insertSpecialTitle(color)"
                    [title]="color"
                  ></button>
                </div>
              </div>
            </div>
          </div>

          <div class="toolbar-separator"></div>

          <div class="toolbar-group">
            <button
              type="button"
              class="toolbar-btn"
              (click)="insertUnorderedList()"
              title="Lista não-ordenada"
            >
              <i class="fa-solid fa-list-ul"></i>
            </button>
            <button
              type="button"
              class="toolbar-btn"
              (click)="insertOrderedList()"
              title="Lista ordenada"
            >
              <i class="fa-solid fa-list-ol"></i>
            </button>
          </div>

          <div class="toolbar-separator"></div>

          <div class="toolbar-group">
            <button
              type="button"
              class="toolbar-btn"
              (click)="setAlignment('justifyLeft')"
              title="Alinhar à esquerda"
            >
              <i class="fa-solid fa-align-left"></i>
            </button>
            <button
              type="button"
              class="toolbar-btn"
              (click)="setAlignment('justifyCenter')"
              title="Centralizar"
            >
              <i class="fa-solid fa-align-center"></i>
            </button>
            <button
              type="button"
              class="toolbar-btn"
              (click)="setAlignment('justifyRight')"
              title="Alinhar à direita"
            >
              <i class="fa-solid fa-align-right"></i>
            </button>
            <button
              type="button"
              class="toolbar-btn"
              (click)="setAlignment('justifyFull')"
              title="Justificar"
            >
              <i class="fa-solid fa-align-justify"></i>
            </button>
          </div>

          <div class="toolbar-separator"></div>

          <div class="toolbar-group">
            <div class="color-picker-wrapper">
              <button
                type="button"
                class="toolbar-btn toolbar-btn--color"
                (mousedown)="$event.preventDefault()"
                (click)="toggleColorPicker()"
                title="Cor do texto"
              >
                <i class="fa-solid fa-palette"></i>
              </button>
              <div
                class="color-picker-dropdown"
                *ngIf="showColorPicker"
                (mousedown)="$event.preventDefault()"
              >
                <button
                  *ngFor="let color of textColors"
                  type="button"
                  class="color-swatch"
                  [style.background]="color"
                  (click)="setTextColor(color)"
                  [title]="color"
                ></button>
              </div>
            </div>
            <button
              type="button"
              class="toolbar-btn"
              (click)="triggerImageUpload()"
              title="Inserir imagem"
            >
              <i class="fa-solid fa-image"></i>
            </button>

            <div class="table-picker-wrapper">
              <button
                type="button"
                class="toolbar-btn"
                (mousedown)="$event.preventDefault()"
                (click)="toggleTableMenu()"
                title="Tabela"
              >
                <i class="fa-solid fa-table"></i>
              </button>
              <div
                class="table-menu-dropdown"
                *ngIf="showTableMenu"
                (mousedown)="$event.preventDefault()"
              >
                <!-- Case 1: Outside table -> Sizing grid -->
                <div *ngIf="!activeTable" class="table-grid-picker">
                  <div class="grid-picker-header">Inserir Tabela</div>
                  <div class="grid-picker-box">
                    <div *ngFor="let r of [1, 2, 3, 4, 5]" class="grid-picker-row">
                      <div
                        *ngFor="let c of [1, 2, 3, 4, 5]"
                        class="grid-picker-cell"
                        [class.active]="r <= hoverRow && c <= hoverCol"
                        (mouseenter)="onGridHover(r, c)"
                        (click)="onGridSelect(r, c)"
                      ></div>
                    </div>
                  </div>
                  <div class="grid-picker-footer">{{ hoverRow }} x {{ hoverCol }}</div>
                </div>

                <!-- Case 2: Inside table -> Contextual operations -->
                <div *ngIf="activeTable" class="table-actions-list">
                  <div class="table-actions-header">Formatar Tabela</div>
                  <button type="button" class="table-action-item" (click)="addRow(false)">
                    <i class="fa-solid fa-arrow-up"></i> Inserir Linha Acima
                  </button>
                  <button type="button" class="table-action-item" (click)="addRow(true)">
                    <i class="fa-solid fa-arrow-down"></i> Inserir Linha Abaixo
                  </button>
                  <button type="button" class="table-action-item" (click)="deleteRow()">
                    <i class="fa-solid fa-minus"></i> Excluir Linha
                  </button>
                  <div class="dropdown-divider"></div>
                  <button type="button" class="table-action-item" (click)="addColumn(false)">
                    <i class="fa-solid fa-arrow-left"></i> Inserir Coluna Antes
                  </button>
                  <button type="button" class="table-action-item" (click)="addColumn(true)">
                    <i class="fa-solid fa-arrow-right"></i> Inserir Coluna Depois
                  </button>
                  <button type="button" class="table-action-item" (click)="deleteColumn()">
                    <i class="fa-solid fa-minus"></i> Excluir Coluna
                  </button>
                  <div class="dropdown-divider"></div>
                  <button type="button" class="table-action-item" (click)="mergeCellRight()">
                    <i class="fa-solid fa-compress"></i> Mesclar à Direita
                  </button>
                  <button type="button" class="table-action-item" (click)="splitCell()">
                    <i class="fa-solid fa-expand"></i> Dividir Célula
                  </button>
                  <button type="button" class="table-action-item" (click)="toggleHeaderRow()">
                    <i class="fa-solid fa-heading"></i> Cabeçalho da Tabela
                  </button>
                  <div class="dropdown-divider"></div>
                  <div class="table-border-style-section">
                    <div class="table-border-style-label">
                      <i class="fa-solid fa-border-all"></i> Estilo da Borda
                    </div>
                    <div class="table-border-style-list">
                      <button
                        *ngFor="let bs of tableBorderStyles"
                        type="button"
                        class="table-border-style-item"
                        (click)="setTableBorderStyle(bs.style)"
                        [title]="bs.name"
                      >
                        <span
                          class="table-border-preview"
                          [style.border-style]="bs.style"
                          [class.table-border-preview--none]="bs.style === 'none'"
                        ></span>
                        <span class="table-border-style-name">{{ bs.name }}</span>
                      </button>
                    </div>
                  </div>
                  <div class="dropdown-divider"></div>
                  <button
                    type="button"
                    class="table-action-item table-action-item--danger"
                    (click)="deleteTable()"
                  >
                    <i class="fa-solid fa-trash-can"></i> Excluir Tabela
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              class="toolbar-btn"
              (click)="clearFormatting()"
              title="Limpar formatação"
            >
              <i class="fa-solid fa-eraser"></i>
            </button>

            <div class="hr-picker-wrapper">
              <button
                type="button"
                class="toolbar-btn"
                (mousedown)="$event.preventDefault()"
                (click)="toggleHrMenu()"
                title="Linha Horizontal"
              >
                <i class="fa-solid fa-minus"></i>
              </button>
              <div
                class="hr-menu-dropdown"
                *ngIf="showHrMenu"
                (mousedown)="$event.preventDefault()"
              >
                <div class="hr-menu-header">Linha Horizontal</div>
                <div class="hr-menu-list">
                  <button
                    *ngFor="let hr of hrStyles"
                    type="button"
                    class="hr-menu-item"
                    (click)="insertHorizontalRule(hr.style)"
                  >
                    <span class="hr-preview" [style.border-top-style]="hr.style"></span>
                    <span class="hr-style-name">{{ hr.name }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Floating Table Trash -->
        <div
          *ngIf="activeTable"
          class="floating-table-trash"
          [style.top.px]="tableTrashTop"
          [style.left.px]="tableTrashLeft"
          (mousedown)="$event.preventDefault()"
          (click)="deleteTable()"
          title="Excluir Tabela"
        >
          <i class="fa-solid fa-trash-can"></i>
        </div>

        <!-- Floating Table Resize Button -->
        <div
          *ngIf="activeTable"
          class="floating-table-resize"
          [class.active]="tableResizeMode"
          [style.top.px]="tableTrashTop"
          [style.left.px]="tableTrashLeft - 36"
          (mousedown)="$event.preventDefault()"
          (click)="toggleTableResizeMode()"
          [title]="tableResizeMode ? 'Sair do Redimensionamento' : 'Redimensionar'"
        >
          <i class="fa-solid fa-arrows-left-right"></i>
        </div>

        <!-- Table Column Resize Handles -->
        <ng-container *ngIf="tableResizeMode && activeTable">
          <div
            *ngFor="let handle of colResizeHandles; let i = index"
            class="table-col-resize-handle"
            [style.top.px]="handle.top"
            [style.left.px]="handle.left"
            [style.height.px]="handle.height"
            (mousedown)="startColResize($event, i)"
          >
            <i class="fa-solid fa-grip-lines-vertical"></i>
          </div>
          <div
            class="table-width-resize-handle"
            [style.top.px]="tableWidthHandle.top"
            [style.left.px]="tableWidthHandle.left"
            [style.height.px]="tableWidthHandle.height"
            (mousedown)="startTableWidthResize($event)"
          >
            <i class="fa-solid fa-grip-lines-vertical"></i>
          </div>
        </ng-container>

        <!-- Image Overlay -->
        <div
          *ngIf="activeImage"
          class="image-overlay"
          [style.top.px]="imageOverlayTop"
          [style.left.px]="imageOverlayLeft"
          [style.width.px]="imageOverlayWidth"
          [style.height.px]="imageOverlayHeight"
        >
          <div class="image-toolbar" (mousedown)="$event.preventDefault()">
            <button type="button" (click)="alignImage('left')" title="Alinhar à esquerda"><i class="fa-solid fa-align-left"></i></button>
            <button type="button" (click)="alignImage('center')" title="Centralizar"><i class="fa-solid fa-align-center"></i></button>
            <button type="button" (click)="alignImage('right')" title="Alinhar à direita"><i class="fa-solid fa-align-right"></i></button>
            <button type="button" class="danger" (click)="deleteImage()" title="Excluir Imagem"><i class="fa-solid fa-trash-can"></i></button>
          </div>
          <div class="resize-handle top-left" (mousedown)="startResize($event, 'tl')"></div>
          <div class="resize-handle top-right" (mousedown)="startResize($event, 'tr')"></div>
          <div class="resize-handle bottom-left" (mousedown)="startResize($event, 'bl')"></div>
          <div class="resize-handle bottom-right" (mousedown)="startResize($event, 'br')"></div>
        </div>

        <!-- Editor Area -->
        <div
          #editorArea
          [id]="inputId"
          class="editor-area"
          [attr.contenteditable]="!disabled"
          data-testid="editor-area"
          [attr.data-placeholder]="placeholder"
          (input)="onEditorInput()"
          (paste)="onEditorPaste($event)"
          (focus)="checkActiveTable()"
          (blur)="onBlur()"
          (click)="onEditorClick($event); checkActiveTable()"
          (keyup)="checkActiveTable()"
          (mouseup)="checkActiveTable()"
        ></div>

        <div *ngIf="error" class="editor-error">
          <i class="fa-solid fa-circle-exclamation"></i>
          {{ error }}
        </div>

        <!-- Hidden file input for image upload -->
        <input
          #imageInput
          type="file"
          accept="image/*"
          style="display: none"
          (change)="onImageSelected($event)"
        />
      </div>
    </div>
  `,
  styleUrl: './html-editor.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => HtmlEditorComponent),
      multi: true,
    },
  ],
})
export class HtmlEditorComponent implements AfterViewInit, ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = 'Digite o conteúdo aqui...';
  @Input() error = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() inputId = `ds-html-editor-${Math.random().toString(36).slice(2, 9)}`;

  @ViewChild('editorArea') editorArea!: ElementRef<HTMLDivElement>;
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;

  private readonly elementRef = inject(ElementRef);

  value = '';
  showColorPicker = false;
  showTableMenu = false;
  showSpecialTitleMenu = false;
  showFontMenu = false;
  showFontSizeMenu = false;
  hoverRow = 1;
  hoverCol = 1;
  activeTable: HTMLTableElement | null = null;
  savedRange: Range | null = null;

  tableTrashTop = 0;
  tableTrashLeft = 0;

  activeImage: HTMLImageElement | null = null;
  imageOverlayTop = 0;
  imageOverlayLeft = 0;
  imageOverlayWidth = 0;
  imageOverlayHeight = 0;

  private isResizing = false;
  private resizeHandle = '';
  private startX = 0;
  private startY = 0;
  private startWidth = 0;
  private startHeight = 0;

  // Table resize mode
  tableResizeMode = false;
  colResizeHandles: { top: number; left: number; height: number }[] = [];
  tableWidthHandle = { top: 0, left: 0, height: 0 };
  private isResizingCol = false;
  private isResizingTableWidth = false;
  private resizeColIndex = -1;
  private resizeStartX = 0;
  private resizeStartWidths: number[] = [];
  private resizeStartTableWidth = 0;

  // Horizontal rule menu
  showHrMenu = false;
  hrStyles = [
    { name: 'Sólida', style: 'solid' },
    { name: 'Tracejada', style: 'dashed' },
    { name: 'Pontilhada', style: 'dotted' },
    { name: 'Dupla', style: 'double' },
    { name: 'Groove', style: 'groove' },
    { name: 'Ridge', style: 'ridge' },
  ];

  // Table border styles
  tableBorderStyles = [
    { name: 'Sólida', style: 'solid' },
    { name: 'Tracejada', style: 'dashed' },
    { name: 'Pontilhada', style: 'dotted' },
    { name: 'Dupla', style: 'double' },
    { name: 'Groove', style: 'groove' },
    { name: 'Ridge', style: 'ridge' },
    { name: 'Invisível', style: 'none' },
  ];

  textColors = [
    '#1a1a2e',
    '#16213e',
    '#0f3460',
    '#e94560',
    '#533483',
    '#2b2d42',
    '#8d99ae',
    '#ef233c',
    '#2ec4b6',
    '#011627',
    '#ff6b6b',
    '#4ecdc4',
    '#45b7d1',
    '#96ceb4',
    '#ffeaa7',
    '#dfe6e9',
    '#6c5ce7',
    '#a29bfe',
    '#fd79a8',
    '#00b894',
  ];

  specialTitleColors = [
    '#0056b3',
    '#2e7d32',
    '#c62828',
    '#ad1457',
    '#6a1b9a',
    '#ef6c00',
    '#37474f',
    '#00838f',
    '#2b2d42',
    '#e94560',
  ];

  fonts = [
    { name: 'Inter', family: 'Inter, sans-serif' },
    { name: 'Arial', family: 'Arial, Helvetica, sans-serif' },
    { name: 'Courier New', family: '"Courier New", Courier, monospace' },
    { name: 'Georgia', family: 'Georgia, serif' },
    { name: 'Times New Roman', family: '"Times New Roman", Times, serif' },
    { name: 'Trebuchet MS', family: '"Trebuchet MS", Helvetica, sans-serif' },
    { name: 'Verdana', family: 'Verdana, Geneva, sans-serif' },
    { name: 'Outfit', family: 'Outfit, sans-serif' },
    { name: 'Roboto', family: 'Roboto, sans-serif' },
  ];

  fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px'];

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  ngAfterViewInit(): void {
    if (this.editorArea?.nativeElement) {
      this.editorArea.nativeElement.innerHTML = this.value || '';
    }
  }

  writeValue(value: string): void {
    this.value = value != null ? String(value) : '';
    if (this.editorArea?.nativeElement) {
      this.editorArea.nativeElement.innerHTML = this.value;
    }
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

  syncEditorContent(): void {
    if (this.editorArea?.nativeElement) {
      this.value = this.editorArea.nativeElement.innerHTML;
      this.onChange(this.value);
    }
  }

  execCommand(command: string, value?: string): void {
    if (this.disabled) return;
    document.execCommand(command, false, value || '');
    this.editorArea?.nativeElement?.focus();
    this.syncEditorContent();
  }

  toggleBold(): void {
    this.execCommand('bold');
  }
  toggleItalic(): void {
    this.execCommand('italic');
  }
  toggleUnderline(): void {
    this.execCommand('underline');
  }
  toggleStrikethrough(): void {
    this.execCommand('strikeThrough');
  }

  setHeading(level: string): void {
    this.execCommand('formatBlock', level);
  }

  setAlignment(align: string): void {
    this.execCommand(align);
  }

  insertOrderedList(): void {
    this.execCommand('insertOrderedList');
  }
  insertUnorderedList(): void {
    this.execCommand('insertUnorderedList');
  }

  clearFormatting(): void {
    if (this.disabled) return;
    const editor = this.editorArea?.nativeElement;
    if (!editor) return;
    editor.focus();

    // 1) Remove inline text formatting (bold, italic, underline, color, font).
    document.execCommand('removeFormat', false, '');

    // 2) Remove the spacing the user cannot otherwise control (margins,
    //    paddings, line-height). Acts on the elements touched by the current
    //    selection; if nothing is selected, cleans the whole document so the
    //    user can reset everything in a single click.
    const targets = this.getElementsForFormatReset(editor);
    targets.forEach((el) => this.stripSpacingStyles(el));

    this.syncEditorContent();
  }

  /** Elements affected by the current selection, or all content if none. */
  private getElementsForFormatReset(editor: HTMLElement): HTMLElement[] {
    const all = Array.from(editor.querySelectorAll<HTMLElement>('*'));
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return all;
    }
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      return all;
    }
    const inSelection = all.filter((el) => {
      try {
        return range.intersectsNode(el);
      } catch {
        return true;
      }
    });
    const ancestor =
      range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? (range.commonAncestorContainer as HTMLElement)
        : range.commonAncestorContainer.parentElement;
    if (
      ancestor &&
      ancestor !== editor &&
      editor.contains(ancestor) &&
      !inSelection.includes(ancestor)
    ) {
      inSelection.push(ancestor);
    }
    return inSelection.length ? inSelection : all;
  }

  /** Strips margin / padding / line-height from an element's inline style. */
  private stripSpacingStyles(el: HTMLElement): void {
    [
      'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'margin-block', 'margin-block-start', 'margin-block-end',
      'margin-inline', 'margin-inline-start', 'margin-inline-end',
      'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'padding-block', 'padding-block-start', 'padding-block-end',
      'padding-inline', 'padding-inline-start', 'padding-inline-end',
      'line-height',
    ].forEach((p) => el.style.removeProperty(p));
    if (!el.getAttribute('style')) el.removeAttribute('style');
  }

  setTextColor(color: string): void {
    this.execCommand('foreColor', color);
    this.showColorPicker = false;
  }

  toggleColorPicker(): void {
    if (this.disabled) return;
    this.showColorPicker = !this.showColorPicker;
    this.showTableMenu = false;
    this.showSpecialTitleMenu = false;
    this.showFontMenu = false;
    this.showFontSizeMenu = false;
    this.showHrMenu = false;
  }

  toggleSpecialTitleMenu(): void {
    if (this.disabled) return;
    this.showSpecialTitleMenu = !this.showSpecialTitleMenu;
    this.showColorPicker = false;
    this.showTableMenu = false;
    this.showFontMenu = false;
    this.showFontSizeMenu = false;
    this.showHrMenu = false;
  }

  insertSpecialTitle(color: string): void {
    const html = `<h3 style="background-color: #f4f4f4; padding: 8px; font-size: 14px; border-left: 4px solid ${color};">TEXTO DO TÍTULO</h3>`;
    this.insertHtml(html);
    this.showSpecialTitleMenu = false;
  }

  toggleFontMenu(): void {
    if (this.disabled) return;
    this.showFontMenu = !this.showFontMenu;
    this.showColorPicker = false;
    this.showTableMenu = false;
    this.showSpecialTitleMenu = false;
    this.showFontSizeMenu = false;
    this.showHrMenu = false;
  }

  toggleFontSizeMenu(): void {
    if (this.disabled) return;
    this.showFontSizeMenu = !this.showFontSizeMenu;
    this.showColorPicker = false;
    this.showTableMenu = false;
    this.showSpecialTitleMenu = false;
    this.showFontMenu = false;
    this.showHrMenu = false;
  }

  setFontFamily(font: string): void {
    this.applySelectionStyle('fontFamily', font);
    this.showFontMenu = false;
  }

  setFontSize(size: string): void {
    this.applySelectionStyle('fontSize', size);
    this.showFontSizeMenu = false;
  }

  applySelectionStyle(styleName: 'fontSize' | 'fontFamily', value: string): void {
    if (this.disabled) return;
    this.editorArea?.nativeElement?.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    if (!this.editorArea.nativeElement.contains(range.commonAncestorContainer)) return;

    if (!range.collapsed) {
      if (styleName === 'fontFamily') {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('fontName', false, value);
        document.execCommand('styleWithCSS', false, 'false');
      } else if (styleName === 'fontSize') {
        const span = document.createElement('span');
        span.style.fontSize = value;
        try {
          const fragment = range.extractContents();
          span.appendChild(fragment);
          range.insertNode(span);

          const newRange = document.createRange();
          newRange.selectNodeContents(span);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } catch (err) {
          console.error('Error applying font size:', err);
        }
      }
    } else {
      const span = document.createElement('span');
      if (styleName === 'fontSize') {
        span.style.fontSize = value;
      } else {
        span.style.fontFamily = value;
      }
      span.appendChild(document.createTextNode('\u200B'));

      try {
        range.insertNode(span);
        const newRange = document.createRange();
        newRange.setStart(span.firstChild!, 1);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } catch (err) {
        console.error('Error inserting style span at cursor:', err);
      }
    }

    this.syncEditorContent();
  }

  triggerImageUpload(): void {
    if (this.disabled) return;
    this.imageInput?.nativeElement?.click();
  }

  onImageSelected(event: Event): void {
    if (this.disabled) return;
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        this.editorArea?.nativeElement?.focus();
        document.execCommand('insertImage', false, dataUrl);
        this.syncEditorContent();
      };
      reader.readAsDataURL(file);
      // Reset input
      input.value = '';
    }
  }

  onEditorInput(): void {
    this.syncEditorContent();
    this.checkActiveTable();
    this.updateImageOverlayPosition();
  }

  onEditorPaste(event: ClipboardEvent): void {
    if (this.disabled) {
      event.preventDefault();
      return;
    }

    const clipboard = event.clipboardData;
    if (!clipboard) {
      // No clipboard access: let the browser paste, then clean up.
      setTimeout(() => this.afterPasteSync(), 0);
      return;
    }

    // 1) Image from the clipboard -> insert as a data URL.
    const imageItem = Array.from(clipboard.items || []).find(
      (it) => it.kind === 'file' && it.type.startsWith('image/'),
    );
    if (imageItem) {
      event.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          this.editorArea?.nativeElement?.focus();
          document.execCommand('insertImage', false, dataUrl);
          this.afterPasteSync();
        };
        reader.readAsDataURL(file);
      }
      return;
    }

    // 2) Rich HTML -> sanitize (strip external / uncontrolled spacing) and insert.
    const html = clipboard.getData('text/html');
    if (html && html.trim()) {
      event.preventDefault();
      const clean = this.sanitizePastedHtml(html);
      this.editorArea?.nativeElement?.focus();
      document.execCommand('insertHTML', false, clean);
      this.afterPasteSync();
      return;
    }

    // 3) Plain text -> insert with no formatting at all.
    const text = clipboard.getData('text/plain');
    if (text) {
      event.preventDefault();
      this.editorArea?.nativeElement?.focus();
      document.execCommand('insertText', false, text);
      this.afterPasteSync();
      return;
    }

    // Nothing usable from the clipboard: fall back to default, then clean.
    setTimeout(() => this.afterPasteSync(), 0);
  }

  private afterPasteSync(): void {
    this.syncEditorContent();
    this.checkActiveTable();
    this.updateImageOverlayPosition();
  }

  /**
   * Cleans HTML coming from the clipboard before it is inserted into the editor.
   * Removes everything that introduces spacing the user cannot control
   * (margins, paddings, line-height, fixed widths/heights, float/position) plus
   * external junk (classes/ids, MS-Office markup, <style>/<script>/<meta>,
   * comments), while preserving visual formatting (bold, italic, color,
   * text-align, links, etc.). This is the main source of the "uncontrolled
   * spacing on paste" problem.
   */
  private sanitizePastedHtml(html: string): string {
    const doc = document.implementation.createHTMLDocument('');
    const container = doc.createElement('div');
    container.innerHTML = html;

    // Drop non-content tags entirely.
    container
      .querySelectorAll('style, script, meta, link, title, head, base')
      .forEach((n) => n.remove());

    // Drop HTML comments (Word emits a lot of conditional comments).
    const commentWalker = doc.createTreeWalker(container, NodeFilter.SHOW_COMMENT);
    const comments: Comment[] = [];
    while (commentWalker.nextNode()) comments.push(commentWalker.currentNode as Comment);
    comments.forEach((c) => c.remove());

    container.querySelectorAll<HTMLElement>('*').forEach((el) => {
      const tag = el.tagName.toLowerCase();

      // Unwrap MS-Office / namespaced elements (<o:p>, <w:...>), keeping text.
      if (tag.includes(':')) {
        this.unwrapElement(el);
        return;
      }

      // Remove external attributes that carry foreign styling / semantics.
      ['class', 'id', 'lang', 'align', 'valign', 'face'].forEach((a) =>
        el.removeAttribute(a),
      );

      // Clean inline styles: drop spacing / sizing / mso-* declarations.
      const styleAttr = el.getAttribute('style');
      if (styleAttr) {
        const cleaned = this.cleanInlineStyle(styleAttr, tag === 'img');
        if (cleaned) el.setAttribute('style', cleaned);
        else el.removeAttribute('style');
      }
    });

    return container.innerHTML;
  }

  /** Keeps visual style declarations, removes spacing / sizing / mso ones. */
  private cleanInlineStyle(style: string, isImage: boolean): string {
    return style
      .split(';')
      .map((decl) => decl.trim())
      .filter(Boolean)
      .filter((decl) => {
        const prop = decl.split(':')[0].trim().toLowerCase();
        if (prop.startsWith('mso-')) return false;
        if (prop.startsWith('margin') || prop.startsWith('padding')) return false;
        if (prop === 'line-height') return false;
        if (prop === 'position' || prop === 'float' || prop === 'clear') return false;
        // Keep explicit sizing only on images (avoids leaked fixed widths on text).
        if (!isImage && (prop === 'width' || prop === 'height')) return false;
        return true;
      })
      .join('; ');
  }

  /** Replaces an element with its children (removes the wrapper, keeps content). */
  private unwrapElement(el: HTMLElement): void {
    const parent = el.parentNode;
    if (!parent) {
      el.remove();
      return;
    }
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  }

  onBlur(): void {
    this.onTouched();
    // Allow small delay before clearing overlays in case user clicked the overlay toolbar
    setTimeout(() => {
      const activeElement = document.activeElement;
      const overlayClicked = activeElement && this.elementRef.nativeElement.querySelector('.image-overlay')?.contains(activeElement);
      if (!overlayClicked) {
        this.activeImage = null;
      }
    }, 150);
  }

  restoreSelection(): void {
    if (
      this.savedRange &&
      this.editorArea?.nativeElement?.contains(this.savedRange.commonAncestorContainer)
    ) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(this.savedRange);
      }
    }
  }

  insertText(text: string): void {
    if (this.disabled) return;
    if (this.editorArea?.nativeElement) {
      this.editorArea.nativeElement.focus();
      this.restoreSelection();
      document.execCommand('insertText', false, text);
      this.syncEditorContent();
      this.saveSelection();
    }
  }

  insertHtml(html: string): void {
    if (this.disabled) return;
    if (this.editorArea?.nativeElement) {
      this.editorArea.nativeElement.focus();
      this.restoreSelection();
      document.execCommand('insertHTML', false, html);
      this.syncEditorContent();
      this.saveSelection();
    }
  }

  /* ═════════════════════════════════════════
     Table Manipulation Methods
     ═════════════════════════════════════════ */

  private getActiveTableElements() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    let node: Node | null = selection.getRangeAt(0).startContainer;
    let cell: HTMLTableCellElement | null = null;
    let row: HTMLTableRowElement | null = null;
    let table: HTMLTableElement | null = null;

    while (node && node !== this.editorArea?.nativeElement) {
      if (node.nodeName === 'TD' || node.nodeName === 'TH') {
        cell = node as HTMLTableCellElement;
      } else if (node.nodeName === 'TR') {
        row = node as HTMLTableRowElement;
      } else if (node.nodeName === 'TABLE') {
        table = node as HTMLTableElement;
        break;
      }
      node = node.parentNode;
    }

    return table ? { cell, row, table } : null;
  }

  saveSelection(): void {
    if (this.disabled) return;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (this.editorArea?.nativeElement?.contains(range.commonAncestorContainer)) {
        this.savedRange = range.cloneRange();
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Close table menu if clicked outside table-picker-wrapper
    const tablePicker = this.elementRef.nativeElement.querySelector('.table-picker-wrapper');
    if (tablePicker && !tablePicker.contains(target)) {
      this.showTableMenu = false;
    }

    // Close color picker if clicked outside color-picker-wrapper
    const colorPicker = this.elementRef.nativeElement.querySelector('.color-picker-wrapper');
    if (colorPicker && !colorPicker.contains(target)) {
      this.showColorPicker = false;
    }

    // Close special title menu if clicked outside special-title-picker-wrapper
    const specialTitlePicker = this.elementRef.nativeElement.querySelector(
      '.special-title-picker-wrapper',
    );
    if (specialTitlePicker && !specialTitlePicker.contains(target)) {
      this.showSpecialTitleMenu = false;
    }

    // Close font menu if clicked outside font-picker-wrapper
    const fontPicker = this.elementRef.nativeElement.querySelector('.font-picker-wrapper');
    if (fontPicker && !fontPicker.contains(target)) {
      this.showFontMenu = false;
    }

    // Close font size menu if clicked outside font-size-picker-wrapper
    const fontSizePicker = this.elementRef.nativeElement.querySelector('.font-size-picker-wrapper');
    if (fontSizePicker && !fontSizePicker.contains(target)) {
      this.showFontSizeMenu = false;
    }

    // Close HR menu if clicked outside hr-picker-wrapper
    const hrPicker = this.elementRef.nativeElement.querySelector('.hr-picker-wrapper');
    if (hrPicker && !hrPicker.contains(target)) {
      this.showHrMenu = false;
    }
  }

  checkActiveTable(): void {
    const active = this.getActiveTableElements();
    const previousTable = this.activeTable;
    this.activeTable = active ? active.table : null;
    if (this.activeTable) {
      this.updateTableTrashPosition();
      if (this.tableResizeMode) {
        this.updateResizeHandles();
      }
    }
    // Reset resize mode if table changed or lost
    if (previousTable && previousTable !== this.activeTable) {
      this.tableResizeMode = false;
      this.colResizeHandles = [];
    }
    if (!this.activeTable) {
      this.tableResizeMode = false;
      this.colResizeHandles = [];
    }
    this.saveSelection();
  }

  updateTableTrashPosition(): void {
    if (!this.activeTable) return;
    const container = this.elementRef.nativeElement.querySelector('.editor-container');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const tableRect = this.activeTable.getBoundingClientRect();
    
    this.tableTrashTop = tableRect.top - containerRect.top - 14; 
    this.tableTrashLeft = tableRect.right - containerRect.left - 14;
  }

  onEditorClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'IMG') {
      this.activeImage = target as HTMLImageElement;
      this.updateImageOverlayPosition();
    } else {
      this.activeImage = null;
    }
  }

  updateImageOverlayPosition(): void {
    if (!this.activeImage) return;
    const container = this.elementRef.nativeElement.querySelector('.editor-container');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const imgRect = this.activeImage.getBoundingClientRect();

    this.imageOverlayTop = imgRect.top - containerRect.top;
    this.imageOverlayLeft = imgRect.left - containerRect.left;
    this.imageOverlayWidth = imgRect.width;
    this.imageOverlayHeight = imgRect.height;
  }

  alignImage(alignment: string): void {
    if (!this.activeImage) return;
    this.activeImage.style.display = 'block';
    
    if (alignment === 'left') {
      this.activeImage.style.margin = 'var(--space-2) auto var(--space-2) 0';
    } else if (alignment === 'center') {
      this.activeImage.style.margin = 'var(--space-2) auto';
    } else if (alignment === 'right') {
      this.activeImage.style.margin = 'var(--space-2) 0 var(--space-2) auto';
    }
    
    this.syncEditorContent();
    setTimeout(() => this.updateImageOverlayPosition(), 0);
  }

  deleteImage(): void {
    if (!this.activeImage) return;
    this.activeImage.remove();
    this.activeImage = null;
    this.syncEditorContent();
  }

  startResize(event: MouseEvent, handle: string): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.activeImage) return;

    this.isResizing = true;
    this.resizeHandle = handle;
    this.startX = event.clientX;
    this.startY = event.clientY;
    
    const rect = this.activeImage.getBoundingClientRect();
    this.startWidth = rect.width;
    this.startHeight = rect.height;
  }

  @HostListener('document:mousemove', ['$event'])
  onGlobalMouseMove(event: MouseEvent): void {
    // Image resize
    if (this.isResizing && this.activeImage) {
      event.preventDefault();
      const dx = event.clientX - this.startX;
      let newWidth = this.startWidth;

      if (this.resizeHandle === 'tr' || this.resizeHandle === 'br') {
        newWidth = this.startWidth + dx;
      } else if (this.resizeHandle === 'tl' || this.resizeHandle === 'bl') {
        newWidth = this.startWidth - dx;
      }

      if (newWidth > 20) {
        this.activeImage.style.width = `${newWidth}px`;
        this.activeImage.style.height = 'auto';
        this.updateImageOverlayPosition();
      }
      return;
    }

    // Table column resize
    if (this.isResizingCol && this.activeTable) {
      event.preventDefault();
      const dx = event.clientX - this.resizeStartX;
      const colIdx = this.resizeColIndex;
      const firstRow = this.activeTable.rows[0];
      if (!firstRow) return;

      const tableWidth = this.resizeStartTableWidth || this.activeTable.getBoundingClientRect().width;
      const leftWidthPx = this.resizeStartWidths[colIdx] + dx;
      const rightWidthPx = this.resizeStartWidths[colIdx + 1] - dx;

      if (leftWidthPx >= 30 && rightWidthPx >= 30) {
        const leftPct = (leftWidthPx / tableWidth) * 100;
        const rightPct = (rightWidthPx / tableWidth) * 100;
        // Apply widths as percentages to all cells in those columns
        Array.from(this.activeTable.rows).forEach(row => {
          if (row.cells[colIdx]) {
            row.cells[colIdx].style.width = `${leftPct}%`;
          }
          if (row.cells[colIdx + 1]) {
            row.cells[colIdx + 1].style.width = `${rightPct}%`;
          }
        });
        this.updateResizeHandles();
      }
      return;
    }

    // Table width resize
    if (this.isResizingTableWidth && this.activeTable) {
      event.preventDefault();
      const dx = event.clientX - this.resizeStartX;
      const newWidth = this.resizeStartTableWidth + dx;
      const container = this.elementRef.nativeElement.querySelector('.editor-area');
      if (!container) return;
      const containerWidth = container.getBoundingClientRect().width;
      const minWidth = 100;

      if (newWidth >= minWidth && newWidth <= containerWidth) {
        const pct = (newWidth / containerWidth) * 100;
        this.activeTable.style.width = `${pct}%`;
        this.activeTable.style.tableLayout = 'fixed';
        // Allow content to flow beside the table when it's narrower
        if (pct < 99) {
          this.activeTable.style.display = 'inline-table';
          this.activeTable.style.verticalAlign = 'top';
        } else {
          this.activeTable.style.display = '';
          this.activeTable.style.verticalAlign = '';
        }
        this.updateResizeHandles();
        this.updateTableTrashPosition();
      }
      return;
    }
  }

  @HostListener('document:mouseup')
  onGlobalMouseUp(): void {
    if (this.isResizing) {
      this.isResizing = false;
      this.syncEditorContent();
    }
    if (this.isResizingCol) {
      this.isResizingCol = false;
      this.syncEditorContent();
      this.updateResizeHandles();
    }
    if (this.isResizingTableWidth) {
      this.isResizingTableWidth = false;
      this.syncEditorContent();
      this.updateResizeHandles();
      this.updateTableTrashPosition();
    }
  }

  toggleTableMenu(): void {
    if (this.disabled) return;
    this.checkActiveTable();
    this.showTableMenu = !this.showTableMenu;
    this.showColorPicker = false;
    this.showSpecialTitleMenu = false;
    this.showFontMenu = false;
    this.showFontSizeMenu = false;
    this.showHrMenu = false;
    if (this.showTableMenu) {
      this.hoverRow = 1;
      this.hoverCol = 1;
    }
  }

  onGridHover(r: number, c: number): void {
    this.hoverRow = r;
    this.hoverCol = c;
  }

  onGridSelect(r: number, c: number): void {
    this.insertTable(r, c);
    this.showTableMenu = false;
  }

  insertTable(rows = 3, cols = 3): void {
    if (this.disabled) return;

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '12px';
    table.style.marginBottom = '12px';

    for (let r = 0; r < rows; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement(r === 0 ? 'th' : 'td');
        cell.style.border = '1px solid #000';
        cell.style.padding = '8px';
        cell.style.textAlign = 'left';
        cell.appendChild(document.createElement('br'));
        tr.appendChild(cell);
      }
      table.appendChild(tr);
    }

    this.editorArea?.nativeElement?.focus();
    const selection = window.getSelection();
    let range: Range | null = null;

    if (
      this.savedRange &&
      this.editorArea?.nativeElement?.contains(this.savedRange.commonAncestorContainer)
    ) {
      range = this.savedRange;
    } else if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    }

    if (range) {
      try {
        range.deleteContents();
        range.insertNode(table);
        const firstCell = table.querySelector('th, td');
        if (firstCell) {
          const newRange = document.createRange();
          newRange.setStart(firstCell, 0);
          newRange.collapse(true);
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
      } catch (err) {
        console.error('Erro ao inserir tabela na seleção:', err);
        this.editorArea.nativeElement.appendChild(table);
      }
    } else {
      this.editorArea.nativeElement.appendChild(table);
    }

    this.savedRange = null;
    this.syncEditorContent();
    this.checkActiveTable();
  }

  addColumn(after = true): void {
    const active = this.getActiveTableElements();
    if (!active || !active.cell || !active.table) return;

    const { cell, table } = active;
    const colIndex = cell.cellIndex;

    Array.from(table.rows).forEach((row) => {
      const isHeader = row.cells[0]?.nodeName === 'TH';
      const newCell = document.createElement(isHeader ? 'th' : 'td');
      newCell.style.border = '1px solid #000';
      newCell.style.padding = '8px';
      newCell.style.textAlign = 'left';
      newCell.appendChild(document.createElement('br'));

      const insertAt = after ? colIndex + 1 : colIndex;
      if (insertAt >= row.cells.length) {
        row.appendChild(newCell);
      } else {
        row.insertBefore(newCell, row.cells[insertAt]);
      }
    });

    this.syncEditorContent();
    this.showTableMenu = false;
  }

  deleteColumn(): void {
    const active = this.getActiveTableElements();
    if (!active || !active.cell || !active.table) return;

    const { cell, table } = active;
    const colIndex = cell.cellIndex;

    Array.from(table.rows).forEach((row) => {
      if (row.cells.length > colIndex) {
        row.deleteCell(colIndex);
      }
    });

    if (table.rows[0]?.cells.length === 0) {
      table.remove();
      this.activeTable = null;
    }

    this.syncEditorContent();
    this.showTableMenu = false;
  }

  addRow(after = true): void {
    const active = this.getActiveTableElements();
    if (!active || !active.row || !active.table) return;

    const { row, table } = active;
    const rowIndex = row.rowIndex;
    const colCount = row.cells.length;

    const newRow = document.createElement('tr');
    for (let i = 0; i < colCount; i++) {
      const newCell = document.createElement('td');
      newCell.style.border = '1px solid #000';
      newCell.style.padding = '8px';
      newCell.style.textAlign = 'left';
      newCell.appendChild(document.createElement('br'));
      newRow.appendChild(newCell);
    }

    const insertAt = after ? rowIndex + 1 : rowIndex;
    if (insertAt >= table.rows.length) {
      table.appendChild(newRow);
    } else {
      table.insertBefore(newRow, table.rows[insertAt]);
    }

    this.syncEditorContent();
    this.showTableMenu = false;
  }

  deleteRow(): void {
    const active = this.getActiveTableElements();
    if (!active || !active.row || !active.table) return;

    const { row, table } = active;
    table.deleteRow(row.rowIndex);

    if (table.rows.length === 0) {
      table.remove();
      this.activeTable = null;
    }

    this.syncEditorContent();
    this.showTableMenu = false;
  }

  deleteTable(): void {
    const active = this.getActiveTableElements();
    const tableToRemove = this.activeTable || (active ? active.table : null);
    if (!tableToRemove) return;

    tableToRemove.remove();
    this.activeTable = null;
    this.syncEditorContent();
    this.showTableMenu = false;
  }

  toggleHeaderRow(): void {
    const active = this.getActiveTableElements();
    if (!active || !active.table) return;

    const firstRow = active.table.rows[0];
    if (!firstRow) return;

    const cells = Array.from(firstRow.cells);
    const isCurrentlyHeader = cells[0]?.nodeName === 'TH';

    cells.forEach((cell) => {
      const newTagName = isCurrentlyHeader ? 'td' : 'th';
      const newCell = document.createElement(newTagName) as HTMLTableCellElement;

      newCell.style.cssText = cell.style.cssText;
      if (!isCurrentlyHeader) {
        newCell.style.fontWeight = 'bold';
        newCell.style.backgroundColor = 'var(--surface-bg-hover, #f5f5f5)';
      } else {
        newCell.style.fontWeight = 'normal';
        newCell.style.backgroundColor = 'transparent';
      }

      while (cell.firstChild) {
        newCell.appendChild(cell.firstChild);
      }

      firstRow.replaceChild(newCell, cell);
    });

    this.syncEditorContent();
    this.showTableMenu = false;
  }

  mergeCellRight(): void {
    const active = this.getActiveTableElements();
    if (!active || !active.cell || !active.row) return;

    const { cell, row } = active;
    const colIndex = cell.cellIndex;
    const nextCell = row.cells[colIndex + 1];
    if (!nextCell) return;

    while (nextCell.firstChild) {
      cell.appendChild(nextCell.firstChild);
    }

    const colSpan = (cell.colSpan || 1) + (nextCell.colSpan || 1);
    cell.colSpan = colSpan;

    nextCell.remove();
    this.syncEditorContent();
    this.showTableMenu = false;
  }

  splitCell(): void {
    const active = this.getActiveTableElements();
    if (!active || !active.cell || !active.row) return;

    const { cell, row } = active;
    if (cell.colSpan > 1) {
      const originalColSpan = cell.colSpan;
      cell.colSpan = 1;

      const colIndex = cell.cellIndex;
      for (let i = 1; i < originalColSpan; i++) {
        const newCell = document.createElement(cell.nodeName) as HTMLTableCellElement;
        newCell.style.cssText = cell.style.cssText;
        newCell.appendChild(document.createElement('br'));
        row.insertBefore(newCell, row.cells[colIndex + 1]);
      }
      this.syncEditorContent();
    }
    this.showTableMenu = false;
  }

  /* ═════════════════════════════════════════
     Table Resize Methods
     ═════════════════════════════════════════ */

  toggleTableResizeMode(): void {
    if (!this.activeTable) return;
    this.tableResizeMode = !this.tableResizeMode;
    if (this.tableResizeMode) {
      // Set table-layout to fixed for precise column widths
      this.activeTable.style.tableLayout = 'fixed';
      // Initialize column widths as percentages relative to the table width
      const firstRow = this.activeTable.rows[0];
      if (firstRow) {
        const tableWidth = this.activeTable.getBoundingClientRect().width;
        Array.from(firstRow.cells).forEach(cell => {
          const cellWidth = cell.getBoundingClientRect().width;
          const pct = (cellWidth / tableWidth) * 100;
          cell.style.width = `${pct}%`;
        });
      }
      this.updateResizeHandles();
    } else {
      this.colResizeHandles = [];
    }
  }

  updateResizeHandles(): void {
    if (!this.activeTable || !this.tableResizeMode) return;
    const container = this.elementRef.nativeElement.querySelector('.editor-container');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const tableRect = this.activeTable.getBoundingClientRect();
    const firstRow = this.activeTable.rows[0];
    if (!firstRow) return;

    const handles: { top: number; left: number; height: number }[] = [];
    const cells = Array.from(firstRow.cells);

    // Create handles between each column (not after the last one)
    for (let i = 0; i < cells.length - 1; i++) {
      const cellRect = cells[i].getBoundingClientRect();
      handles.push({
        top: tableRect.top - containerRect.top,
        left: cellRect.right - containerRect.left,
        height: tableRect.height,
      });
    }
    this.colResizeHandles = handles;

    // Table width handle (right edge)
    this.tableWidthHandle = {
      top: tableRect.top - containerRect.top,
      left: tableRect.right - containerRect.left,
      height: tableRect.height,
    };
  }

  startColResize(event: MouseEvent, colIndex: number): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.activeTable) return;

    this.isResizingCol = true;
    this.resizeColIndex = colIndex;
    this.resizeStartX = event.clientX;
    this.resizeStartTableWidth = this.activeTable.getBoundingClientRect().width;

    const firstRow = this.activeTable.rows[0];
    if (!firstRow) return;
    this.resizeStartWidths = Array.from(firstRow.cells).map(
      cell => cell.getBoundingClientRect().width
    );
  }

  startTableWidthResize(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.activeTable) return;

    this.isResizingTableWidth = true;
    this.resizeStartX = event.clientX;
    this.resizeStartTableWidth = this.activeTable.getBoundingClientRect().width;
  }

  /* ═════════════════════════════════════════
     Table Border Style Methods
     ═════════════════════════════════════════ */

  setTableBorderStyle(style: string): void {
    if (!this.activeTable) return;

    const borderValue = style === 'none' ? 'none' : `1px ${style} #000`;

    // Apply to the table itself
    this.activeTable.style.borderStyle = style === 'none' ? 'none' : style;

    // Apply to all cells (th and td)
    const cells = this.activeTable.querySelectorAll<HTMLTableCellElement>('th, td');
    cells.forEach((cell) => {
      if (style === 'none') {
        cell.style.border = 'none';
      } else {
        cell.style.border = borderValue;
      }
    });

    // Also update the table border
    if (style === 'none') {
      this.activeTable.style.border = 'none';
    } else {
      this.activeTable.style.border = borderValue;
    }

    this.syncEditorContent();
    this.showTableMenu = false;
  }

  /* ═════════════════════════════════════════
     Horizontal Rule Methods
     ═════════════════════════════════════════ */

  toggleHrMenu(): void {
    if (this.disabled) return;
    this.showHrMenu = !this.showHrMenu;
    this.showColorPicker = false;
    this.showTableMenu = false;
    this.showSpecialTitleMenu = false;
    this.showFontMenu = false;
    this.showFontSizeMenu = false;
  }

  insertHorizontalRule(style: string): void {
    const hrHtml = `<hr style="border: none; border-top: 2px ${style} #000; margin: 16px 0;">`;
    this.insertHtml(hrHtml);
    this.showHrMenu = false;
  }
}
