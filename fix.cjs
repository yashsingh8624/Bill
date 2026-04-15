const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src');

for (const file of files) {
  let original = fs.readFileSync(file, 'utf8');
  let content = original;

  // Fix inputs
  content = content.replace(/<input([^>]*?)className=(["'])(.*?)(["'])/g, (match, prefix, q1, cls, q2) => {
       cls = cls.replace(/bg-(white|gray-\d+|slate-\d+)\s+dark:bg-[a-z]+-\d+/g, '');
       cls = cls.replace(/text-(black|white|gray-\d+|slate-\d+)\s+dark:text-[a-z]+-\d+/g, '');
       cls = cls.replace(/bg-white(?!\S)/g, '');
       cls = cls.replace(/bg-transparent(?!\S)/g, '');
       cls = cls.replace(/text-(black|gray-\d+|slate-\d+)(?!\S)/g, '');
       cls = cls.trim();
       cls = `bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white ${cls}`;
       cls = cls.replace(/\s+/g, ' ');
       return `<input${prefix}className=${q1}${cls}${q2}`;
  });

  // Fix labels
  content = content.replace(/<label([^>]*?)className=(["'])(.*?)(["'])/g, (match, prefix, q1, cls, q2) => {
       cls = cls.replace(/text-(black|white|gray-\d+|slate-\d+)\s+dark:text-[a-z]+-\d+/g, '');
       cls = cls.replace(/text-(black|gray-\d+|slate-\d+)(?!\S)/g, '');
       cls = cls.trim();
       cls = `text-gray-700 dark:text-gray-300 ${cls}`;
       cls = cls.replace(/\s+/g, ' ');
       return `<label${prefix}className=${q1}${cls}${q2}`;
  });

  // Generic Plain Text Replacements (text-slate-800 dark:text-slate-100 defaults)
  content = content.replace(/text-slate-(800|900)\s+dark:text-white/g, 'text-slate-800 dark:text-slate-100');
  content = content.replace(/text-gray-(800|900)\s+dark:text-white/g, 'text-slate-800 dark:text-slate-100');
  content = content.replace(/text-black\s+dark:text-white/g, 'text-slate-800 dark:text-slate-100');
  
  // Naked text classes fixing:
  content = content.replace(/(?<!-)text-black(?!\s+dark:text-[a-z]+-\d+)/g, 'text-slate-800 dark:text-slate-100');

  if (original !== content) {
      console.log('Fixed', file);
      fs.writeFileSync(file, content);
  }
}
