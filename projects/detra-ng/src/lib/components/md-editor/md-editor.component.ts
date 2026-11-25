import {
  Component,
  Directive,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  ViewChild,
  ContentChildren,
  QueryList,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  NgZone,
  ChangeDetectorRef,
  inject,
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
import { DS_SKELETON_HOST, DsSkeletonDirective } from '../skeleton/skeleton.directive';

let nextId = 0;

/**
 * Ferramenta do projeto na barra do editor (TK2026-01734). Marque cada botão projetado com `dsMdTool`
 * (`<button dsMdTool ...>` dentro de `<ds-md-editor>`): ele entra na última coluna da barra, com o mesmo
 * visual das ferramentas da lib. Os botões não tiram a seleção do texto (o toque não move o foco).
 */
@Directive({
  selector: '[dsMdTool]',
  standalone: true,
  host: { class: 'ds-md-tool ds-md-tool--custom' },
})
export class MdEditorToolDirective {}

/** Cor oferecida na coluna "Cor do texto". `value` em hexadecimal (#rgb ou #rrggbb). */
export interface MdEditorTextColor {
  name: string;
  value: string;
}

export const MD_EDITOR_TEXT_COLORS: MdEditorTextColor[] = [
  { name: 'Vermelho', value: '#e11d48' },
  { name: 'Laranja', value: '#ea580c' },
  { name: 'Âmbar', value: '#ca8a04' },
  { name: 'Verde', value: '#16a34a' },
  { name: 'Azul-petróleo', value: '#0d9488' },
  { name: 'Azul', value: '#2563eb' },
  { name: 'Violeta', value: '#7c3aed' },
  { name: 'Rosa', value: '#db2777' },
  { name: 'Cinza', value: '#64748b' },
];

/** Dados da imagem já convertida para JPEG, entregues ao `imageUpload`. */
export interface MdEditorImageMeta {
  width: number;
  height: number;
  /** Tamanho do JPEG em bytes. */
  size: number;
  /** Nome do arquivo de origem (vazio quando colada). */
  name: string;
  /** Como a imagem chegou: botão da barra, colada, arrastada de fora ou inserida pelo teclado do celular. */
  source: 'upload' | 'paste' | 'drop' | 'keyboard';
}

/**
 * Envia o JPEG e devolve o endereço que fica no Markdown (ex.: `note-image://<id>`).
 * `progress` recebe de 0 a 1. Rejeitar a promise tira a imagem da nota e emite `imageError`.
 */
export type MdEditorImageUploader = (
  image: Blob,
  meta: MdEditorImageMeta,
  progress: (fraction: number) => void,
) => Promise<string>;

/** Troca o endereço do Markdown por um que o `<img>` consegue mostrar (ex.: blob: baixado com o token). */
export type MdEditorImageResolver = (src: string) => string | Promise<string>;

export interface MdEditorImageError {
  reason: 'unsupported' | 'conversion' | 'upload';
  name?: string;
  error?: unknown;
}

/** Endereços aceitos em `![](...)`: nunca `javascript:` ou caminhos relativos ao app. */
const SAFE_IMAGE_SRC = /^(?:https?:\/\/|note-image:\/\/|data:image\/(?:png|jpe?g|gif|webp);base64,)/i;
const IMAGE_MD = /!\[([^\]\n]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"\n]*")?\s*\)/g;
const IMAGE_MIN_WIDTH = 64;

type MdToolbarGroup = 'style' | 'block' | 'list' | 'insert' | 'table' | 'color' | 'custom';

/** Formatação onde está o cursor: deixa os botões correspondentes marcados. */
interface MdActiveFormat {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  block: string;
  ul: boolean;
  ol: boolean;
  check: boolean;
  quote: boolean;
  codeBlock: boolean;
  link: boolean;
  color: string | null;
}

const NO_FORMAT: MdActiveFormat = {
  bold: false, italic: false, underline: false, strike: false, code: false, block: 'p',
  ul: false, ol: false, check: false, quote: false, codeBlock: false, link: false, color: null,
};

/** Celular e tablet: a barra começa recolhida no pincel. */
const COMPACT_QUERY = '(max-width: 767px), (hover: none) and (pointer: coarse)';
const TOUCH_QUERY = '(hover: none) and (pointer: coarse)';
/** Cor provisória usada para tirar a cor de um trecho (o navegador divide os spans por nós). */
const COLOR_SENTINEL = '#010203';

@Component({
  selector: 'ds-md-editor',
  hostDirectives: [DS_SKELETON_HOST],
  standalone: true,
  imports: [CommonModule, FormsModule, FlowchartEditorComponent],
  template: `
    <div
      class="ds-md-editor-wrapper"
      [class.ds-md-editor--error]="error"
      [class.ds-md-editor--disabled]="disabled"
    >
      <label *ngIf="label" class="ds-md-editor__label" [attr.for]="inputId" data-sk="text">
        {{ label }}
        <span *ngIf="required" class="ds-md-editor__required">*</span>
      </label>

      <div
        class="editor-container"
        [class.editor-container--disabled]="disabled"
      >
        <!--
          Barra de ferramentas em ilha (TK2026-01734): uma pílula com um botão por grupo. Cada grupo abre
          uma coluna com as opções (para cima no dock, para baixo no topo). O pincel recolhe e expande a
          barra no celular; no desktop ela fica sempre aberta. No fim, a área do projeto ([dsMdTool]).
        -->
        @if (!disabled) {
          <div
            class="editor-toolbar ds-md-bar"
            [class.ds-md-bar--dock]="toolbarPlacement === 'dock'"
            [class.ds-md-bar--top]="toolbarPlacement !== 'dock'"
            [class.is-compact]="compact"
            [class.is-collapsible]="collapsible"
            [class.is-expanded]="isExpanded"
            [class.has-open]="!!openGroup"
            [style.--ds-md-kb.px]="keyboardInset"
            role="toolbar"
            aria-label="Ferramentas de formatação"
            (keydown.escape)="closeGroup()"
            (pointerdown)="$event.preventDefault()"
            (mousedown)="$event.preventDefault()"
          >
            <div class="ds-md-bar__row">
              @if (collapsible) {
                <button
                  type="button"
                  class="ds-md-brush"
                  data-sk="circle"
                  [class.is-on]="isExpanded"
                  (click)="toggleExpanded()"
                  [attr.aria-expanded]="isExpanded"
                  [attr.aria-label]="isExpanded ? 'Recolher as ferramentas de formatação' : 'Abrir as ferramentas de formatação'"
                  [title]="isExpanded ? 'Recolher formatação' : 'Formatar o texto'"
                >
                  <i class="fa-solid fa-paintbrush" aria-hidden="true"></i>
                </button>
              } @else {
                <span class="ds-md-brush ds-md-brush--static" aria-hidden="true" data-sk="circle">
                  <i class="fa-solid fa-paintbrush"></i>
                </span>
              }

              <div class="ds-md-bar__reveal" [attr.aria-hidden]="!isExpanded" [attr.inert]="isExpanded ? null : ''">
                <div class="ds-md-bar__track" data-sk="pill" [class.can-left]="canScrollLeft" [class.can-right]="canScrollRight">
                 <div class="ds-md-bar__scroll" (scroll)="onTrackScroll()">
                  <button type="button" class="ds-md-group" style="--i: 0" data-group="style"
                    [class.is-open]="openGroup === 'style'"
                    [class.is-active]="active.bold || active.italic || active.underline || active.strike || active.code"
                    (click)="toggleGroup('style', $event)" aria-haspopup="true" [attr.aria-expanded]="openGroup === 'style'"
                    aria-label="Estilo do texto" title="Negrito, itálico, sublinhado e tachado">
                    <i class="fa-solid fa-bold" aria-hidden="true"></i>
                  </button>

                  <button type="button" class="ds-md-group ds-md-group--text" style="--i: 1" data-group="block"
                    [class.is-open]="openGroup === 'block'"
                    [class.is-active]="active.block !== 'p'"
                    (click)="toggleGroup('block', $event)" aria-haspopup="true" [attr.aria-expanded]="openGroup === 'block'"
                    aria-label="Títulos e parágrafo" title="Títulos e parágrafo">
                    {{ blockLabel }}
                  </button>

                  <button type="button" class="ds-md-group" style="--i: 2" data-group="list"
                    [class.is-open]="openGroup === 'list'"
                    [class.is-active]="active.ul || active.ol || active.check"
                    (click)="toggleGroup('list', $event)" aria-haspopup="true" [attr.aria-expanded]="openGroup === 'list'"
                    aria-label="Listas" title="Listas e checklist">
                    <i class="fa-solid" [class.fa-list-ul]="!active.ol && !active.check" [class.fa-list-ol]="active.ol"
                      [class.fa-square-check]="active.check && !active.ol" aria-hidden="true"></i>
                  </button>

                  <button type="button" class="ds-md-group" style="--i: 3" data-group="insert"
                    [class.is-open]="openGroup === 'insert'"
                    [class.is-active]="active.quote || active.codeBlock || active.link"
                    (click)="toggleGroup('insert', $event)" aria-haspopup="true" [attr.aria-expanded]="openGroup === 'insert'"
                    aria-label="Citação, código, link e linha" title="Citação, código, link e linha">
                    <i class="fa-solid fa-quote-left" aria-hidden="true"></i>
                  </button>

                  <button type="button" class="ds-md-group" style="--i: 4" data-group="table"
                    [class.is-open]="openGroup === 'table'"
                    (click)="toggleGroup('table', $event)" aria-haspopup="true" [attr.aria-expanded]="openGroup === 'table'"
                    aria-label="Inserir tabela" title="Inserir tabela">
                    <i class="fa-solid fa-table-cells" aria-hidden="true"></i>
                  </button>

                  @if (imageUpload) {
                    <button type="button" class="ds-md-group ds-md-group--image" style="--i: 5" data-group="image"
                      (click)="pickImage()" [attr.aria-label]="imageLabel" [title]="imageHint">
                      <i class="fa-solid fa-image" aria-hidden="true"></i>
                    </button>
                  }

                  <button type="button" class="ds-md-group ds-md-group--color" style="--i: 5" data-group="color"
                    [class.is-open]="openGroup === 'color'"
                    [class.is-active]="!!active.color"
                    (click)="toggleGroup('color', $event)" aria-haspopup="true" [attr.aria-expanded]="openGroup === 'color'"
                    aria-label="Cor do texto" title="Cor do texto">
                    <i class="fa-solid fa-font" aria-hidden="true"></i>
                    <span class="ds-md-group__ink" [style.background]="active.color || null" aria-hidden="true"></span>
                  </button>

                  @if (showKeyboardButton) {
                    <button type="button" class="ds-md-group ds-md-group--keyboard" style="--i: 6"
                      [class.is-active]="keyboardHidden"
                      (click)="toggleKeyboard()" [attr.aria-pressed]="keyboardHidden"
                      [attr.aria-label]="keyboardHidden ? 'Mostrar o teclado' : 'Esconder o teclado'"
                      [title]="keyboardHidden ? 'Mostrar o teclado' : 'Esconder o teclado'">
                      <i class="fa-solid fa-keyboard" aria-hidden="true"></i>
                      <span class="ds-md-group__chevron" aria-hidden="true">
                        <i class="fa-solid" [class.fa-chevron-down]="!keyboardHidden" [class.fa-chevron-up]="keyboardHidden"></i>
                      </span>
                    </button>
                  }

                  @if (hasCustomTools) {
                    <span class="ds-md-bar__sep" aria-hidden="true"></span>
                    <button type="button" class="ds-md-group ds-md-group--custom" style="--i: 7" data-group="custom"
                      [class.is-open]="openGroup === 'custom'"
                      (click)="toggleGroup('custom', $event)" aria-haspopup="true" [attr.aria-expanded]="openGroup === 'custom'"
                      [attr.aria-label]="customToolsLabel" [title]="customToolsLabel">
                      <i [class]="customToolsIcon" aria-hidden="true"></i>
                    </button>
                  }
                 </div>
                </div>
              </div>

              <ng-content select="[dsMdToolbarEnd]"></ng-content>
            </div>

            <!-- Colunas de cada grupo -->
            <div class="ds-md-col" role="group" aria-label="Estilo do texto" [class.is-open]="openGroup === 'style'" [style.--x.px]="colX['style']">
              <button type="button" class="ds-md-tool" style="--i: 0" [class.is-active]="active.bold" (click)="exec('bold')" title="Negrito (Ctrl+B)" aria-label="Negrito" [attr.aria-pressed]="active.bold"><i class="fa-solid fa-bold" aria-hidden="true"></i></button>
              <button type="button" class="ds-md-tool" style="--i: 1" [class.is-active]="active.italic" (click)="exec('italic')" title="Itálico (Ctrl+I)" aria-label="Itálico" [attr.aria-pressed]="active.italic"><i class="fa-solid fa-italic" aria-hidden="true"></i></button>
              <button type="button" class="ds-md-tool" style="--i: 2" [class.is-active]="active.underline" (click)="exec('underline')" title="Sublinhado (Ctrl+U)" aria-label="Sublinhado" [attr.aria-pressed]="active.underline"><i class="fa-solid fa-underline" aria-hidden="true"></i></button>
              <button type="button" class="ds-md-tool" style="--i: 3" [class.is-active]="active.strike" (click)="exec('strikeThrough')" title="Tachado" aria-label="Tachado" [attr.aria-pressed]="active.strike"><i class="fa-solid fa-strikethrough" aria-hidden="true"></i></button>
              <button type="button" class="ds-md-tool" style="--i: 4" [class.is-active]="active.code" (click)="insertInlineCode()" title="Código no texto" aria-label="Código no texto" [attr.aria-pressed]="active.code"><i class="fa-solid fa-code" aria-hidden="true"></i></button>
              <button type="button" class="ds-md-tool ds-md-tool--quiet" style="--i: 5" (click)="exec('removeFormat')" title="Limpar formatação" aria-label="Limpar formatação"><i class="fa-solid fa-eraser" aria-hidden="true"></i></button>
            </div>

            <div class="ds-md-col" role="group" aria-label="Títulos e parágrafo" [class.is-open]="openGroup === 'block'" [style.--x.px]="colX['block']">
              <button type="button" class="ds-md-tool ds-md-tool--text" style="--i: 0" [class.is-active]="active.block === 'h1'" (click)="setHeading('H1'); closeGroup()" title="Título 1" [attr.aria-pressed]="active.block === 'h1'">H1</button>
              <button type="button" class="ds-md-tool ds-md-tool--text" style="--i: 1" [class.is-active]="active.block === 'h2'" (click)="setHeading('H2'); closeGroup()" title="Título 2" [attr.aria-pressed]="active.block === 'h2'">H2</button>
              <button type="button" class="ds-md-tool ds-md-tool--text" style="--i: 2" [class.is-active]="active.block === 'h3'" (click)="setHeading('H3'); closeGroup()" title="Título 3" [attr.aria-pressed]="active.block === 'h3'">H3</button>
              <button type="button" class="ds-md-tool ds-md-tool--text" style="--i: 3" [class.is-active]="active.block === 'h4'" (click)="setHeading('H4'); closeGroup()" title="Título 4" [attr.aria-pressed]="active.block === 'h4'">H4</button>
              <button type="button" class="ds-md-tool ds-md-tool--text" style="--i: 4" [class.is-active]="active.block === 'p'" (click)="setHeading('P'); closeGroup()" title="Parágrafo normal" [attr.aria-pressed]="active.block === 'p'">P</button>
            </div>

            <div class="ds-md-col" role="group" aria-label="Listas" [class.is-open]="openGroup === 'list'" [style.--x.px]="colX['list']">
              <button type="button" class="ds-md-tool" style="--i: 0" [class.is-active]="active.ul" (click)="exec('insertUnorderedList'); closeGroup()" title="Lista com marcadores" aria-label="Lista com marcadores" [attr.aria-pressed]="active.ul"><i class="fa-solid fa-list-ul" aria-hidden="true"></i></button>
              <button type="button" class="ds-md-tool" style="--i: 1" [class.is-active]="active.ol" (click)="exec('insertOrderedList'); closeGroup()" title="Lista numerada" aria-label="Lista numerada" [attr.aria-pressed]="active.ol"><i class="fa-solid fa-list-ol" aria-hidden="true"></i></button>
              <button type="button" class="ds-md-tool" style="--i: 2" [class.is-active]="active.check" (click)="insertChecklist(); closeGroup()" title="Checklist" aria-label="Checklist" [attr.aria-pressed]="active.check"><i class="fa-solid fa-square-check" aria-hidden="true"></i></button>
            </div>

            <div class="ds-md-col" role="group" aria-label="Inserir" [class.is-open]="openGroup === 'insert'" [style.--x.px]="colX['insert']">
              <button type="button" class="ds-md-tool" style="--i: 0" [class.is-active]="active.quote" (click)="toggleBlockquote(); closeGroup()" title="Citação" aria-label="Citação" [attr.aria-pressed]="active.quote"><i class="fa-solid fa-quote-left" aria-hidden="true"></i></button>
              <button type="button" class="ds-md-tool" style="--i: 1" [class.is-active]="active.link" (click)="insertLink(); closeGroup()" title="Link (Ctrl+K)" aria-label="Link" [attr.aria-pressed]="active.link"><i class="fa-solid fa-link" aria-hidden="true"></i></button>
              <button type="button" class="ds-md-tool" style="--i: 2" [class.is-active]="active.codeBlock" (click)="insertCodeBlock(); closeGroup()" title="Bloco de código" aria-label="Bloco de código" [attr.aria-pressed]="active.codeBlock"><i class="fa-solid fa-file-code" aria-hidden="true"></i></button>
              <button type="button" class="ds-md-tool" style="--i: 3" (click)="insertHorizontalRule(); closeGroup()" title="Linha divisória" aria-label="Linha divisória"><i class="fa-solid fa-minus" aria-hidden="true"></i></button>
              @if (enableFlowchart) {
                <button type="button" class="ds-md-tool" style="--i: 4" (click)="openFlowchartEditor(); closeGroup()" title="Desenhar fluxograma / diagrama" aria-label="Fluxograma"><i class="fa-solid fa-diagram-project" aria-hidden="true"></i></button>
              }
            </div>

            <div class="ds-md-col ds-md-col--table" role="group" aria-label="Inserir tabela" [class.is-open]="openGroup === 'table'" [style.--x.px]="colX['table']">
              <div class="ds-md-grid" (mouseleave)="onGridHover(2, 2)">
                @for (r of gridRows; track r) {
                  <div class="ds-md-grid__row">
                    @for (c of gridCols; track c) {
                      <button type="button" class="ds-md-grid__cell" tabindex="-1"
                        [class.is-on]="r <= hoverRow && c <= hoverCol"
                        (mouseenter)="onGridHover(r, c)" (focus)="onGridHover(r, c)" (click)="onGridSelect(r, c)"
                        [attr.aria-label]="r + ' por ' + c"></button>
                    }
                  </div>
                }
              </div>
              <span class="ds-md-grid__size">{{ hoverRow }} × {{ hoverCol }}</span>
            </div>

            <div class="ds-md-col ds-md-col--color" role="group" aria-label="Cor do texto" [class.is-open]="openGroup === 'color'" [style.--x.px]="colX['color']">
              @for (color of textColors; track color.value; let i = $index) {
                <button type="button" class="ds-md-swatch" [style.--i]="i" [style.--swatch]="color.value"
                  [class.is-active]="active.color === color.value.toLowerCase()"
                  (click)="applyTextColor(color.value)" [title]="color.name" [attr.aria-label]="color.name"
                  [attr.aria-pressed]="active.color === color.value.toLowerCase()"></button>
              }
              <button type="button" class="ds-md-swatch ds-md-swatch--none" [style.--i]="textColors.length"
                [class.is-active]="!active.color" (click)="applyTextColor(null)" title="Cor padrão" aria-label="Cor padrão">
                <i class="fa-solid fa-droplet-slash" aria-hidden="true"></i>
              </button>
            </div>

            <div class="ds-md-col ds-md-col--custom" role="group" [attr.aria-label]="customToolsLabel" [class.is-open]="openGroup === 'custom'"
              [style.--x.px]="colX['custom']" (click)="onCustomToolClick($event)">
              <ng-content select="[dsMdTool]"></ng-content>
            </div>
          </div>
        }

        <!-- Área Editável WYSIWYG (o usuário já vê o resultado final estilizado) -->
        <div
          #editorArea
          [id]="inputId"
          class="editor-area"
          data-sk
          [attr.contenteditable]="!disabled"
          [attr.data-placeholder]="placeholder"
          [style.min-height]="minHeight"
          (focus)="onEditorFocus()"
          (input)="onEditorInput()"
          (click)="onEditorClick($event)"
          (blur)="onEditorBlur()"
          (paste)="onEditorPaste($event)"
          (keydown)="onEditorKeydown($event)"
          (beforeinput)="onEditorBeforeInput($event)"
          (dragover)="onEditorDragOver($event)"
          (drop)="onEditorDrop($event)"
          (dragstart)="onEditorDragStart($event)"
        ></div>

        @if (imageUpload) {
          <input #imageInput type="file" accept="image/*" multiple class="ds-md-image-input" tabindex="-1" aria-hidden="true"
            (change)="onImagePicked($event)" />
        }

        <!-- Modal do Desenhador de Fluxogramas -->
        <ds-flowchart-editor
          *ngIf="showFlowchartModal"
          [initialData]="currentFlowchartData"
          (save)="onFlowchartSave($event)"
          (cancel)="onFlowchartCancel()"
        ></ds-flowchart-editor>

        <div *ngIf="error" class="editor-error" data-sk="text">
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
export class MdEditorComponent implements AfterViewInit, OnDestroy, ControlValueAccessor {
  @Input() label?: string;
  @Input() placeholder = 'Escreva sua mensagem...';
  @Input() required = false;
  @Input() disabled = false;
  @Input() error?: string;
  @Input() minHeight = '100px';

  /**
   * Onde a barra fica: `top` (padrão) no alto do editor, fixa ao rolar, com as colunas abrindo para baixo;
   * `dock` flutuando no rodapé da tela (acima do teclado do celular), com as colunas subindo.
   * No dock a posição é ajustada por `--ds-md-dock-bottom`, `--ds-md-dock-left` e `--ds-md-dock-right`.
   */
  @Input() toolbarPlacement: 'top' | 'dock' = 'top';
  /** `auto`: recolhida no pincel no celular/tablet e sempre aberta no desktop. */
  @Input() toolbarCollapse: 'auto' | 'always' | 'never' = 'auto';
  /** Desenhador de fluxogramas na barra. Fluxogramas que já estão no texto continuam aparecendo. */
  @Input() enableFlowchart = true;
  /** Botão de esconder/mostrar o teclado virtual. `auto`: só em telas de toque. */
  @Input() keyboardToggle: 'auto' | 'always' | 'never' = 'auto';
  /** Cores da coluna "Cor do texto". */
  @Input() textColors: MdEditorTextColor[] = MD_EDITOR_TEXT_COLORS;
  /** Ícone (classes Font Awesome) e nome do grupo das ferramentas do projeto (`[dsMdTool]`). */
  @Input() customToolsIcon = 'fa-solid fa-shapes';
  @Input() customToolsLabel = 'Ferramentas';

  /**
   * Imagens (TK2026-01756). Com `imageUpload` a barra ganha o botão Imagem e o editor aceita colar e
   * arrastar imagens. Toda imagem é convertida para JPEG no aparelho (lado maior até `imageMaxDimension`)
   * antes de chegar aqui; o que a função devolver vai para o Markdown como `![alt|largura](src)`.
   */
  @Input() imageUpload?: MdEditorImageUploader;
  /** Endereço exibível para o `src` do Markdown. Sem ele, só `http(s)` e `data:` aparecem. */
  @Input() imageResolver?: MdEditorImageResolver;
  @Input() imageMaxDimension = 2560;
  @Input() imageQuality = 0.85;
  @Input() imageLabel = 'Inserir imagem';
  @Input() imageHint = 'Inserir imagem (ou cole da área de transferência)';
  /** Rótulos da mini barra da imagem selecionada (para traduzir no projeto). */
  @Input() imageTexts: Record<'small' | 'medium' | 'full' | 'remove' | 'move' | 'resize' | 'close', string> = {
    small: 'Pequena', medium: 'Média', full: 'Largura total', remove: 'Remover imagem',
    move: 'Arraste para mover', resize: 'Arraste para redimensionar', close: 'Fechar',
  };
  /** Falha ao converter ou enviar uma imagem (a imagem sai da nota). */
  @Output() imageError = new EventEmitter<MdEditorImageError>();

  /** O teclado virtual foi mostrado (true) ou escondido (false) pelo botão da barra. */
  @Output() keyboardVisibleChange = new EventEmitter<boolean>();
  /** A barra foi expandida (true) ou recolhida (false) pelo pincel. */
  @Output() toolbarExpandedChange = new EventEmitter<boolean>();

  @ViewChild('editorArea') editorArea!: ElementRef<HTMLDivElement>;
  @ViewChild('imageInput') imageInput?: ElementRef<HTMLInputElement>;

  // Imagens
  private imageRange: Range | null = null;
  private readonly resolvedImages = new Map<string, string>();
  private readonly localImageUrls = new Set<string>();
  private selectedImage: HTMLElement | null = null;
  private imageGesture: ImageGesture | null = null;
  private lightbox: HTMLElement | null = null;
  @ContentChildren(MdEditorToolDirective, { descendants: true }) customTools?: QueryList<MdEditorToolDirective>;

  readonly inputId = `ds-md-editor-${++nextId}`;

  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  // Barra em ilha
  openGroup: MdToolbarGroup | null = null;
  colX: Record<string, number> = {};
  compact = false;
  touch = false;
  expanded = false;
  keyboardHidden = false;
  keyboardInset = 0;
  active: MdActiveFormat = { ...NO_FORMAT };
  private togglingKeyboard = false;
  private activeFrame = 0;
  private cleanup: Array<() => void> = [];

  // Controle de tabela
  hoverRow = 2;
  hoverCol = 2;
  gridRows = [1, 2, 3, 4, 5, 6];
  gridCols = [1, 2, 3, 4, 5, 6];

  // Controle de Fluxograma (Flowchart Designer)
  showFlowchartModal = false;
  currentFlowchartData: FlowchartData | null = null;
  private flowchartInsertionRange: Range | null = null;
  private editingFlowchartTarget: HTMLElement | null = null;

  // Armazena último Markdown emitido para evitar loops de digitação
  private lastMarkdown = '';

  // ControlValueAccessor
  onChange: (val: string) => void = () => {};
  onTouched: () => void = () => {};

  /** Compatibilidade: o seletor de tabela agora é a coluna `table` da barra. */
  get showTableMenu(): boolean {
    return this.openGroup === 'table';
  }
  set showTableMenu(open: boolean) {
    if (open) this.openGroup = 'table';
    else if (this.openGroup === 'table') this.openGroup = null;
  }

  get collapsible(): boolean {
    return this.toolbarCollapse === 'always' || (this.toolbarCollapse === 'auto' && this.compact);
  }

  get isExpanded(): boolean {
    return !this.collapsible || this.expanded;
  }

  get showKeyboardButton(): boolean {
    return this.keyboardToggle === 'always' || (this.keyboardToggle === 'auto' && this.touch);
  }

  get hasCustomTools(): boolean {
    return !!this.customTools?.length;
  }

  get blockLabel(): string {
    switch (this.active.block) {
      case 'h1': return 'H1';
      case 'h2': return 'H2';
      case 'h3': return 'H3';
      case 'h4': return 'H4';
      case 'h5': return 'H5';
      case 'h6': return 'H6';
      default: return 'P';
    }
  }

  ngAfterViewInit(): void {
    if (this.lastMarkdown && this.editorArea) {
      this.editorArea.nativeElement.innerHTML = this.markdownToHtml(this.lastMarkdown);
      this.hydrateImages();
    }
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p');
    } catch (e) {}
    this.listen();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.activeFrame);
    this.cleanup.forEach((off) => off());
    this.cleanup = [];
    this.endImageGesture(false);
    this.closeLightbox();
    this.localImageUrls.forEach((url) => URL.revokeObjectURL(url));
    this.localImageUrls.clear();
  }

  /** Seleção, cliques fora da coluna aberta, teclado virtual e tamanho da tela. Tudo fora do Angular. */
  private listen(): void {
    if (typeof window === 'undefined') return;
    const compactQuery = window.matchMedia?.(COMPACT_QUERY);
    const touchQuery = window.matchMedia?.(TOUCH_QUERY);
    this.compact = !!compactQuery?.matches;
    this.touch = !!touchQuery?.matches;
    this.expanded = !this.compact;

    const onSelection = () => this.scheduleActive();
    const onPointer = (event: PointerEvent) => {
      if (!this.openGroup) return;
      const target = event.target as Element | null;
      if (target?.closest?.('.ds-md-bar') && this.host.nativeElement.contains(target)) return;
      this.zone.run(() => this.closeGroup());
    };
    const onViewport = () => this.updateKeyboardInset();
    const onMedia = () => this.zone.run(() => {
      const wasCompact = this.compact;
      this.compact = !!compactQuery?.matches;
      this.touch = !!touchQuery?.matches;
      if (wasCompact !== this.compact) this.expanded = !this.compact;
    });

    const area = this.editorArea?.nativeElement;
    const onImageDown = (event: PointerEvent) => this.onImagePointerDown(event);
    this.zone.runOutsideAngular(() => {
      area?.addEventListener('pointerdown', onImageDown);
      document.addEventListener('selectionchange', onSelection);
      document.addEventListener('pointerdown', onPointer, true);
      window.visualViewport?.addEventListener('resize', onViewport);
      window.visualViewport?.addEventListener('scroll', onViewport);
      compactQuery?.addEventListener?.('change', onMedia);
      touchQuery?.addEventListener?.('change', onMedia);
    });
    this.cleanup.push(() => {
      area?.removeEventListener('pointerdown', onImageDown);
      document.removeEventListener('selectionchange', onSelection);
      document.removeEventListener('pointerdown', onPointer, true);
      window.visualViewport?.removeEventListener('resize', onViewport);
      window.visualViewport?.removeEventListener('scroll', onViewport);
      compactQuery?.removeEventListener?.('change', onMedia);
      touchQuery?.removeEventListener?.('change', onMedia);
    });
    this.updateKeyboardInset();
    this.cdr.detectChanges();
    this.updateScrollHints();
    this.cdr.detectChanges();
  }

  /** No navegador do celular o teclado cobre o rodapé: o dock sobe a altura dele. */
  private updateKeyboardInset(): void {
    if (this.toolbarPlacement !== 'dock') return;
    const viewport = window.visualViewport;
    const inset = viewport ? Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop)) : 0;
    if (inset === this.keyboardInset) return;
    this.zone.run(() => { this.keyboardInset = inset; });
  }

  private scheduleActive(): void {
    cancelAnimationFrame(this.activeFrame);
    this.activeFrame = requestAnimationFrame(() => this.refreshActive());
  }

  /** Marca os botões da formatação onde o cursor (ou o início da seleção) está. */
  refreshActive(): void {
    const area = this.editorArea?.nativeElement;
    const selection = window.getSelection();
    if (!area || !selection?.rangeCount) return;
    const node = selection.anchorNode;
    if (!node || !area.contains(node)) return;
    const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
    const inside = (selector: string): Element | null => {
      const found = element?.closest(selector) ?? null;
      return found && found !== area && area.contains(found) ? found : null;
    };
    const blockEl = inside('h1, h2, h3, h4, h5, h6');
    const next: MdActiveFormat = {
      bold: !!inside('strong, b'),
      italic: !!inside('em, i:not([class*="fa-"])'),
      underline: !!inside('u') || this.commandState('underline'),
      strike: !!inside('del, s, strike') || this.commandState('strikeThrough'),
      code: !!inside('code') && !inside('pre'),
      block: blockEl ? blockEl.tagName.toLowerCase() : 'p',
      ul: !!inside('ul') && !inside('ol'),
      ol: !!inside('ol'),
      check: !!inside('.md-check-item'),
      quote: !!inside('blockquote'),
      codeBlock: !!inside('pre'),
      link: !!inside('a'),
      color: this.colorAt(element, area),
    };
    if (JSON.stringify(next) === JSON.stringify(this.active)) return;
    this.zone.run(() => {
      this.active = next;
      this.cdr.markForCheck();
    });
  }

  private commandState(command: string): boolean {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  }

  /** Cor do texto mais próxima (span com `color` ou `<font color>`) em hexadecimal minúsculo. */
  private colorAt(element: Element | null, area: HTMLElement): string | null {
    let current: Element | null = element;
    while (current && current !== area) {
      const color = this.colorOfElement(current as HTMLElement);
      if (color) return color === COLOR_SENTINEL ? null : color;
      current = current.parentElement;
    }
    return null;
  }

  private colorOfElement(el: HTMLElement): string | null {
    const tag = el.tagName?.toLowerCase();
    const raw = tag === 'font' ? el.getAttribute('color') : tag === 'span' ? el.style?.color : '';
    return raw ? toHex(raw) : null;
  }

  // ─────────────── Barra em ilha ───────────────

  /** A pílula rola no celular quando os grupos não cabem: a coluna aberta acompanha o botão. */
  canScrollLeft = false;
  canScrollRight = false;

  onTrackScroll(): void {
    this.updateScrollHints();
    if (this.openGroup) this.placeColumn(this.openGroup);
  }

  private updateScrollHints(): void {
    const scroller = this.host.nativeElement.querySelector<HTMLElement>('.ds-md-bar__scroll');
    if (!scroller) return;
    this.canScrollLeft = scroller.scrollLeft > 2;
    this.canScrollRight = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2;
  }

  private placeColumn(group: MdToolbarGroup): void {
    const bar = this.host.nativeElement.querySelector<HTMLElement>('.ds-md-bar');
    const button = bar?.querySelector<HTMLElement>(`[data-group="${group}"]`);
    if (!bar || !button) return;
    const b = button.getBoundingClientRect();
    const r = bar.getBoundingClientRect();
    this.colX = { ...this.colX, [group]: Math.round(b.left + b.width / 2 - r.left) };
  }

  toggleExpanded(): void {
    this.expanded = !this.expanded;
    if (!this.expanded) this.closeGroup();
    else setTimeout(() => this.zone.run(() => this.updateScrollHints()), 450);
    this.toolbarExpandedChange.emit(this.expanded);
  }

  toggleGroup(group: MdToolbarGroup, event: Event): void {
    if (this.openGroup === group) {
      this.closeGroup();
      return;
    }
    const button = (event.currentTarget as HTMLElement | null) ?? null;
    // Botão cortado na borda da pílula: rola até ele antes de abrir a coluna.
    button?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    this.placeColumn(group);
    if (group === 'table') {
      this.hoverRow = 2;
      this.hoverCol = 2;
    }
    this.refreshActive();
    this.openGroup = group;
  }

  closeGroup(): void {
    if (this.openGroup) this.openGroup = null;
  }

  /** Um toque numa ferramenta do projeto fecha a coluna (a ação dela segue normalmente). */
  onCustomToolClick(event: Event): void {
    const button = (event.target as Element | null)?.closest('button');
    if (button && !button.disabled) setTimeout(() => this.zone.run(() => this.closeGroup()));
  }

  /**
   * Esconde ou mostra o teclado virtual sem perder o cursor: `inputmode="none"` mantém o foco e a seleção
   * (dá para formatar com a tela inteira livre); de volta ao normal, o foco renovado reabre o teclado.
   */
  toggleKeyboard(): void {
    const area = this.editorArea?.nativeElement;
    if (!area) return;
    const selection = window.getSelection();
    const saved = selection?.rangeCount && area.contains(selection.anchorNode)
      ? selection.getRangeAt(0).cloneRange() : null;
    this.keyboardHidden = !this.keyboardHidden;
    this.togglingKeyboard = true;
    if (this.keyboardHidden) area.setAttribute('inputmode', 'none');
    else area.removeAttribute('inputmode');
    area.blur();
    area.focus({ preventScroll: true });
    if (saved && selection) {
      selection.removeAllRanges();
      selection.addRange(saved);
    }
    this.togglingKeyboard = false;
    this.keyboardVisibleChange.emit(!this.keyboardHidden);
  }

  /** Cor do texto na seleção; `null` volta à cor padrão. */
  applyTextColor(color: string | null): void {
    this.focusEditor();
    const area = this.editorArea?.nativeElement;
    if (!area) return;
    try {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('foreColor', false, color ?? COLOR_SENTINEL);
    } finally {
      document.execCommand('styleWithCSS', false, 'false');
    }
    if (!color) {
      area.querySelectorAll<HTMLElement>('span[style], font[color]').forEach((el) => {
        if (this.colorOfElement(el) !== COLOR_SENTINEL) return;
        if (el.tagName.toLowerCase() === 'font') el.removeAttribute('color');
        else el.style.removeProperty('color');
        if (!el.getAttribute('style')?.trim() && el.attributes.length <= 1) {
          el.replaceWith(...Array.from(el.childNodes));
        }
      });
    }
    this.closeGroup();
    this.onEditorInput();
    this.refreshActive();
  }

  // ─────────────── ControlValueAccessor ───────────────

  writeValue(value: any): void {
    const md = typeof value === 'string' ? value : '';
    if (md === this.lastMarkdown) return;

    this.lastMarkdown = md;
    if (this.editorArea) {
      this.selectedImage = null;
      this.editorArea.nativeElement.innerHTML = this.markdownToHtml(md);
      this.hydrateImages();
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
    this.adoptRawImages();
    this.hydrateImages();
    const md = this.htmlToMarkdown(this.editorArea.nativeElement);
    this.lastMarkdown = md;
    this.onChange(md);
    this.scheduleActive();
  }

  onEditorBlur(): void {
    this.onTouched();
    // Saiu do editor (não foi o botão do teclado): na volta o teclado abre como sempre.
    if (this.keyboardHidden && !this.togglingKeyboard) {
      this.keyboardHidden = false;
      this.editorArea?.nativeElement.removeAttribute('inputmode');
    }
  }

  onEditorFocus(): void {
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p');
    } catch (e) {}
  }

  onEditorPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const images = this.pastedImages(event.clipboardData);
    if (images.length) {
      this.insertImages(images, 'paste', this.currentRange());
      return;
    }
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
    if (!currentText && this.editorArea && !this.editorArea.nativeElement.querySelector('.md-image')) {
      this.editorArea.nativeElement.innerHTML = html;
    } else {
      this.insertHtmlAtSelection(html);
    }

    // Atualiza o value do modelo imediatamente
    this.onEditorInput();
  }

  // ─────────────── Imagens (TK2026-01756) ───────────────

  /** Botão Imagem: guarda onde estava o cursor e abre o seletor (no celular: galeria ou câmera). */
  pickImage(): void {
    this.imageRange = this.currentRange();
    this.closeGroup();
    const input = this.imageInput?.nativeElement;
    if (!input) return;
    input.value = '';
    input.click();
  }

  onImagePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    const range = this.imageRange;
    this.imageRange = null;
    if (files.length) void this.insertImages(files, 'upload', range);
  }

  onEditorBeforeInput(event: InputEvent): void {
    // Teclados do Android que inserem imagem (GIF/figurinha/área de transferência) mandam o arquivo aqui.
    const files = imageFiles(event.dataTransfer);
    if (!files.length || !this.imageUpload || this.disabled) return;
    event.preventDefault();
    const target = event.getTargetRanges?.()[0];
    let range: Range | null = null;
    if (target) {
      range = document.createRange();
      range.setStart(target.endContainer, target.endOffset);
      range.collapse(true);
    }
    void this.insertImages(files, 'keyboard', range ?? this.currentRange());
  }

  onEditorDragOver(event: DragEvent): void {
    if (!this.imageUpload || this.disabled || !Array.from(event.dataTransfer?.types || []).includes('Files')) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  /** A imagem da nota se move pelo gesto próprio (funciona no toque); o arrastar nativo fica desligado. */
  onEditorDragStart(event: DragEvent): void {
    if ((event.target as HTMLElement | null)?.closest?.('.md-image')) event.preventDefault();
  }

  /** Imagens arrastadas do computador entram onde foram soltas. */
  onEditorDrop(event: DragEvent): void {
    if (!this.imageUpload || this.disabled) return;
    const files = imageFiles(event.dataTransfer);
    if (!files.length) return;
    event.preventDefault();
    void this.insertImages(files, 'drop', this.rangeFromPoint(event.clientX, event.clientY));
  }

  /** Imagens da área de transferência. Texto com imagem (ex.: cópia do Word) continua colando como texto. */
  private pastedImages(data: DataTransfer | null): Blob[] {
    if (!data || !this.imageUpload || this.disabled) return [];
    const images = imageFiles(data);
    if (!images.length) return [];
    const text = data.getData('text/plain') || '';
    if (text.trim() && !onlyImagesInHtml(data.getData('text/html') || '')) return [];
    return images;
  }

  /**
   * Converte cada arquivo para JPEG, mostra a imagem na hora (com a barra de envio) no lugar do cursor e
   * troca pelo endereço definitivo quando o envio termina. Se algo falhar, a imagem sai e `imageError` avisa.
   */
  async insertImages(files: Blob[], source: MdEditorImageMeta['source'], range: Range | null): Promise<void> {
    const upload = this.imageUpload;
    const area = this.editorArea?.nativeElement;
    if (!upload || !area || this.disabled) return;
    let at = range;
    for (const file of files) {
      const name = (file as File).name || '';
      if (!isImageBlob(file)) {
        this.zone.run(() => this.imageError.emit({ reason: 'unsupported', name }));
        continue;
      }
      const holder = createImageElement('', cleanAlt(name.replace(/\.[a-z0-9]+$/i, '')), null);
      holder.classList.add('is-uploading');
      at = this.placeImage(holder, at);
      const img = holder.querySelector('img') as HTMLImageElement;
      let jpeg: { blob: Blob; width: number; height: number };
      try {
        jpeg = await toJpeg(file, this.imageMaxDimension, this.imageQuality);
      } catch (error) {
        holder.remove();
        this.zone.run(() => {
          this.imageError.emit({ reason: 'conversion', name, error });
          this.onEditorInput();
        });
        continue;
      }
      const url = URL.createObjectURL(jpeg.blob);
      this.localImageUrls.add(url);
      img.width = jpeg.width;
      img.height = jpeg.height;
      img.src = url;
      try {
        const src = await upload(jpeg.blob, { width: jpeg.width, height: jpeg.height, size: jpeg.blob.size, name, source },
          (fraction) => holder.style.setProperty('--md-image-progress', String(Math.max(0, Math.min(1, fraction || 0)))));
        if (!src || !SAFE_IMAGE_SRC.test(src)) throw new Error('Endereço da imagem inválido');
        this.resolvedImages.set(src, url);
        holder.dataset['src'] = src;
        img.dataset['for'] = src;
        holder.classList.remove('is-uploading');
      } catch (error) {
        holder.remove();
        this.zone.run(() => this.imageError.emit({ reason: 'upload', name, error }));
      }
      // A nota pode ter sido trocada durante o envio: aí não há o que salvar aqui.
      if (area.isConnected && (area.contains(holder) || !holder.isConnected)) {
        this.zone.run(() => this.onEditorInput());
      }
    }
  }

  /** Põe a imagem no ponto do cursor (ou no fim da nota) e devolve o ponto logo depois dela. */
  private placeImage(node: HTMLElement, range: Range | null): Range {
    const area = this.editorArea.nativeElement;
    let target = range && area.contains(range.commonAncestorContainer) ? range.cloneRange() : null;
    if (target) {
      target.collapse(false);
      // Dentro de código, fluxograma ou outra imagem não: logo depois do bloco.
      const host = elementOf(target.startContainer)?.closest('pre, .md-flowchart-card, .md-image, table');
      if (host && area.contains(host)) {
        target = document.createRange();
        target.setStartAfter(host);
        target.collapse(true);
      }
    }
    if (!target) {
      const p = document.createElement('p');
      area.appendChild(p);
      target = document.createRange();
      target.setStart(p, 0);
      target.collapse(true);
    }
    if (target.startContainer === area) {
      const p = document.createElement('p');
      target.insertNode(p);
      p.appendChild(node);
    } else {
      target.insertNode(node);
    }
    const after = document.createRange();
    after.setStartAfter(node);
    after.collapse(true);
    const selection = window.getSelection();
    if (selection && document.activeElement === area) {
      selection.removeAllRanges();
      selection.addRange(after);
    }
    return after;
  }

  /** `<img>` que o navegador ou o teclado inseriu direto no texto: vira imagem da nota (enviada) ou sai. */
  private adoptRawImages(): void {
    const area = this.editorArea?.nativeElement;
    if (!area) return;
    const raw = Array.from(area.querySelectorAll('img')).filter((img) => !img.closest('.md-image'));
    for (const img of raw) {
      const src = img.getAttribute('src') || '';
      const range = document.createRange();
      range.setStartBefore(img);
      range.collapse(true);
      img.remove();
      if (!this.imageUpload || !/^(?:data:image\/|blob:)/i.test(src)) continue;
      fetch(src)
        .then((response) => response.blob())
        .then((blob) => this.insertImages([blob], 'keyboard', range))
        .catch(() => undefined);
    }
  }

  /** Busca o endereço exibível de cada imagem (uma vez por `src`) e marca as que falharem. */
  private hydrateImages(): void {
    const area = this.editorArea?.nativeElement;
    if (!area) return;
    area.querySelectorAll<HTMLElement>('.md-image[data-src]').forEach((el) => {
      const src = el.dataset['src'] || '';
      const img = el.querySelector('img');
      if (!img || !src || img.dataset['for'] === src) return;
      img.dataset['for'] = src;
      el.classList.remove('is-broken');
      const known = this.resolvedImages.get(src);
      if (known) {
        img.src = known;
        return;
      }
      el.classList.add('is-loading');
      const done = () => el.classList.remove('is-loading');
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', () => { done(); el.classList.add('is-broken'); }, { once: true });
      Promise.resolve()
        .then(() => (this.imageResolver ? this.imageResolver(src) : /^(?:https?:|data:)/i.test(src) ? src : ''))
        .then((url) => {
          if (!url) throw new Error('Imagem indisponível');
          this.resolvedImages.set(src, url);
          if (img.dataset['for'] === src) img.src = url;
        })
        .catch(() => {
          done();
          if (img.dataset['for'] === src) el.classList.add('is-broken');
        });
    });
  }

  private currentRange(): Range | null {
    const area = this.editorArea?.nativeElement;
    const selection = window.getSelection();
    if (!area || !selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    return area.contains(range.commonAncestorContainer) ? range.cloneRange() : null;
  }

  /** Seleciona a imagem: alças laterais e a mini barra (tamanhos e remover). `null` solta. */
  private selectImage(el: HTMLElement | null, placeCaret = false): void {
    if (this.selectedImage === el) return;
    if (this.selectedImage) {
      this.selectedImage.classList.remove('is-selected', 'is-narrow');
      this.selectedImage.querySelector('.md-image__bar')?.remove();
    }
    this.selectedImage = el;
    if (!el) return;
    el.classList.add('is-selected');
    el.appendChild(this.imageBar());
    el.classList.toggle('is-narrow', el.getBoundingClientRect().width < 220);
    if (placeCaret) {
      const area = this.editorArea.nativeElement;
      area.focus({ preventScroll: true });
      const range = document.createRange();
      range.setStartAfter(el);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  private imageBar(): HTMLElement {
    const t = this.imageTexts;
    const bar = document.createElement('span');
    bar.className = 'md-image__bar';
    bar.setAttribute('contenteditable', 'false');
    const size = (action: string, label: string, fill: number) =>
      `<button type="button" class="md-image__size" data-image-action="${action}" title="${escapeAttr(label)}" aria-label="${escapeAttr(label)}">` +
      `<span class="md-image__glyph" style="--fill:${fill}"></span></button>`;
    bar.innerHTML =
      size('small', t.small, 34) + size('medium', t.medium, 58) + size('full', t.full, 100) +
      `<span class="md-image__sep" aria-hidden="true"></span>` +
      `<button type="button" class="md-image__remove" data-image-action="remove" title="${escapeAttr(t.remove)}" aria-label="${escapeAttr(t.remove)}">` +
      `<i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>`;
    return bar;
  }

  private imageAction(el: HTMLElement, action: string): void {
    const width = this.contentWidth();
    if (action === 'remove') {
      this.removeImage(el);
      return;
    }
    const fraction = action === 'small' ? 1 / 3 : action === 'medium' ? 1 / 2 : 1;
    setImageWidth(el, Math.max(IMAGE_MIN_WIDTH, Math.round(width * fraction)));
    el.classList.toggle('is-narrow', el.getBoundingClientRect().width < 220);
    this.onEditorInput();
  }

  private removeImage(el: HTMLElement): void {
    const parent = el.parentElement;
    if (this.selectedImage === el) this.selectedImage = null;
    el.remove();
    if (parent && parent !== this.editorArea.nativeElement && parent.tagName === 'P' && !parent.childNodes.length) {
      parent.appendChild(document.createElement('br'));
    }
    this.onEditorInput();
  }

  /** Largura útil do texto (sem o padding do editor). */
  private contentWidth(): number {
    const area = this.editorArea.nativeElement;
    const style = getComputedStyle(area);
    return Math.max(IMAGE_MIN_WIDTH,
      area.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0));
  }

  /**
   * Toque/clique numa imagem: seleciona; arrastar move (mouse direto; no toque, depois de selecionada, para
   * não brigar com a rolagem); as alças mudam a largura. Tudo fora do Angular até soltar.
   */
  private onImagePointerDown(event: PointerEvent): void {
    if (this.disabled || event.button > 0) return;
    const target = event.target as HTMLElement | null;
    const el = target?.closest?.('.md-image') as HTMLElement | null;
    if (!el) {
      if (this.selectedImage) this.selectImage(null);
      return;
    }
    if (el.classList.contains('is-uploading')) {
      event.preventDefault();
      return;
    }
    const action = (target!.closest('[data-image-action]') as HTMLElement | null)?.dataset['imageAction'];
    if (action) {
      event.preventDefault();
      event.stopPropagation();
      this.zone.run(() => this.imageAction(el, action));
      return;
    }
    const handle = target!.closest('.md-image__handle') as HTMLElement | null;
    const wasSelected = el === this.selectedImage;
    this.selectImage(el, event.pointerType === 'mouse');
    if (handle) {
      event.preventDefault();
      this.startImageGesture(event, el, 'resize', handle.classList.contains('md-image__handle--w') ? -1 : 1);
    } else if (event.pointerType === 'mouse' || wasSelected) {
      event.preventDefault();
      this.startImageGesture(event, el, 'pending', 1);
    }
  }

  private startImageGesture(event: PointerEvent, el: HTMLElement, kind: 'pending' | 'resize', side: 1 | -1): void {
    this.endImageGesture(false);
    const rect = el.getBoundingClientRect();
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== gesture.pointerId) return;
      e.preventDefault();
      this.moveImageGesture(e.clientX, e.clientY);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== gesture.pointerId) return;
      this.endImageGesture(e.type === 'pointerup');
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.endImageGesture(false);
    };
    const gesture: ImageGesture = {
      kind, el, side, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      lastX: event.clientX, lastY: event.clientY, offX: event.clientX - rect.left, offY: event.clientY - rect.top,
      startWidth: rect.width, maxWidth: this.contentWidth(), target: null, frame: 0,
      scroller: scrollParent(this.editorArea.nativeElement),
      off: () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        window.removeEventListener('keydown', onKey, true);
      },
    };
    this.imageGesture = gesture;
    this.zone.runOutsideAngular(() => {
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
      window.addEventListener('keydown', onKey, true);
    });
    if (kind === 'resize') {
      el.classList.add('is-resizing');
      el.dataset['size'] = `${Math.round(rect.width)} px`;
    }
  }

  private moveImageGesture(x: number, y: number): void {
    const g = this.imageGesture;
    if (!g) return;
    g.lastX = x;
    g.lastY = y;
    if (g.kind === 'resize') {
      const width = Math.round(Math.min(g.maxWidth, Math.max(IMAGE_MIN_WIDTH, g.startWidth + g.side * (x - g.startX))));
      setImageWidth(g.el, width);
      g.el.dataset['size'] = `${width} px`;
      return;
    }
    if (g.kind === 'pending') {
      if (Math.hypot(x - g.startX, y - g.startY) < 6) return;
      g.kind = 'drag';
      ensureImageOverlayStyles();
      g.el.classList.add('is-dragging');
      const img = g.el.querySelector('img');
      const ghost = document.createElement('div');
      ghost.className = 'ds-md-image-ghost';
      const ghostWidth = Math.min(180, g.startWidth);
      const scale = ghostWidth / g.startWidth;
      g.offX *= scale;
      g.offY *= scale;
      ghost.style.width = `${ghostWidth}px`;
      if (img?.src) ghost.style.backgroundImage = `url("${img.src}")`;
      ghost.style.aspectRatio = img?.naturalWidth ? `${img.naturalWidth} / ${img.naturalHeight}` : '4 / 3';
      const caret = document.createElement('div');
      caret.className = 'ds-md-image-caret';
      document.body.append(ghost, caret);
      g.ghost = ghost;
      g.caret = caret;
      const tick = () => {
        if (this.imageGesture !== g || g.kind !== 'drag') return;
        this.autoScroll(g);
        g.frame = requestAnimationFrame(tick);
      };
      g.frame = requestAnimationFrame(tick);
    }
    this.trackDrop(g);
  }

  private trackDrop(g: ImageGesture): void {
    if (g.ghost) g.ghost.style.transform = `translate3d(${g.lastX - g.offX}px, ${g.lastY - g.offY}px, 0) rotate(-2deg)`;
    g.target = this.rangeFromPoint(g.lastX, g.lastY, g.el);
    const caret = g.caret;
    if (!caret) return;
    const rect = g.target ? caretRect(g.target) : null;
    if (!rect) {
      caret.style.opacity = '0';
      return;
    }
    caret.style.opacity = '1';
    caret.style.height = `${rect.height}px`;
    caret.style.transform = `translate3d(${rect.left - 1}px, ${rect.top}px, 0)`;
  }

  /** Perto da borda de cima ou de baixo, a nota rola sozinha (a barra do dock cobre o rodapé). */
  private autoScroll(g: ImageGesture): void {
    const scroller = g.scroller;
    const view = scroller && scroller !== document.scrollingElement
      ? scroller.getBoundingClientRect()
      : { top: 0, bottom: window.innerHeight };
    const edge = 72;
    let delta = 0;
    if (g.lastY < view.top + edge) delta = -Math.ceil((view.top + edge - g.lastY) / 4);
    else if (g.lastY > view.bottom - edge - 24) delta = Math.ceil((g.lastY - (view.bottom - edge - 24)) / 4);
    if (!delta) return;
    if (scroller && scroller !== document.scrollingElement) scroller.scrollTop += delta;
    else window.scrollBy(0, delta);
    this.trackDrop(g);
  }

  private endImageGesture(commit: boolean): void {
    const g = this.imageGesture;
    if (!g) return;
    this.imageGesture = null;
    g.off();
    cancelAnimationFrame(g.frame);
    g.ghost?.remove();
    g.caret?.remove();
    g.el.classList.remove('is-dragging', 'is-resizing');
    delete g.el.dataset['size'];
    if (!commit) return;
    if (g.kind === 'resize') {
      this.zone.run(() => this.onEditorInput());
    } else if (g.kind === 'drag' && g.target) {
      this.zone.run(() => this.moveImageTo(g.el, g.target!));
    }
  }

  /** Solta a imagem no novo ponto do texto; o parágrafo de onde ela saiu some se ficou vazio. */
  private moveImageTo(el: HTMLElement, range: Range): void {
    const area = this.editorArea.nativeElement;
    if (el.contains(range.startContainer)) return;
    const from = el.parentElement;
    if (range.startContainer === area) {
      const p = document.createElement('p');
      range.insertNode(p);
      p.appendChild(el);
    } else {
      range.insertNode(el);
    }
    if (from && from !== area && from.isConnected && /^(P|DIV)$/.test(from.tagName) && this.isEmptyBlock(from)) {
      from.remove();
    }
    el.classList.toggle('is-narrow', el.getBoundingClientRect().width < 220);
    this.onEditorInput();
  }

  /** Ponto do texto sob o dedo/ponteiro, fora de imagens, código e fluxogramas (vai para antes ou depois). */
  private rangeFromPoint(x: number, y: number, dragging?: HTMLElement): Range | null {
    const area = this.editorArea?.nativeElement;
    if (!area) return null;
    const doc = document as Document & {
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };
    let range: Range | null = null;
    if (doc.caretPositionFromPoint) {
      const position = doc.caretPositionFromPoint(x, y);
      if (position) {
        range = document.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);
      }
    } else if (doc.caretRangeFromPoint) {
      range = doc.caretRangeFromPoint(x, y);
    }
    if (!range || !area.contains(range.startContainer)) {
      const hit = document.elementFromPoint(x, y);
      if (!hit || !area.contains(hit) || hit === area) return null;
      range = document.createRange();
      range.selectNodeContents(hit);
      range.collapse(false);
    }
    const atom = elementOf(range.startContainer)?.closest('.md-image, pre, .md-flowchart-card, .md-check-item input');
    if (atom && area.contains(atom)) {
      const rect = atom.getBoundingClientRect();
      const before = atom.classList.contains('md-image') ? x < rect.left + rect.width / 2 : y < rect.top + rect.height / 2;
      if (atom === dragging) return null;
      range = document.createRange();
      if (before) range.setStartBefore(atom);
      else range.setStartAfter(atom);
      range.collapse(true);
    }
    return range;
  }

  private openLightbox(el: HTMLElement): void {
    const img = el.querySelector('img');
    if (!img?.src || el.classList.contains('is-broken') || el.classList.contains('is-uploading')) return;
    this.closeLightbox();
    ensureImageOverlayStyles();
    const box = document.createElement('div');
    box.className = 'ds-md-image-lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', img.alt || this.imageLabel);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'ds-md-image-lightbox__close';
    close.setAttribute('aria-label', this.imageTexts.close);
    close.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    const big = document.createElement('img');
    big.src = img.src;
    big.alt = img.alt;
    box.append(big, close);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.closeLightbox();
    };
    box.addEventListener('click', () => this.closeLightbox());
    document.addEventListener('keydown', onKey, true);
    (box as HTMLElement & { _off?: () => void })._off = () => document.removeEventListener('keydown', onKey, true);
    document.body.appendChild(box);
    requestAnimationFrame(() => box.classList.add('is-open'));
    this.lightbox = box;
    close.focus({ preventScroll: true });
  }

  private closeLightbox(): void {
    const box = this.lightbox as (HTMLElement & { _off?: () => void }) | null;
    if (!box) return;
    this.lightbox = null;
    box._off?.();
    box.classList.remove('is-open');
    setTimeout(() => box.remove(), 220);
  }

  // ─────────────── Ações de Fluxograma (Flowchart) ───────────────

  onEditorClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target) return;

    // Imagem: no modo leitura um toque abre em tela cheia; editando, o duplo clique.
    const image = target.closest('.md-image') as HTMLElement | null;
    if (image && !target.closest('.md-image__bar, .md-image__handle') && (this.disabled || event.detail === 2)) {
      event.preventDefault();
      this.openLightbox(image);
      return;
    }

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
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    this.flowchartInsertionRange = !targetElement && range && this.editorArea.nativeElement.contains(range.commonAncestorContainer)
      ? range.cloneRange() : null;
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
      this.insertHtmlAtSelection(cardHtml, this.flowchartInsertionRange);
    }

    this.flowchartInsertionRange = null;
    this.onEditorInput();
  }

  onFlowchartCancel(): void {
    this.flowchartInsertionRange = null;
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
    // Imagem selecionada: Delete/Backspace remove, Esc e as setas soltam.
    if (this.selectedImage) {
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        this.removeImage(this.selectedImage);
        return;
      }
      if (event.key === 'Escape' || event.key.startsWith('Arrow') || event.key === 'Enter' || event.key.length === 1) {
        this.selectImage(null);
      }
    }

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
      } else if (event.key === 'u' || event.key === 'U') {
        event.preventDefault();
        this.exec('underline');
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
    try {
      document.execCommand('styleWithCSS', false, 'false');
    } catch (e) {}
    document.execCommand(command, false, value);
    this.onEditorInput();
  }

  setHeading(tag: 'H1' | 'H2' | 'H3' | 'H4' | 'P'): void {
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

  private insertHtmlAtSelection(html: string, savedRange?: Range | null): void {
    this.focusEditor();
    const sel = window.getSelection();
    if (savedRange && this.editorArea.nativeElement.contains(savedRange.commonAncestorContainer)) {
      sel?.removeAllRanges();
      sel?.addRange(savedRange);
    }
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
      this.editorArea.nativeElement.focus({ preventScroll: true });
      try {
        document.execCommand('defaultParagraphSeparator', false, 'p');
      } catch (e) {}
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
    // O código inline não atravessa linhas: uma crase solta (ex.: acento grave de um PDF
    // convertido) não pode casar com outra crase parágrafos depois e engolir o texto entre elas.
    const inlineCodes: string[] = [];
    html = html.replace(/`([^`\n]+)`/g, (_m, code) => {
      const idx = inlineCodes.length;
      const safeCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      inlineCodes.push(`<code>${safeCode}</code>`);
      return `%%INLINE_CODE_${idx}%%`;
    });

    // 2b. Imagens `![alt|largura](src)` (TK2026-01756): viram o bloco da imagem antes do escape e dos links.
    const images: string[] = [];
    html = html.replace(IMAGE_MD, (match, label: string, src: string) => {
      if (!SAFE_IMAGE_SRC.test(src)) return match;
      const { alt, width } = parseImageLabel(label);
      images.push(imageMarkup(src, alt, width));
      return `%%IMAGE_${images.length - 1}%%`;
    });

    // 3. Escapar tags brutas restantes do texto fora dos blocos de código
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Permitir <br> e <br/> explícitos no Markdown
    html = html.replace(/&lt;br\s*\/?&gt;/gi, '<br>');

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

    // 7b. Sublinhado e cor do texto: o único HTML aceito além do <br>, com a cor restrita a hexadecimal.
    // Do mais interno para fora, para spans aninhados; nunca atravessa linhas.
    html = html.replace(/&lt;u&gt;([^\n]*?)&lt;\/u&gt;/g, '<u>$1</u>');
    let previousColor = '';
    while (previousColor !== html) {
      previousColor = html;
      html = html.replace(
        /&lt;span style="color:\s*(#[0-9a-fA-F]{3,8})"&gt;((?:(?!&lt;span style=)[^\n])*?)&lt;\/span&gt;/g,
        '<span style="color:$1">$2</span>'
      );
    }

    // 8. Checklists interativas
    html = html.replace(
      /^- \[x\] (.+)$/gm,
      '<div class="md-check-item"><input type="checkbox" checked> <span>$1</span></div>'
    );
    html = html.replace(
      /^- \[ \] (.+)$/gm,
      '<div class="md-check-item"><input type="checkbox"> <span>$1</span></div>'
    );

    // 9. Listas simples e ordenadas
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="md-ol-item">$1</li>');
    // A quebra de linha depois do último item fica fora da lista: ela separa a lista do bloco seguinte.
    html = html.replace(/((?:<li class="md-ol-item">.+<\/li>(?:\n(?=<li class="md-ol-item">))?)+)/g, '<ol>$1</ol>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.+<\/li>(?:\n(?=<li>))?)+)/g, '<ul>$1</ul>');

    // 10. Links
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );

    // 11. Tabelas
    html = this.parseMarkdownTables(html);

    // 12. Parágrafos e quebras de linha vazias
    // Normalizar CRLF para LF
    html = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Como no Markdown padrão, qualquer sequência de linhas em branco separa dois parágrafos
    // com o mesmo espaço: linhas em branco extras não viram parágrafos vazios.
    html = html.replace(/\n(?:[ \t]*\n)+/g, '</p><p>');

    html = `<p>${html}</p>`;

    // Quebra de linha simples remanescente (soft break dentro de parágrafo)
    html = html.replace(/([^>])\n([^<])/g, '$1<br>$2');

    // Eliminar quebras de linha \n residuais entre tags HTML para evitar text nodes vazios no DOM
    html = html.replace(/>\n+/g, '>').replace(/\n+</g, '<');

    // Remover parágrafos totalmente vazios (sem <br>), preservando parágrafos de linha vazia <p><br></p>
    html = html.replace(/<p>\s*<\/p>/g, '');

    // Limpar parágrafos que envolvam elementos de bloco nativos
    html = html.replace(/<p>\s*(?:<br\s*\/?>)*\s*(<table[\s\S]*?<\/table>)\s*(?:<br\s*\/?>)*\s*<\/p>/gi, '$1');
    html = html.replace(/<p>\s*(?:<br\s*\/?>)*\s*(<div class="md-check-item"[\s\S]*?<\/div>)\s*(?:<br\s*\/?>)*\s*<\/p>/gi, '$1');
    html = html.replace(/<p>\s*(?:<br\s*\/?>)*\s*(<ul[\s\S]*?<\/ul>)\s*(?:<br\s*\/?>)*\s*<\/p>/gi, '$1');
    html = html.replace(/<p>\s*(?:<br\s*\/?>)*\s*(<ol[\s\S]*?<\/ol>)\s*(?:<br\s*\/?>)*\s*<\/p>/gi, '$1');
    html = html.replace(/<p>\s*(?:<br\s*\/?>)*\s*(<blockquote[\s\S]*?<\/blockquote>)\s*(?:<br\s*\/?>)*\s*<\/p>/gi, '$1');
    html = html.replace(/<p>\s*(?:<br\s*\/?>)*\s*(<h[1-6]>[\s\S]*?<\/h[1-6]>)\s*(?:<br\s*\/?>)*\s*<\/p>/gi, '$1');
    html = html.replace(/<p>\s*(?:<br\s*\/?>)*\s*(<hr>)\s*(?:<br\s*\/?>)*\s*<\/p>/gi, '$1');

    // 13. Limpar tags de parágrafo que envelopem placeholders de blocos de código
    html = html.replace(/<p>\s*(?:<br>)*\s*%%CODE_BLOCK_(\d+)%%\s*(?:<br>)*\s*<\/p>/g, '%%CODE_BLOCK_$1%%');
    html = html.replace(/<p>\s*%%CODE_BLOCK_(\d+)%%\s*<\/p>/g, '%%CODE_BLOCK_$1%%');

    // 14. Restaurar inline code
    html = html.replace(/%%INLINE_CODE_(\d+)%%/g, (_m, i) => inlineCodes[Number(i)] ?? '');
    html = html.replace(/%%IMAGE_(\d+)%%/g, (_m, i) => images[Number(i)] ?? '');

    // 15. Restaurar fenced code blocks
    html = html.replace(/%%CODE_BLOCK_(\d+)%%/g, (_m, i) => codeBlocks[Number(i)] ?? '');

    return html;
  }

  /**
   * Converte a árvore DOM do editor WYSIWYG de volta para Markdown limpo,
   * preservando fielmente quebras de linha intencionais e linhas vazias.
   */
  htmlToMarkdown(container: HTMLElement): string {
    const blocks: { type: 'content' | 'empty'; text: string; isList?: boolean }[] = [];
    let currentInlineMd = '';

    const flushInline = () => {
      const trimmed = currentInlineMd.trim();
      if (trimmed) {
        const isList = trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed);
        blocks.push({ type: 'content', text: trimmed, isList });
      }
      currentInlineMd = '';
    };

    container.childNodes.forEach((node) => {
      // 1. Nós de texto puros: se for apenas whitespace entre tags (ex: quebra de linha de formatação HTML), ignorar
      if (node.nodeType === Node.TEXT_NODE) {
        const text = (node.textContent || '').replace(/\u00A0/g, ' ');
        if (text.trim() === '') {
          return;
        }
        currentInlineMd += text;
        return;
      }

      // 2. Blocos vazios reais criados pelo Enter (<p><br></p>, <div><br></div>, <br>)
      if (this.isEmptyBlock(node)) {
        flushInline();
        blocks.push({ type: 'empty', text: '' });
      } else if (!this.isBlockElement(node)) {
        // Nós inline raiz com conteúdo (strong, em, link, code, etc.)
        currentInlineMd += this.nodeToMarkdown(node);
      } else {
        // Elementos estruturais de bloco
        flushInline();
        const md = this.nodeToMarkdown(node).trim();
        if (md) {
          const isList = md.startsWith('- ') || md.startsWith('* ') || /^\d+\.\s/.test(md);
          blocks.push({ type: 'content', text: md, isList });
        }
      }
    });

    flushInline();

    if (blocks.length === 0) {
      return '';
    }

    let result = '';
    let pendingEmptyLines = 0;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.type === 'empty') {
        pendingEmptyLines++;
      } else {
        if (result.length > 0) {
          const prevBlock = blocks.slice(0, i).reverse().find((b) => b.type === 'content');
          const isConsecutiveList = pendingEmptyLines === 0 && block.isList && prevBlock?.isList;
          if (isConsecutiveList) {
            result += '\n';
          } else {
            // Linhas em branco não marcam espaço no Markdown: cada linha vazia criada no editor
            // vira um parágrafo só com <br>, que o markdownToHtml devolve como linha vazia.
            result += '\n\n' + '<br>\n\n'.repeat(pendingEmptyLines);
          }
        }
        result += block.text;
        pendingEmptyLines = 0;
      }
    }

    return result.trim();
  }

  private isEmptyBlock(node: Node): boolean {
    // Nós de texto nunca são blocos vazios (são tratados como inline ou ruído inter-tags)
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'br') return true;

    // Componentes interativos/estruturais especiais nunca são blocos vazios
    if (
      el.classList.contains('md-flowchart-card') ||
      el.classList.contains('md-check-item') ||
      el.classList.contains('editor-table')
    ) {
      return false;
    }

    if (tag === 'hr') return false;

    // Elementos de bloco ou contêineres
    if (
      ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'].includes(tag)
    ) {
      if (
        el.querySelector(
          'table, img, input, pre, blockquote, hr, .md-flowchart-card, .md-check-item, .md-image'
        )
      ) {
        return false;
      }
      const text = (el.textContent || '').replace(/\u00A0/g, ' ').trim();
      return text === '';
    }

    return false;
  }

  private isBlockElement(node: Node): boolean {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as HTMLElement).tagName.toLowerCase();
      return [
        'p',
        'div',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'blockquote',
        'pre',
        'ul',
        'ol',
        'table',
        'hr',
      ].includes(tag);
    }
    return false;
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
      case 'u': {
        return wrapInline(getChildrenMd(), '<u>', '</u>');
      }
      case 'img': {
        // <img> solto (não deveria sobrar depois do adoptRawImages): só endereços seguros seguem no texto.
        const src = el.getAttribute('src') || '';
        return /^https?:\/\//i.test(src) ? `![${cleanAlt(el.getAttribute('alt') || '')}](${src})` : '';
      }
      case 'span':
      case 'font': {
        if (el.classList.contains('md-image')) {
          return imageToMarkdown(el);
        }
        let content = getChildrenMd();
        const decoration = `${el.style?.textDecorationLine || ''} ${el.style?.textDecoration || ''}`;
        if (/underline/.test(decoration)) content = wrapInline(content, '<u>', '</u>');
        const color = this.colorOfElement(el);
        if (color && color !== COLOR_SENTINEL) content = wrapInline(content, `<span style="color:${color}">`, '</span>');
        return content;
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
        return `\`\`\`\n${codeText.trim()}\n\`\`\``;
      }
      case 'h1':
        return `# ${getChildrenMd().trim()}`;
      case 'h2':
        return `## ${getChildrenMd().trim()}`;
      case 'h3':
        return `### ${getChildrenMd().trim()}`;
      case 'h4':
        return `#### ${getChildrenMd().trim()}`;
      case 'h5':
        return `##### ${getChildrenMd().trim()}`;
      case 'h6':
        return `###### ${getChildrenMd().trim()}`;
      case 'blockquote': {
        const text = getChildrenMd().trim();
        const lines = text.split('\n');
        return lines.map((l) => `> ${l}`).join('\n');
      }
      case 'a': {
        const href = el.getAttribute('href') || '';
        return `[${getChildrenMd().trim()}](${href})`;
      }
      case 'hr':
        return '---';
      case 'ul': {
        const listItems: string[] = [];
        el.querySelectorAll(':scope > li').forEach((li) => {
          const checkbox = li.querySelector('input[type="checkbox"]') as HTMLInputElement;
          if (checkbox) {
            const checked = checkbox.checked ? 'x' : ' ';
            let itemText = '';
            li.childNodes.forEach((child) => {
              if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName.toLowerCase() === 'input') {
                return;
              }
              itemText += this.nodeToMarkdown(child);
            });
            listItems.push(`- [${checked}] ${itemText.trim()}`);
          } else {
            listItems.push(`- ${this.nodeToMarkdown(li).trim()}`);
          }
        });
        return listItems.join('\n');
      }
      case 'ol': {
        const listItems: string[] = [];
        let idx = 1;
        el.querySelectorAll(':scope > li').forEach((li) => {
          listItems.push(`${idx++}. ${this.nodeToMarkdown(li).trim()}`);
        });
        return listItems.join('\n');
      }
      case 'table':
        return this.tableToMarkdown(el);
      case 'th':
      case 'td': {
        return getChildrenMd().replace(/\n+/g, ' ').trim();
      }
      case 'br':
        return '\n';
      case 'div': {
        if (el.classList.contains('md-flowchart-card')) {
          const encodedCode = el.getAttribute('data-flowchart-code') || '';
          const code = encodedCode ? decodeURIComponent(encodedCode) : '';
          return `\`\`\`mermaid\n${code}\n\`\`\``;
        }
        if (el.classList.contains('md-check-item')) {
          const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
          const checked = checkbox && checkbox.checked ? 'x' : ' ';
          let itemText = '';
          el.childNodes.forEach((child) => {
            if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName.toLowerCase() === 'input') {
              return;
            }
            itemText += this.nodeToMarkdown(child);
          });
          return `- [${checked}] ${itemText.trim()}`;
        }
        return getChildrenMd().trim();
      }
      case 'p': {
        return getChildrenMd().trim();
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
    // Captura blocos contínuos de linhas de tabela (cada linha contendo ao menos um '|')
    const tableBlockRegex = /((?:^[ \t]*\|?[^\n\r]*\|[^\n\r]*(?:\r?\n|$))+)/gm;

    return content.replace(tableBlockRegex, (match) => {
      const rawLines = match
        .trim()
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (rawLines.length < 2) return match;

      // A linha delimitadora deve conter '-', '|' e apenas caracteres válidos (-, :, |, espaços)
      const sepIndex = rawLines.findIndex(
        (l) => /^[:\s\-|]+$/.test(l) && l.includes('-') && l.includes('|')
      );
      if (sepIndex === -1) return match;

      let theadHtml = '';
      let tbodyHtml = '';

      for (let i = 0; i < rawLines.length; i++) {
        if (i === sepIndex) continue;

        let line = rawLines[i];
        if (line.startsWith('|')) line = line.substring(1);
        if (line.endsWith('|')) line = line.substring(0, line.length - 1);

        const cells = line.split('|').map((c) => c.trim());
        const isHeader = i < sepIndex;
        const tag = isHeader ? 'th' : 'td';

        const rowHtml =
          '<tr>' +
          cells.map((c) => `<${tag}>${c || '&nbsp;'}</${tag}>`).join('') +
          '</tr>';

        if (isHeader) {
          theadHtml += rowHtml;
        } else {
          tbodyHtml += rowHtml;
        }
      }

      let result = '\n\n<table class="editor-table">';
      if (theadHtml) result += `<thead>${theadHtml}</thead>`;
      if (tbodyHtml) result += `<tbody>${tbodyHtml}</tbody>`;
      result += '</table>\n\n';

      return result;
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

/** Envolve o conteúdo deixando os espaços das pontas fora das marcas (Markdown não fecha marca com espaço). */
function wrapInline(content: string, open: string, close: string): string {
  const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(content);
  if (!match || !match[2]) return content;
  return `${match[1]}${open}${match[2]}${close}${match[3]}`;
}

/** `rgb(…)`, `#rgb` ou `#rrggbb` em `#rrggbb` minúsculo. */
function toHex(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(value)) return value;
  if (/^#[0-9a-f]{3}$/.test(value)) return '#' + value.slice(1).split('').map((c) => c + c).join('');
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(value);
  if (!rgb) return null;
  return '#' + rgb.slice(1, 4).map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0')).join('');
}

// ─────────────── Imagens (TK2026-01756) ───────────────

interface ImageGesture {
  kind: 'pending' | 'drag' | 'resize';
  el: HTMLElement;
  side: 1 | -1;
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  offX: number;
  offY: number;
  startWidth: number;
  maxWidth: number;
  target: Range | null;
  frame: number;
  scroller: HTMLElement | null;
  ghost?: HTMLElement;
  caret?: HTMLElement;
  off: () => void;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Texto alternativo seguro para `![...]`: sem colchetes, barra vertical nem quebra de linha. */
function cleanAlt(value: string): string {
  return value.replace(/[\[\]|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
}

/** `alt|480` → { alt, width: 480 }. A largura em pixels é opcional (convenção do Obsidian). */
function parseImageLabel(label: string): { alt: string; width: number | null } {
  const match = /^(.*?)\|\s*(\d{2,4})\s*$/.exec(label);
  if (!match) return { alt: label.trim(), width: null };
  return { alt: match[1].trim(), width: Math.max(IMAGE_MIN_WIDTH, Number(match[2])) };
}

function imageMarkup(src: string, alt: string, width: number | null): string {
  const size = width ? ` data-width="${width}" style="width:${width}px"` : '';
  return `<span class="md-image" contenteditable="false" draggable="false" data-src="${escapeAttr(src)}" data-alt="${escapeAttr(alt)}"${size}>` +
    `<img alt="${escapeAttr(alt)}" draggable="false" decoding="async">` +
    '<span class="md-image__handle md-image__handle--w" aria-hidden="true"></span>' +
    '<span class="md-image__handle md-image__handle--e" aria-hidden="true"></span>' +
    '<span class="md-image__progress" aria-hidden="true"></span></span>';
}

function createImageElement(src: string, alt: string, width: number | null): HTMLElement {
  const template = document.createElement('template');
  template.innerHTML = imageMarkup(src, alt, width);
  const el = template.content.firstElementChild as HTMLElement;
  if (!src) delete el.dataset['src'];
  return el;
}

function setImageWidth(el: HTMLElement, width: number | null): void {
  if (width) {
    el.style.width = `${width}px`;
    el.dataset['width'] = String(width);
  } else {
    el.style.removeProperty('width');
    delete el.dataset['width'];
  }
}

/** Imagem ainda enviando (ou sem endereço) não vai para o Markdown. */
function imageToMarkdown(el: HTMLElement): string {
  const src = el.dataset['src'] || '';
  if (!src || el.classList.contains('is-uploading') || !SAFE_IMAGE_SRC.test(src)) return '';
  const alt = cleanAlt(el.dataset['alt'] || '');
  const width = Number(el.dataset['width']) || 0;
  return `![${alt}${width ? `|${Math.round(width)}` : ''}](${src})`;
}

function elementOf(node: Node | null): Element | null {
  if (!node) return null;
  return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
}

function isImageBlob(blob: Blob): boolean {
  const type = (blob.type || '').toLowerCase();
  if (type.startsWith('image/')) return type !== 'image/svg+xml';
  // iOS às vezes entrega HEIC sem tipo: confia na extensão.
  return !type && /\.(?:jpe?g|png|gif|webp|heic|heif|avif|bmp)$/i.test((blob as File).name || '');
}

function imageFiles(data: DataTransfer | null | undefined): Blob[] {
  if (!data) return [];
  const files = Array.from(data.files || []).filter(isImageBlob);
  if (files.length) return files;
  return Array.from(data.items || [])
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/') && item.type !== 'image/svg+xml')
    .map((item) => item.getAsFile())
    .filter((file): file is File => !!file);
}

/** HTML da área de transferência que só traz imagens (cópia de uma imagem de site). */
function onlyImagesInHtml(html: string): boolean {
  if (!html.trim() || typeof DOMParser === 'undefined') return false;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return !!doc.body.querySelector('img') && !(doc.body.textContent || '').trim();
}

/**
 * Converte qualquer imagem que o navegador decodifica (PNG, WebP, GIF, HEIC no Safari...) em JPEG, com o
 * lado maior até `max` px e fundo branco no lugar da transparência. A orientação EXIF é aplicada.
 */
async function toJpeg(file: Blob, max: number, quality: number): Promise<{ blob: Blob; width: number; height: number }> {
  let source: CanvasImageSource;
  let width = 0;
  let height = 0;
  let release = () => {};
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    source = bitmap;
    width = bitmap.width;
    height = bitmap.height;
    release = () => bitmap.close();
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      source = img;
      width = img.naturalWidth;
      height = img.naturalHeight;
    } finally {
      release = () => URL.revokeObjectURL(url);
    }
  }
  try {
    if (!width || !height) throw new Error('Imagem vazia');
    const scale = Math.min(1, max / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponível');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    canvas.width = 0;
    canvas.height = 0;
    if (!blob || blob.type !== 'image/jpeg') throw new Error('JPEG indisponível');
    return { blob, width: w, height: h };
  } finally {
    release();
  }
}

function scrollParent(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    if (/(auto|scroll|overlay)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

/** Retângulo da posição de inserção (linha vazia não tem retângulo: usa o do bloco). */
function caretRect(range: Range): { left: number; top: number; height: number } | null {
  const rects = range.getClientRects();
  const rect = rects.length ? rects[0] : range.getBoundingClientRect();
  if (rect && rect.height > 0) return { left: rect.left, top: rect.top, height: rect.height };
  const el = elementOf(range.startContainer);
  if (!el) return null;
  const block = el.getBoundingClientRect();
  const line = parseFloat(getComputedStyle(el).lineHeight) || 22;
  return { left: block.left, top: block.top, height: Math.min(block.height || line, line) };
}

/** Fantasma do arrasto, cursor de destino e tela cheia ficam no <body>: estilo global, injetado uma vez. */
function ensureImageOverlayStyles(): void {
  if (document.getElementById('ds-md-image-overlay-styles')) return;
  const style = document.createElement('style');
  style.id = 'ds-md-image-overlay-styles';
  style.textContent = `
.ds-md-image-ghost{position:fixed;left:0;top:0;z-index:2147483000;pointer-events:none;border-radius:12px;
  background:center/cover no-repeat #fff;opacity:.92;box-shadow:0 22px 48px rgba(15,23,42,.28),0 4px 12px rgba(15,23,42,.18);
  outline:2px solid var(--color-primary-500,#3b82f6);outline-offset:2px;will-change:transform}
.ds-md-image-caret{position:fixed;left:0;top:0;z-index:2147483001;width:3px;border-radius:3px;pointer-events:none;
  background:var(--color-primary-500,#3b82f6);box-shadow:0 0 0 4px color-mix(in srgb,var(--color-primary-500,#3b82f6) 22%,transparent);
  transition:transform 70ms ease-out,height 70ms ease-out,opacity .12s;will-change:transform}
.ds-md-image-lightbox{position:fixed;inset:0;z-index:2147483002;display:grid;place-items:center;padding:max(24px,env(safe-area-inset-top)) 24px max(24px,env(safe-area-inset-bottom));
  background:rgba(8,10,18,.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);opacity:0;transition:opacity .2s ease;cursor:zoom-out}
.ds-md-image-lightbox.is-open{opacity:1}
.ds-md-image-lightbox img{max-width:min(100%,1600px);max-height:100%;object-fit:contain;border-radius:14px;
  box-shadow:0 30px 80px rgba(0,0,0,.45);transform:scale(.96);transition:transform .28s cubic-bezier(.32,.72,0,1)}
.ds-md-image-lightbox.is-open img{transform:scale(1)}
.ds-md-image-lightbox__close{position:absolute;top:max(16px,env(safe-area-inset-top));right:16px;width:42px;height:42px;border-radius:50%;
  border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.12);color:#fff;font-size:18px;cursor:pointer;display:grid;place-items:center}
.ds-md-image-lightbox__close:hover{background:rgba(255,255,255,.22)}
@media (prefers-reduced-motion:reduce){.ds-md-image-caret,.ds-md-image-lightbox,.ds-md-image-lightbox img{transition:none}}`;
  document.head.appendChild(style);
}
