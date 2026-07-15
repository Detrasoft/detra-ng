#!/usr/bin/env node
/**
 * pre-publish hook — validações antes de publicar no npm.
 * Roda automaticamente via `npm publish` (script "prepublishOnly" no package.json).
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const ok = (m) => console.log(`\x1b[32m✓\x1b[0m  ${m}`);
const warn = (m) => console.warn(`\x1b[33m⚠\x1b[0m  ${m}`);
const err = (m) => { console.error(`\x1b[31m✗\x1b[0m  ${m}`); process.exit(1); };

console.log('\x1b[36m━━━ pre-publish checks @detrasoft.com/detra-ng ━━━\x1b[0m\n');

/* 1. package.json válido */
let pkg;
try {
  pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  ok('package.json parseou');
} catch {
  err('package.json inválido');
}

if (pkg.private === true) err('package.json está como private — publique lib pública');
if (!pkg.name?.startsWith('@detrasoft.com/')) err(`escopo incorreto: ${pkg.name}`);
if (!pkg.version) err('sem versão');
if (!pkg.license) err('sem license');

ok(`${pkg.name}@${pkg.version} (${pkg.license})`);

/* 2. LICENSE presente */
if (!existsSync(join(ROOT, 'LICENSE'))) err('LICENSE ausente');
ok('LICENSE presente');

/* 3. README presente */
if (!existsSync(join(ROOT, 'README.md'))) warn('README.md ausente — recomendado');
else ok('README.md presente');

/* 4. dist/ existe e tem artefatos */
const distDir = join(ROOT, 'dist');
if (!existsSync(distDir)) err('dist/ não existe — rode `npm run build` primeiro');
if (!existsSync(join(distDir, 'esm', 'index.js'))) err('dist/esm/index.js ausente');
if (!existsSync(join(distDir, 'types', 'index.d.ts'))) err('dist/types/index.d.ts ausente');
ok('dist/ com artefatos');

/* 5. .npmignore respeitando dist/ */
const npmignore = join(ROOT, '.npmignore');
if (existsSync(npmignore)) {
  const content = readFileSync(npmignore, 'utf8');
  if (!content.includes('projects') && !content.includes('/src')) {
    warn('.npmignore pode não estar excluindo o source');
  }
}

/* 6. git status limpo (aviso, não bloqueia) */
try {
  const status = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' });
  if (status.trim()) {
    warn('working tree sujo — há alterações não commitadas:');
    console.log(status);
  } else {
    ok('git working tree limpo');
  }
} catch {
  warn('não foi possível checar git status (sem repo?)');
}

/* 7. usuário logado no npm? */
try {
  const who = execSync('npm whoami', { cwd: ROOT, encoding: 'utf8' }).trim();
  ok(`autenticado no npm como: ${who}`);
} catch {
  err('não autenticado no npm — rode `npm login` primeiro');
}

console.log('\n\x1b[32m━━━ todas as checagens passaram ━━━\x1b[0m\n');