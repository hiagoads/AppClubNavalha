const fs = require('fs');

function fixFile(file, regex, replace) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    if (code.match(regex)) {
      code = code.replace(regex, replace);
      fs.writeFileSync(file, code);
      console.log(`Fixed ${file}`);
    } else {
      console.log(`Did not match ${file}`);
    }
  }
}

fixFile('src/components/BillingView.tsx',
  /setBookings\(docs\);\n    \}\);\n    return/m,
  'setBookings(docs);\n    }, (err) => { if(err.code !== "permission-denied") console.error(err); });\n    return'
);

fixFile('src/components/BarbersManager.tsx',
  /setBarbers\(bData\);\n    \}\);\n\n    return/m,
  'setBarbers(bData);\n    }, (err) => { if(err.code !== "permission-denied") console.error(err); });\n\n    return'
);

fixFile('src/pages/ClientPanel.tsx',
  /setTransactions\(docs\);\n    \}\);\n\n    return/m,
  'setTransactions(docs);\n    }, (err) => { if(err.code !== "permission-denied") console.error(err); });\n\n    return'
);

fixFile('src/components/GamificationManager.tsx',
  /setClients\(clientsData\);\n    \}\);\n\n    return/m,
  'setClients(clientsData);\n    }, (err) => { if(err.code !== "permission-denied") console.error(err); });\n\n    return'
);
