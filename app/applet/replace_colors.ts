import fs from 'fs';
import path from 'path';

const srcDir = './src';

function walk(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, fileList);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = walk(srcDir);

const replacements = [
  { search: /bg-slate-100/g, replace: 'bg-[#000000]' },
  { search: /bg-slate-50/g, replace: 'bg-zinc-900/50' },
  { search: /bg-white/g, replace: 'bg-[#0a0a0a]' },
  
  // Text colors
  { search: /text-slate-800/g, replace: 'text-zinc-100' },
  { search: /text-slate-700/g, replace: 'text-zinc-200' },
  { search: /text-slate-600/g, replace: 'text-zinc-300' },
  { search: /text-slate-500/g, replace: 'text-zinc-400' },
  { search: /text-slate-400/g, replace: 'text-zinc-500' },
  { search: /text-slate-300/g, replace: 'text-zinc-600' },
  
  // Borders
  { search: /border-slate-300/g, replace: 'border-zinc-800' },
  { search: /border-slate-200/g, replace: 'border-zinc-800/80' },
  { search: /border-slate-350/g, replace: 'border-zinc-700' },
  
  // Hovers
  { search: /hover:bg-slate-50/g, replace: 'hover:bg-zinc-800' },
  { search: /hover:bg-white/g, replace: 'hover:bg-zinc-800' },
  { search: /hover:text-slate-800/g, replace: 'hover:text-zinc-100' },
  { search: /hover:text-slate-900/g, replace: 'hover:text-white' },
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  for (const rep of replacements) {
    content = content.replace(rep.search, rep.replace);
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
