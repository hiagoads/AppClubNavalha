const fs = require('fs');

let code = fs.readFileSync('src/components/BarbersManager.tsx', 'utf8');
code = code.replace(
  "setBarbers(bData);\n      setLoading(false);\n    });\n\n    return",
  "setBarbers(bData);\n      setLoading(false);\n    }, (err) => { if(err.code !== 'permission-denied') console.error(err); setLoading(false); });\n\n    return"
);
fs.writeFileSync('src/components/BarbersManager.tsx', code);

code = fs.readFileSync('src/pages/ClientPanel.tsx', 'utf8');
code = code.replace(
  "setRedemptions(data);\n    });\n\n    return",
  "setRedemptions(data);\n    }, (err) => { if(err.code !== 'permission-denied') console.error(err); });\n\n    return"
);
fs.writeFileSync('src/pages/ClientPanel.tsx', code);

code = fs.readFileSync('src/components/GamificationManager.tsx', 'utf8');
code = code.replace(
  "setClients(clientsData);\n      setLoadingClients(false);\n    });\n\n    return",
  "setClients(clientsData);\n      setLoadingClients(false);\n    }, (err) => { if(err.code !== 'permission-denied') console.error(err); setLoadingClients(false); });\n\n    return"
);
fs.writeFileSync('src/components/GamificationManager.tsx', code);

console.log("Done");
