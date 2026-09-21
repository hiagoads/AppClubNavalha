const fs = require('fs');
const file = 'src/components/modals/ClientProfileModal.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
    "import { X, Award, Clock, Star, Gift, Scissors, Gamepad2, History } from 'lucide-react';",
    "import { X, Award, Clock, Star, Gift, Scissors, Gamepad2, History, User } from 'lucide-react';"
);

fs.writeFileSync(file, code);
console.log("ClientProfileModal updated");
