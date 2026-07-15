import fs from 'fs';

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

content = content.replace(
  /import \{ (.*?) \} from 'lucide-react';/,
  "import { $1, ArrowLeft, X } from 'lucide-react';"
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content, 'utf8');
