import fs from 'fs';
let content = fs.readFileSync('tsconfig.json', 'utf8');
const obj = JSON.parse(content);
if (!obj.exclude) obj.exclude = [];
obj.exclude.push('server.cjs', 'dist', 'node_modules', 'scripts');
fs.writeFileSync('tsconfig.json', JSON.stringify(obj, null, 2), 'utf8');
