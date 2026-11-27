/**
 * Tipos do `<ds-selectbutton>`.
 *
 * As opções podem ser objetos de qualquer formato: os campos usados para rótulo, valor, ícone e
 * desabilitado são escolhidos por `optionLabel`, `optionValue`, `optionIcon` e `optionDisabled`
 * (aceitam caminho com ponto, ex.: `meta.label`). Primitivos (string/number/boolean) também valem.
 */
export interface SelectButtonOption<T = unknown> {
  label: string;
  value: T;
  /** Classe FontAwesome, ex.: `'fa-solid fa-building-columns'`. */
  icon?: string;
  disabled?: boolean;
  /** Texto do tooltip nativo (`title`). */
  title?: string;
}

export type SelectButtonSize = 'sm' | 'md' | 'lg';
export type SelectButtonIconPosition = 'left' | 'top';
export type SelectButtonColumns = number | 'auto';
