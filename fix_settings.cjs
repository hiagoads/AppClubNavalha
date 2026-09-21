const fs = require('fs');
let code = fs.readFileSync('src/components/GlobalSettings.tsx', 'utf8');

if (!code.includes('import { BackupManager }')) {
    code = code.replace(
        "import React, { useState, useEffect } from 'react';",
        "import React, { useState, useEffect } from 'react';\nimport { BackupManager } from './BackupManager';"
    );
    
    // insert right before the last closing </div> of GlobalSettings
    const insertionPoint = code.lastIndexOf('</div>');
    if (insertionPoint !== -1) {
        code = code.substring(0, insertionPoint) + '      <BackupManager />\n    ' + code.substring(insertionPoint);
        fs.writeFileSync('src/components/GlobalSettings.tsx', code);
    }
}
