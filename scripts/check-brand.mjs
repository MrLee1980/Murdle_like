#!/usr/bin/env node
/**
 * 品牌词门禁：确保第三方品牌名不出现在任何对外产物中。
 *
 * 用法：
 *   node scripts/check-brand.mjs            # 全仓库扫描（推荐，CI 用）
 *   node scripts/check-brand.mjs --dist     # 只扫发布产物（提审/发布前）
 *   node scripts/check-brand.mjs --quiet    # 仅输出结论
 *
 * 退出码：0 = 通过；1 = 命中禁用词。
 *
 * 注意：内部合规文档（brand-denylist.json 的 allowlist）允许出现禁用词，
 * 因为它们需要指代被规避的对象；但这些文件不得进入 dist、不得作为提审材料。
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = JSON.parse(readFileSync(join(ROOT, 'scripts/brand-denylist.json'), 'utf8'));
const TERMS = CONFIG.terms.map((t) => t.toLowerCase());
const ALLOWLIST = new Set((CONFIG.allowlist ?? []).map((p) => p.split('/').join(sep)));
const ERROR_PATHS = (CONFIG.errorPaths ?? []).map((p) => p.split('/').join(sep));
const SKIP_DIRS = new Set(CONFIG.skipDirs ?? []);

const args = new Set(process.argv.slice(2));
const DIST_ONLY = args.has('--dist');
const QUIET = args.has('--quiet');

const TEXT_EXT = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.html', '.htm', '.css',
  '.json', '.webmanifest', '.md', '.txt', '.svg', '.yml', '.yaml', '.toml',
]);

/** 递归收集候选文本文件 */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full, { throwIfNoEntry: false });
    if (!st) continue;
    if (st.isDirectory()) walk(full, out);
    else if (st.isFile()) {
      const ext = name.slice(name.lastIndexOf('.'));
      if (TEXT_EXT.has(ext)) out.push(full);
    }
  }
  return out;
}

function readText(file) {
  const buf = readFileSync(file);
  if (buf.length > 4 * 1024 * 1024) return null; // 超大体一律跳过（一般是锁文件/打包产物镜像）
  if (buf.subarray(0, 4096).includes(0)) return null; // 二进制
  return buf.toString('utf8');
}

const underErrorPath = (rel) => ERROR_PATHS.some((p) => rel === p || rel.startsWith(p + sep));

const violations = [];
const files = DIST_ONLY ? ERROR_PATHS.flatMap((p) => walk(join(ROOT, p))) : walk(ROOT);

for (const file of files) {
  const rel = relative(ROOT, file);
  if (ALLOWLIST.has(rel)) continue;
  const text = readText(file);
  if (text == null) continue;

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    for (const term of TERMS) {
      if (lower.includes(term)) {
        violations.push({ rel, line: i + 1, term, text: lines[i].trim().slice(0, 160), severity: underErrorPath(rel) ? 'error' : 'error' });
        break;
      }
    }
  }
}

if (!QUIET) {
  console.log(`扫描范围：${DIST_ONLY ? ERROR_PATHS.join(', ') : '全仓库'}（${files.length} 个文件）`);
  console.log(`禁用词：${CONFIG.terms.join(' / ')}`);
  console.log(`白名单（内部合规文档）：${[...ALLOWLIST].join(', ') || '无'}\n`);
}

if (violations.length === 0) {
  console.log('✅ 品牌词门禁通过：未发现第三方品牌名。');
  process.exit(0);
}

console.error(`❌ 发现 ${violations.length} 处第三方品牌名：\n`);
const byFile = new Map();
for (const v of violations) {
  if (!byFile.has(v.rel)) byFile.set(v.rel, []);
  byFile.get(v.rel).push(v);
}
for (const [rel, list] of byFile) {
  console.error(`  ${rel}`);
  for (const v of list.slice(0, 5)) console.error(`    :${v.line}  [${v.term}]  ${v.text}`);
  if (list.length > 5) console.error(`    … 另有 ${list.length - 5} 处`);
}
console.error('\n修复：改写为中性表述（如「原创逻辑网格推理游戏」），或加入 brand-denylist.json 的 allowlist（仅限内部合规文档）。');
process.exit(1);
