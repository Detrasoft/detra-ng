export interface SimpleFlowchartNode {
  id: string;
  label: string;
  type: 'process' | 'terminal' | 'decision' | 'database';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SimpleFlowchartEdge {
  sourceId: string;
  targetId: string;
  label?: string;
}

export interface SimpleFlowchartData {
  direction: 'LR' | 'TB';
  nodes: SimpleFlowchartNode[];
  edges: SimpleFlowchartEdge[];
}

export function parseMermaidQuick(code: string): SimpleFlowchartData {
  const lines = code.split('\n');
  let dir: 'LR' | 'TB' = 'LR';
  const nodesMap = new Map<string, SimpleFlowchartNode>();
  const edges: SimpleFlowchartEdge[] = [];

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('flowchart') || line.startsWith('graph')) {
      if (line.includes('TB') || line.includes('TD')) dir = 'TB';
      else dir = 'LR';
      continue;
    }

    // Terminal: A(["Início"]) ou A([Início])
    const terminalMatch = line.match(/^(\w+)\(\[?"?([^"\]]+)"?\]\)/);
    if (terminalMatch) {
      nodesMap.set(terminalMatch[1], {
        id: terminalMatch[1],
        label: terminalMatch[2].trim(),
        type: 'terminal',
        x: 0,
        y: 0,
        width: 130,
        height: 46,
      });
      continue;
    }

    // Decisão: A{"Decisão"} ou A{Decisão}
    const decisionMatch = line.match(/^(\w+)\{"?([^"}]+)"?\}/);
    if (decisionMatch) {
      nodesMap.set(decisionMatch[1], {
        id: decisionMatch[1],
        label: decisionMatch[2].trim(),
        type: 'decision',
        x: 0,
        y: 0,
        width: 130,
        height: 60,
      });
      continue;
    }

    // Banco: A[("DB")] ou A[(DB)]
    const dbMatch = line.match(/^(\w+)\[\("?([^"\)]+)"?\)\]/);
    if (dbMatch) {
      nodesMap.set(dbMatch[1], {
        id: dbMatch[1],
        label: dbMatch[2].trim(),
        type: 'database',
        x: 0,
        y: 0,
        width: 130,
        height: 52,
      });
      continue;
    }

    // Processo: A["Processo"] ou A[Processo]
    const procMatch = line.match(/^(\w+)\["?([^"\]]+)"?\]/);
    if (procMatch) {
      nodesMap.set(procMatch[1], {
        id: procMatch[1],
        label: procMatch[2].trim(),
        type: 'process',
        x: 0,
        y: 0,
        width: 140,
        height: 50,
      });
      continue;
    }

    // Conexões: A --> B ou A -->|"label"| B ou A -->|label| B
    const edgeMatch = line.match(/^(\w+)\s*-->\s*(?:\|"?([^"|]+)"?\|\s*)?(\w+)/);
    if (edgeMatch) {
      const source = edgeMatch[1];
      const label = (edgeMatch[2] || '').trim();
      const target = edgeMatch[3];

      if (!nodesMap.has(source)) {
        nodesMap.set(source, {
          id: source,
          type: 'process',
          label: source,
          x: 0,
          y: 0,
          width: 130,
          height: 50,
        });
      }
      if (!nodesMap.has(target)) {
        nodesMap.set(target, {
          id: target,
          type: 'process',
          label: target,
          x: 0,
          y: 0,
          width: 130,
          height: 50,
        });
      }
      edges.push({
        sourceId: source,
        targetId: target,
        label,
      });
    }
  }

  // Layout Inteligente de Posições
  const nodes = Array.from(nodesMap.values());
  const isHorizontal = dir === 'LR';

  // Grafo de dependência para ordenar nós em níveis
  const incomingCount = new Map<string, number>();
  nodes.forEach(n => incomingCount.set(n.id, 0));
  edges.forEach(e => {
    incomingCount.set(e.targetId, (incomingCount.get(e.targetId) || 0) + 1);
  });

  // Nós raiz (nível 0)
  const levels = new Map<string, number>();
  const queue: string[] = [];
  nodes.forEach(n => {
    if ((incomingCount.get(n.id) || 0) === 0) {
      levels.set(n.id, 0);
      queue.push(n.id);
    }
  });

  // BFS para atribuir níveis
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const curLevel = levels.get(currentId) || 0;
    const outEdges = edges.filter(e => e.sourceId === currentId);
    for (const edge of outEdges) {
      const nextId = edge.targetId;
      const prevLevel = levels.get(nextId) || 0;
      if (curLevel + 1 > prevLevel) {
        levels.set(nextId, curLevel + 1);
        queue.push(nextId);
      }
    }
  }

  // Se algum nó ficou desconectado, atribui nível pelo índice
  nodes.forEach((n, idx) => {
    if (!levels.has(n.id)) {
      levels.set(n.id, idx);
    }
  });

  // Agrupa nós por nível para definir coordenadas
  const levelGroups = new Map<number, SimpleFlowchartNode[]>();
  nodes.forEach(n => {
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
  };
}

export function renderFlowchartSvgQuick(data: SimpleFlowchartData): string {
  const nodes = data.nodes;
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
      <marker id="comment-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--flowchart-line-stroke, #896ff4)"/>
      </marker>
      <filter id="svg-node-shadow" x="-8%" y="-8%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.08"/>
      </filter>
    </defs>
  `;

  // Arestas
  for (const edge of data.edges) {
    const src = nodes.find((n) => n.id === edge.sourceId);
    const tgt = nodes.find((n) => n.id === edge.targetId);
    if (src && tgt) {
      let sx = src.x + src.width;
      let sy = src.y + src.height / 2;
      let tx = tgt.x;
      let ty = tgt.y + tgt.height / 2;

      // Se alvo estiver acima/abaixo em vez de à frente
      const dx = tx - sx;
      let path = '';
      if (dx > 30) {
        const mx = (sx + tx) / 2;
        path = `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`;
      } else {
        const mx = (src.x + src.width / 2 + tgt.x + tgt.width / 2) / 2;
        path = `M ${src.x + src.width / 2} ${src.y + src.height} C ${mx} ${src.y + src.height + 40}, ${mx} ${tgt.y - 40}, ${tgt.x + tgt.width / 2} ${tgt.y}`;
      }

      svg += `<path d="${path}" fill="none" stroke="var(--flowchart-line-stroke, #896ff4)" stroke-width="2" marker-end="url(#comment-arrow)"/>`;
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

    svg += `<g transform="translate(${n.x}, ${n.y})" filter="url(#svg-node-shadow)">`;
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
