const fs = require('fs');
let code = fs.readFileSync('src/components/modals/EditClientProfileModal.tsx', 'utf8');

code = code.replace(
    "import { formatPhone } from '../../utils/formatters';",
    `const formatPhone = (val: string) => {
  const numeric = val.replace(/\\D/g, '');
  if (numeric.length === 0) return '';
  if (numeric.length <= 2) return \`(\${numeric}\`;
  if (numeric.length <= 7) return \`(\${numeric.slice(0, 2)}) \${numeric.slice(2)}\`;
  return \`(\${numeric.slice(0, 2)}) \${numeric.slice(2, 7)}-\${numeric.slice(7, 11)}\`;
};`
);

fs.writeFileSync('src/components/modals/EditClientProfileModal.tsx', code);
console.log("EditClientProfileModal updated");
