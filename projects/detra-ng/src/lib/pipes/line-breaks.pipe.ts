import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * LineBreaksPipe — Converte quebras de linha em tags <br> com escape seguro de HTML.
 * Suporta quebras de linha normais (\n, \r\n) e sequências escapadas (\\n, \\r\\n).
 */
@Pipe({
  name: 'lineBreaks',
  standalone: true,
  pure: true
})
export class LineBreaksPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';

    const escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\\r\\n/g, '<br>')
      .replace(/\\n/g, '<br>')
      .replace(/\r\n/g, '<br>')
      .replace(/\n/g, '<br>');

    return this.sanitizer.bypassSecurityTrustHtml(escaped);
  }
}
