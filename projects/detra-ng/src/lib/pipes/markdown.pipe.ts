import { Pipe, PipeTransform, SecurityContext, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { parseMermaidQuick, renderFlowchartSvgQuick } from './flowchart-renderer.util';

/**
 * MarkdownPipe — Renderiza Markdown formatado (GFM) em HTML seguro.
 * Suporta:
 * - Markdown padrão (títulos, negrito, itálico, listas, tabelas, blocos de código)
 * - Diagramas de fluxo Mermaid (flowchart / graph) renderizados inline como SVG
 * - Preservação de caixas de seleção de tarefas (- [ ] e - [x]) contra sanitização do Angular
 * - Sanitização contra vulnerabilidades XSS
 */
@Pipe({
  name: 'markdown',
  standalone: true,
  pure: true
})
export class MarkdownPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';

    // Normaliza quebras de linha
    const normalized = value.replace(/\r\n/g, '\n');

    // 1. Interceptar qualquer bloco ```mermaid ou ```flowchart ou ``` com flowchart dentro
    const mermaidRegex = /```[ \t]*(?:mermaid|flowchart)?[ \t]*\n([\s\S]*?)```/g;
    const flowchartCards: string[] = [];

    const preprocessed = normalized.replace(mermaidRegex, (match, code) => {
      const trimmed = code.trim();
      if (trimmed.startsWith('flowchart') || trimmed.startsWith('graph')) {
        const idx = flowchartCards.length;
        try {
          const data = parseMermaidQuick(trimmed);
          const svg = renderFlowchartSvgQuick(data);
          const card = `
            <div class="comment-flowchart-card">
              <div class="comment-flowchart-header">
                <span class="badge-flowchart"><i class="fa-solid fa-diagram-project"></i> Fluxograma</span>
              </div>
              <div class="comment-flowchart-body">
                ${svg}
              </div>
            </div>
          `;
          flowchartCards.push(card);
          return `\n\n@@DETRA_FLOWCHART_${idx}@@\n\n`;
        } catch (e) {
          return match;
        }
      }
      return match;
    });

    // 2. Parse Markdown padrão via marked
    let html = '';
    try {
      html = marked.parse(preprocessed, {
        async: false,
        breaks: true,
        gfm: true
      }) as string;
    } catch (e) {
      html = preprocessed;
    }

    // 3. Preservar checkboxes porque o sanitizador HTML do Angular remove tags <input>
    const token = `__DN_CB_${Date.now()}_`;
    const checkboxes: string[] = [];
    html = html.replace(/<input\b[^>]*type=["']checkbox["'][^>]*>/gi, (match) => {
      const idx = checkboxes.length;
      checkboxes.push(match);
      return `${token}${idx}__`;
    });

    // 4. Sanitizar HTML
    let sanitized = this.sanitizer.sanitize(SecurityContext.HTML, html) ?? '';

    // 5. Restaurar checkboxes
    for (let i = 0; i < checkboxes.length; i++) {
      sanitized = sanitized.replace(`${token}${i}__`, checkboxes[i]);
    }

    // 6. Restaurar cards de fluxograma com o SVG completo
    for (let i = 0; i < flowchartCards.length; i++) {
      sanitized = sanitized.replace(`<p>@@DETRA_FLOWCHART_${i}@@</p>`, flowchartCards[i]);
      sanitized = sanitized.replace(`@@DETRA_FLOWCHART_${i}@@`, flowchartCards[i]);
    }

    return this.sanitizer.bypassSecurityTrustHtml(sanitized);
  }
}
