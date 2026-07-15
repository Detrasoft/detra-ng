#!/usr/bin/env node
/**
 * Build script for @detrasoft/detra-ng
 * Compila TypeScript → ESM + tipos .d.ts, copia arquivos estáticos.
 *
 * Uso:
 *   node scripts/build.mjs             # build completo
 *   node scripts/build.mjs --watch     # rebuild incremental
 *   node scripts/build.mjs --dry-run   # não escreve nada em disco
 */

import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  cpSync,
  rmSync,
  readdirSync,
  statSync,
  readFileSync,
} from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const args = new Set(process.argv.slice(2));

const isWatch = args.has('--watch');
const isDryRun = args.has('--dry-run');
const SRC = join(ROOT, 'projects/detra-ng/src');
const DIST = join(ROOT, 'dist');

const log = (label, msg) => console.log(`\x1b[36m[build:${label}]\x1b[0m ${msg}`);
const warn = (msg) => console.warn(`\x1b[33m[build]\x1b[0m ⚠  ${msg}`);
const err = (msg) => {
  console.error(`\x1b[31m[build]\x1b[0m ✗  ${msg}`);
  process.exit(1);
};
const ok = (msg) => console.log(`\x1b[32m[build]\x1b[0m ✓  ${msg}`);

/* ── 0. Pré-validações ─────────────────────────────────────────────── */
function preflight() {
  log('preflight', 'rodando checagens pré-build...');

  const major = parseInt(process.versions.node.split('.')[0], 10);
  if (major < 18) err(`Node >= 18 requerido (atual: ${process.versions.node})`);

  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  if (!pkg.name) err('package.json sem "name"');
  if (!pkg.version) err('package.json sem "version"');
  if (pkg.private === true) err('package.json marcado como private — remova para publicar');

  if (!existsSync(SRC)) err(`Diretório de fontes não encontrado: ${SRC}`);

  ok(`node ${process.versions.node}, pkg ${pkg.name}@${pkg.version}`);
}

/* ── 1. Limpar dist/ ──────────────────────────────────────────────── */
function clean() {
  if (isDryRun) return log('clean', '(dry-run) pulando limpeza');
  if (existsSync(DIST)) {
    rmSync(DIST, { recursive: true, force: true });
    ok('dist/ removido');
  } else {
    log('clean', 'dist/ não existe (primeira build?)');
  }
}

/* ── 2. Compilar TS → ESM ─────────────────────────────────────────── */
function compileTs() {
  if (isDryRun) return log('tsc', '(dry-run) pulando tsc');
  log('tsc', isWatch ? 'compilando em watch mode...' : 'compilando...');
  const cmd = isWatch
    ? 'npx tsc -p tsconfig.build.json --watch'
    : 'npx tsc -p tsconfig.build.json';

  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
    ok('TypeScript compilado');
  } catch (e) {
    err(`tsc falhou (exit ${e.status ?? '?'})`);
  }
}

/* ── 3. Copiar assets não-TS (CSS, templates HTML, etc.) ───────────── */
function copyAssets() {
  if (isDryRun) return log('assets', '(dry-run) pulando copy');
  log('assets', 'copiando assets não-TS...');
  if (!existsSync(SRC)) return;

  const exts = new Set(['.css', '.html', '.svg', '.png', '.json']);
  let copied = 0;

  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const s = statSync(full);
      if (s.isDirectory()) {
        walk(full);
      } else if (exts.has('.' + entry.split('.').pop())) {
        const rel = relative(SRC, full);
        const out = join(DIST, 'esm', rel);
        mkdirSync(dirname(out), { recursive: true });
        cpSync(full, out);
        copied++;
      }
    }
  }
  walk(SRC);

  ok(`${copied} arquivos copiados para dist/esm/`);
}

/* ── 4. Pós-validações ────────────────────────────────────────────── */
function postflight() {
  if (isDryRun) return log('postflight', '(dry-run) pulando verificação');
  log('postflight', 'verificando artefatos...');
  const indexJs = join(DIST, 'esm', 'index.js');
  const indexDts = join(DIST, 'types', 'index.d.ts');

  if (!existsSync(indexJs)) err(`index.js não foi gerado em ${indexJs}`);
  if (!existsSync(indexDts)) err(`index.d.ts não foi gerado em ${indexDts}`);
  ok('artefatos principais presentes');
}

/* ── main ─────────────────────────────────────────────────────────── */
(async () => {
  preflight();
  clean();
  compileTs();
  copyAssets();
  postflight();
  ok('build concluído com sucesso');
})();