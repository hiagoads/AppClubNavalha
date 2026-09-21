const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// 1. Add missing )} for breaks.length
code = code.replace(/<\/div>\s*<AddBreakModal/, '</div>\n            )}\n            <AddBreakModal');

// 2. Add missing )} for activeTab === 'queue'
// Wait, the modals used to be INSIDE the queue tab? Or outside?
// If they are outside, they shouldn't be between <></>
// Let's look at the original code's end of queue tab.
