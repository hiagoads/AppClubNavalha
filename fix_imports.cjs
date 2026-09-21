const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientAuth.tsx', 'utf8');

code = code.replace(
  "import { Lock, Mail, Phone, User, X } from 'lucide-react';",
  "import { Lock, Mail, Phone, User, X, Camera, Calendar } from 'lucide-react';"
);
code = code.replace(
  "import React, { useState, useEffect } from 'react';",
  "import React, { useState, useEffect, useRef } from 'react';"
);

fs.writeFileSync('src/pages/ClientAuth.tsx', code);
