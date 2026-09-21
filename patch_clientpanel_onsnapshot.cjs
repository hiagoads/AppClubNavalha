const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientPanel.tsx', 'utf8');

code = code.replace(
  "      }\n    });\n\n    return () => unsubscribe();\n  }, []);",
  "      }\n    }, (err: any) => { if (err.code !== 'permission-denied') console.error(err); });\n\n    return () => unsubscribe();\n  }, []);"
);

fs.writeFileSync('src/pages/ClientPanel.tsx', code);
console.log('patched onSnapshot client panel');
