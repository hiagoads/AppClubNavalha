const fs = require('fs');

function patch(file, search, replace) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(search, replace);
  fs.writeFileSync(file, code);
}

patch('src/pages/AdminDashboard.tsx',
  ").catch(console.error);",
  ").catch(err => { if(err.code !== 'permission-denied') console.error(err); });"
);

patch('src/pages/AdminDashboard.tsx',
  ").catch(console.error);", // replace again in case there's another
  ").catch(err => { if(err.code !== 'permission-denied') console.error(err); });"
);

patch('src/components/GamificationManager.tsx',
  "console.error('Error loading clients:', e);",
  "if (e.code !== 'permission-denied') console.error('Error loading clients:', e);"
);
