/**
 * Folha de estilo única do skeleton da detra-ng.
 *
 * Injetada UMA vez por documento (ver `ensureSkeletonStyles`), em vez de repetida
 * no CSS encapsulado de cada componente. Só pinta quando há um ancestral `.ds-sk`
 * ativo, então com o skeleton desligado o custo é zero.
 *
 * Vocabulário:
 *  - `.ds-sk`            → contêiner em modo skeleton (posto pela diretiva no host).
 *  - `[data-sk]`         → "osso": mantém o tamanho do elemento e esconde o conteúdo.
 *      data-sk="text"    → osso que abraça o texto (rótulos, dicas).
 *      data-sk="circle"  → osso redondo (ícones, avatares).
 *      data-sk="pill"    → osso em pílula (badges, chips, abas).
 *  - `[data-sk-hide]`    → some durante o skeleton sem ocupar visual (ícones soltos).
 *  - `.ds-sk-cover`      → esconde o conteúdo projetado e mostra só os filhos `.ds-sk-ph`.
 *  - `.ds-sk-line | .ds-sk-title | .ds-sk-dot | .ds-sk-chip | .ds-sk-btn | .ds-sk-box`
 *                        → peças de placeholder para quando ainda não há conteúdo.
 *
 * Desempenho (aparelhos antigos):
 *  - Só anima `opacity` (composição na GPU, sem repaint nem layout).
 *  - Não cria pseudo-elementos nem muda `position`/`overflow` dos elementos.
 *  - Desliga blur/backdrop-filter/sombras dos ossos (as partes mais caras do glass).
 *  - Sem animação com `prefers-reduced-motion`, com `.ds-sk-static` em qualquer
 *    ancestral, ou automaticamente em aparelhos fracos (≤ 2 núcleos ou ≤ 2 GB).
 */
export const DS_SKELETON_CSS = `
@keyframes ds-sk-pulse{0%,100%{opacity:1}50%{opacity:.45}}
.ds-sk{cursor:progress;pointer-events:none;-webkit-user-select:none;user-select:none}
.ds-sk [data-sk],.ds-sk[data-sk]{
color:transparent!important;-webkit-text-fill-color:transparent!important;
background:var(--ds-sk-bg,var(--skeleton-mid,rgba(128,128,128,.16)))!important;
border-color:transparent!important;box-shadow:none!important;text-shadow:none!important;outline:0!important;
-webkit-backdrop-filter:none!important;backdrop-filter:none!important;filter:none!important;
transition:none!important;animation:ds-sk-pulse var(--ds-sk-duration,1.6s) ease-in-out infinite!important}
.ds-sk [data-sk] *,.ds-sk[data-sk] *,.ds-sk [data-sk]::before,.ds-sk [data-sk]::after,.ds-sk [data-sk-hide]{visibility:hidden!important}
.ds-sk [data-sk]::placeholder{color:transparent!important;-webkit-text-fill-color:transparent!important}
.ds-sk [data-sk=text]{width:-moz-fit-content;width:fit-content;min-width:4ch;max-width:100%;border-radius:4px!important}
.ds-sk [data-sk=circle]{border-radius:50%!important}
.ds-sk [data-sk=pill]{border-radius:999px!important}
.ds-sk-stack{display:flex;flex-direction:column;gap:var(--ds-sk-gap,.6rem)}
.ds-sk-inline{display:flex;align-items:center;gap:var(--ds-sk-gap,.75rem)}
.ds-sk-end{justify-content:flex-end}
.ds-sk-cover>:not(.ds-sk-ph){display:none!important}
.ds-sk-grow{flex:1 1 auto;min-width:0}
.ds-sk-line{display:block;height:.75em;width:100%;border-radius:4px}
.ds-sk-line:nth-child(4n+2){width:86%}.ds-sk-line:nth-child(4n+3){width:64%}.ds-sk-line:last-child:not(:first-child){width:46%}
.ds-sk-row:nth-child(3n+2) .ds-sk-line{width:58%}.ds-sk-row:nth-child(3n) .ds-sk-line{width:76%}
.ds-sk-title{display:block;height:1.1em;width:42%;border-radius:6px}
.ds-sk-dot{display:block;flex:none;width:var(--ds-sk-size,2.25rem);height:var(--ds-sk-size,2.25rem);border-radius:50%}
.ds-sk-chip{display:inline-block;flex:none;height:1.15rem;width:4.5rem;border-radius:999px}
.ds-sk-btn{display:inline-block;flex:none;height:2.25rem;width:6.5rem;border-radius:10px}
.ds-sk-box{display:block;width:100%;height:var(--ds-sk-h,6rem);border-radius:12px}
.ds-sk-static [data-sk],.ds-sk-static[data-sk]{animation:none!important}
@media (prefers-reduced-motion:reduce){.ds-sk [data-sk],.ds-sk[data-sk]{animation:none!important}}
`;

/** Complemento para aparelhos fracos: ossos estáticos, nenhuma animação. */
export const DS_SKELETON_LITE_CSS = `.ds-sk [data-sk],.ds-sk[data-sk]{animation:none!important}`;
