import fs from 'fs';

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

const oldLucide = /import \{([\s\S]*?)\} from 'lucide-react';/;
const match = content.match(oldLucide);
if (match) {
   let imports = match[1];
   if (!imports.includes('ArrowLeft')) {
       imports += ', ArrowLeft';
       const newLucide = "import {" + imports + "} from 'lucide-react';";
       content = content.replace(oldLucide, newLucide);
       fs.writeFileSync('src/pages/AdminDashboard.tsx', content, 'utf8');
   }
}
