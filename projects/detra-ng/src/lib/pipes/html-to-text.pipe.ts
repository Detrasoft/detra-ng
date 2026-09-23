import { Pipe, PipeTransform } from '@angular/core';

/**
 * HtmlToTextPipe — Extrai o texto puro a partir de uma string HTML.
 * Preserva o espaçamento entre elementos de bloco (p, div, br, headers, etc.),
 * decodifica entidades HTML comuns e normaliza múltiplos espaços em branco.
 * Compatível com SSR (Angular Universal) e execução no navegador.
 */
@Pipe({
  name: 'htmlToText',
  standalone: true,
  pure: true
})
export class HtmlToTextPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';

    // Insere espaço antes/depois de tags de bloco conhecidas para evitar colar palavras
    let text = value
      .replace(/<\/?(p|div|br|h[1-6]|li|ul|ol|blockquote|hr|tr|td|th)\b[^>]*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/gi, "'");

    return text.replace(/\s+/g, ' ').trim();
  }
}
