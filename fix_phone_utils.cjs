const fs = require('fs');
let code = fs.readFileSync('src/utils.ts', 'utf8');

if (!code.includes('formatPhone')) {
code += `\nexport function formatPhone(val: string): string {
  if (!val) return '';
  const numeric = val.replace(/\\D/g, '');
  if (numeric.length === 0) return '';
  if (numeric.length <= 2) return \`(\${numeric}\`;
  if (numeric.length <= 7) return \`(\${numeric.slice(0, 2)}) \${numeric.slice(2)}\`;
  return \`(\${numeric.slice(0, 2)}) \${numeric.slice(2, 7)}-\${numeric.slice(7, 11)}\`;
}\n
export function parsePhone(val: string): string {
  if (!val) return '';
  return val.replace(/\\D/g, '').slice(0, 11);
}\n`;
  fs.writeFileSync('src/utils.ts', code);
  console.log("utils.ts updated");
}
