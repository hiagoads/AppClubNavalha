import fs from 'fs';

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// The `</>` is at the end, but the `<>` is missing.
content = content.replace("    </div>\n    </>\n  );\n}", "    </div>\n  );\n}"); // undo the broken one

if (!content.includes('<LoadingOverlay isVisible={isProcessing} />')) {
  content = content.replace(
    "return (\n    <div className=\"min-h-[100dvh]",
    "return (\n    <>\n      <LoadingOverlay isVisible={isProcessing} />\n      <div className=\"min-h-[100dvh]"
  );
  
  content = content.replace(
    "    </div>\n  );\n}\n\nfunction NavItem",
    "    </div>\n    </>\n  );\n}\n\nfunction NavItem"
  );
}

fs.writeFileSync('src/pages/AdminDashboard.tsx', content, 'utf8');
