const fs = require('fs');
let code = fs.readFileSync('src/components/GamificationManager.tsx', 'utf8');

code = code.replace(
  'className="flex flex-col md:flex-row gap-6 items-end"',
  'className="flex flex-col md:flex-row gap-6 items-stretch md:items-end w-full"'
);

// Add w-full to the flex-1 divs just in case, though items-stretch should do it.
code = code.replace(
  '<div className="flex-1 space-y-2">',
  '<div className="flex-1 w-full space-y-2">'
);
code = code.replace(
  '<div className="flex-1 space-y-2">',
  '<div className="flex-1 w-full space-y-2">'
);

fs.writeFileSync('src/components/GamificationManager.tsx', code);
