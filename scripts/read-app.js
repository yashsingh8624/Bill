import { readFileSync } from 'fs';
const content = readFileSync('/vercel/share/v0-project/src/App.jsx', 'utf-8');
console.log(content);
