import { readdirSync, statSync } from 'fs';
import { join } from 'path';

function tree(dir, depth = 0) {
  if (depth > 4) return;
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const e of entries) {
    if (e === 'node_modules' || e === 'dist' || e.startsWith('.')) continue;
    const full = join(dir, e);
    const indent = '  '.repeat(depth);
    const isDir = (() => { try { return statSync(full).isDirectory(); } catch { return false; } })();
    console.log(indent + (isDir ? '[D] ' : '[F] ') + e);
    if (isDir) tree(full, depth + 1);
  }
}

tree('/home/user');
