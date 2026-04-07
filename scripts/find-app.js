import { readdirSync, statSync } from 'fs';
import { join } from 'path';

function find(dir, name, depth = 0) {
  if (depth > 4) return;
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const e of entries) {
    const full = join(dir, e);
    if (e === name) { console.log(full); }
    try {
      if (statSync(full).isDirectory() && !e.startsWith('.') && e !== 'node_modules') {
        find(full, name, depth + 1);
      }
    } catch {}
  }
}

find('/home/user', 'App.jsx');
find('/vercel', 'App.jsx');
