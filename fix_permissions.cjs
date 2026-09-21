const fs = require('fs');

function fixFile(file, search, replace) {
    let code = fs.readFileSync(file, 'utf8');
    if (code.includes(search)) {
        code = code.replace(search, replace);
        fs.writeFileSync(file, code);
        console.log(`Updated ${file}`);
    }
}

fixFile('src/hooks/useQueue.ts', 
  'console.error("Queue snap error:", error);', 
  'if (error.code !== "permission-denied") console.error("Queue snap error:", error);'
);

fixFile('src/hooks/useHistory.ts', 
  'console.error("History snap error:", error);', 
  'if (error.code !== "permission-denied") console.error("History snap error:", error);'
);

fixFile('src/hooks/useSettings.ts', 
  'console.error("Error toggling shop status", err);', 
  'if (err.code !== "permission-denied") console.error("Error toggling shop status", err);'
);

fixFile('src/hooks/useSettings.ts', 
  'console.error("Error updating settings", err);', 
  'if (err.code !== "permission-denied") console.error("Error updating settings", err);'
);

fixFile('src/pages/ClientPanel.tsx', 
  'console.error("Update error:", err);', 
  'if (err.code !== "permission-denied") console.error("Update error:", err);'
);

fixFile('src/components/GamificationManager.tsx', 
  'console.error(\'Error loading clients:\', e);', 
  'if (e.code !== "permission-denied") console.error(\'Error loading clients:\', e);'
);

