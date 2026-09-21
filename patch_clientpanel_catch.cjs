const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientPanel.tsx', 'utf8');

code = code.replace(
  "} catch (e) {\n        console.error(e);\n      }",
  "} catch (e: any) {\n        if (e.code !== 'permission-denied') console.error(e);\n      }"
);

fs.writeFileSync('src/pages/ClientPanel.tsx', code);
console.log('patched catch client panel');
