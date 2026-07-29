#!/usr/bin/env node
/**
 * Script de atualização de versão sincronizada para @detrasoft.com/detra-ng
 * Atualiza a versão nos seguintes arquivos:
 *   - package.json
 *   - projects/detra-ng/package.json
 *   - package-lock.json
 *   - README.md
 *   - CHANGELOG.md
 *
 * Uso:
 *   node scripts/bump-version.mjs patch       # ex: 0.6.10 -> 0.6.11
 *   node scripts/bump-version.mjs minor       # ex: 0.6.10 -> 0.7.0
 *   node scripts/bump-version.mjs major       # ex: 0.6.10 -> 1.0.0
 *   node scripts/bump-version.mjs 0.6.11      # versão explícita
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const ok = (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`);
const info = (msg) => console.log(`\x1b[36mℹ\x1b[0m ${msg}`);
const err = (msg) => { console.error(`\x1b[31m✗\x1b[0m ${msg}`); process.exit(1); };

function parseSemver(v) {
  const match = String(v).trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || '',
  };
}

function calculateNewVersion(currentVersion, arg) {
  if (!arg || arg === 'patch') {
    const s = parseSemver(currentVersion);
    if (!s) err(`Versão atual inválida: ${currentVersion}`);
    return `${s.major}.${s.minor}.${s.patch + 1}`;
  }
  if (arg === 'minor') {
    const s = parseSemver(currentVersion);
    if (!s) err(`Versão atual inválida: ${currentVersion}`);
    return `${s.major}.${s.minor + 1}.0`;
  }
  if (arg === 'major') {
    const s = parseSemver(currentVersion);
    if (!s) err(`Versão atual inválida: ${currentVersion}`);
    return `${s.major + 1}.0.0`;
  }
  if (parseSemver(arg)) {
    return arg.trim();
  }
  err(`Argumento de versão inválido: "${arg}". Use: patch, minor, major ou uma versão válida (ex: 0.6.11).`);
}

// 1. Ler versão atual do package.json principal
const pkgPath = join(ROOT, 'package.json');
const pkgContent = readFileSync(pkgPath, 'utf8');
const pkgJson = JSON.parse(pkgContent);
const currentVersion = pkgJson.version;

const inputArg = process.argv[2];
const newVersion = calculateNewVersion(currentVersion, inputArg);
const today = new Date().toISOString().split('T')[0];

info(`Atualizando versão: \x1b[33m${currentVersion}\x1b[0m ➔ \x1b[32m${newVersion}\x1b[0m (${today})\n`);

// 1. Atualizar package.json principal
pkgJson.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n', 'utf8');
ok(`package.json ➔ ${newVersion}`);

// 2. Atualizar projects/detra-ng/package.json
const projPkgPath = join(ROOT, 'projects/detra-ng/package.json');
if (existsSync(projPkgPath)) {
  const projPkgJson = JSON.parse(readFileSync(projPkgPath, 'utf8'));
  projPkgJson.version = newVersion;
  writeFileSync(projPkgPath, JSON.stringify(projPkgJson, null, 2) + '\n', 'utf8');
  ok(`projects/detra-ng/package.json ➔ ${newVersion}`);
}

// 3. Atualizar package-lock.json (raiz + pacote interno)
const lockPath = join(ROOT, 'package-lock.json');
if (existsSync(lockPath)) {
  const lockJson = JSON.parse(readFileSync(lockPath, 'utf8'));
  lockJson.version = newVersion;
  if (lockJson.packages && lockJson.packages['']) {
    lockJson.packages[''].version = newVersion;
  }
  writeFileSync(lockPath, JSON.stringify(lockJson, null, 2) + '\n', 'utf8');
  ok(`package-lock.json ➔ ${newVersion}`);
}

// 4. Atualizar README.md
const readmePath = join(ROOT, 'README.md');
if (existsSync(readmePath)) {
  let readme = readFileSync(readmePath, 'utf8');
  const readmeRegex = /(> \*\*Versão atual:\*\* `)[^`]+(`)/;
  if (readmeRegex.test(readme)) {
    readme = readme.replace(readmeRegex, `$1${newVersion}$2`);
    writeFileSync(readmePath, readme, 'utf8');
    ok(`README.md ➔ ${newVersion}`);
  }
}

// 5. Atualizar CHANGELOG.md
const changelogPath = join(ROOT, 'CHANGELOG.md');
if (existsSync(changelogPath)) {
  let changelog = readFileSync(changelogPath, 'utf8');
  const existingHeaderRegex = new RegExp(`## \\[${newVersion.replace(/\./g, '\\.')}\\] — \\d{4}-\\d{2}-\\d{2}`);

  if (existingHeaderRegex.test(changelog)) {
    changelog = changelog.replace(existingHeaderRegex, `## [${newVersion}] — ${today}`);
  } else {
    const headerRegex = /## \[\d+\.\d+\.\d+(?:-[^\]]+)?\] — \d{4}-\d{2}-\d{2}/;
    if (headerRegex.test(changelog)) {
      changelog = changelog.replace(headerRegex, `## [${newVersion}] — ${today}`);
    } else {
      changelog += `\n## [${newVersion}] — ${today}\n`;
    }
  }
  writeFileSync(changelogPath, changelog, 'utf8');
  ok(`CHANGELOG.md ➔ ${newVersion}`);
}

console.log(`\n\x1b[32m✔ Versão ${newVersion} aplicada com sucesso em todos os arquivos!\x1b[0m`);
