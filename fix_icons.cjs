const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientAuth.tsx', 'utf8');

code = code.replace(
  "import { X, Mail, Lock, User, Phone } from 'lucide-react';",
  "import { X, Mail, Lock, User, Phone, Camera, Calendar } from 'lucide-react';"
);

fs.writeFileSync('src/pages/ClientAuth.tsx', code);
