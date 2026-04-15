const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(filePath));
        } else {
            if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
                results.push(filePath);
            }
        }
    });
    return results;
}

const files = walkDir(srcDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Only apply if not already completely modified (some manual touches are fine, but limit duplicate application)
    if (content.includes('dark:bg-slate-800') && content.split('dark:bg-slate-800').length > 5) {
        return; // skip files we already touched manually
    }

    // bg-white -> bg-white dark:bg-slate-800
    content = content.replace(/bg-white(?!\s+dark:bg-slate-800)/g, 'bg-white dark:bg-slate-800 transition-colors duration-300');
    
    // text-slate-800 -> text-slate-800 dark:text-white
    content = content.replace(/text-slate-800(?!\s+dark:text-white)/g, 'text-slate-800 dark:text-white transition-colors duration-300');
    
    // text-slate-700 -> text-slate-700 dark:text-slate-200
    content = content.replace(/text-slate-700(?!\s+dark:text-slate-200)/g, 'text-slate-700 dark:text-slate-300 transition-colors duration-300');
    
    // text-slate-600 -> text-slate-600 dark:text-slate-300
    content = content.replace(/text-slate-600(?!\s+dark:text-slate-300)/g, 'text-slate-600 dark:text-slate-400 transition-colors duration-300');
    
    // text-slate-500 -> text-slate-500 dark:text-slate-400
    content = content.replace(/text-slate-500(?!\s+dark:text-slate-400)/g, 'text-slate-500 dark:text-slate-500 transition-colors duration-300');
    
    // bg-slate-50 -> bg-slate-50 dark:bg-slate-900/50
    content = content.replace(/bg-slate-50(?!\s+dark:bg-slate-900|\/)/g, 'bg-slate-50 dark:bg-slate-900/50 transition-colors duration-300');

    // border-slate-100 -> border-slate-100 dark:border-slate-700/50
    content = content.replace(/border-slate-100(?!\s+dark:border-slate-700)/g, 'border-slate-100 dark:border-slate-700/50 transition-colors duration-300');
    
    // border-slate-200 -> border-slate-200 dark:border-slate-700
    content = content.replace(/border-slate-200(?!\s+dark:border-slate-700)/g, 'border-slate-200 dark:border-slate-700 transition-colors duration-300');

    // Button updates: swap out indigo for green in generic primary buttons 
    content = content.replace(/bg-indigo-600 hover:bg-indigo-700/g, 'bg-green-600 hover:bg-green-700');
    content = content.replace(/bg-indigo-600 hover:bg-indigo-500/g, 'bg-green-600 hover:bg-green-500');

    // Make modals fully responsive (w-full max-w-sm)
    content = content.replace(/w-\[[\w\.]+\]/g, 'w-full max-w-sm'); // e.g. replace w-[350px]
    // And some other fixed width elements?
    
    fs.writeFileSync(file, content, 'utf8');
});

console.log("Dark mode and form layout injected across JSX files.");
