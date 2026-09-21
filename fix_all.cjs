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

fixFile('src/hooks/useBreaks.ts',
  /setBreaks\(activeOrFutureBreaks\);\n    }\);\n\n    return/m,
  'setBreaks(activeOrFutureBreaks);\n    }, (err) => { if(err.code !== "permission-denied") console.error(err); });\n\n    return'
);

fixFile('src/hooks/useBarbers.ts',
  /setLoading\(false\);\n    }\);\n\n    return/m,
  'setLoading(false);\n    }, (err) => { if(err.code !== "permission-denied") console.error(err); setLoading(false); });\n\n    return'
);

fixFile('src/hooks/useServices.ts',
  /setLoading\(false\);\n    }\);\n\n    return/m,
  'setLoading(false);\n    }, (err) => { if(err.code !== "permission-denied") console.error(err); setLoading(false); });\n\n    return'
);

fixFile('src/hooks/useSettings.ts',
  /setScheduleHours\(\{\}\);\n      }\n      setLoading\(false\);\n    }\);\n\n    return/m,
  'setScheduleHours({});\n      }\n      setLoading(false);\n    }, (err) => { if(err.code !== "permission-denied") console.error(err); setLoading(false); });\n\n    return'
);

fixFile('src/components/BillingView.tsx',
  /setLoading\(false\);\n    }\);\n\n    return/m,
  'setLoading(false);\n    }, (err) => { if(err.code !== "permission-denied") console.error(err); setLoading(false); });\n\n    return'
);

fixFile('src/components/BarbersManager.tsx',
  /setLoading\(false\);\n    }\);\n\n    return/m,
  'setLoading(false);\n    }, (err) => { if(err.code !== "permission-denied") console.error(err); setLoading(false); });\n\n    return'
);

fixFile('src/components/ServicesManager.tsx',
  /setLoading\(false\);\n    }\);\n\n    return/m,
  'setLoading(false);\n    }, (err) => { if(err.code !== "permission-denied") console.error(err); setLoading(false); });\n\n    return'
);

fixFile('src/pages/ClientPanel.tsx',
  /setPoints\(sum\);\n    }\);\n\n    return/m,
  'setPoints(sum);\n    }, (err) => { if(err.code !== "permission-denied") console.error(err); });\n\n    return'
);

fixFile('src/components/GamificationManager.tsx',
  /setClients\(clientsData\);\n      setLoading\(false\);\n    }\);\n\n    return/m,
  'setClients(clientsData);\n      setLoading(false);\n    }, (err) => { if(err.code !== "permission-denied") console.error(err); setLoading(false); });\n\n    return'
);

