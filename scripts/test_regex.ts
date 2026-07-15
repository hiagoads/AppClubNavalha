import fs from 'fs';
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

const funcs = [
  'handleUpdateServices',
  'handleAddClient',
  'startService',
  'handleAddBreak',
  'removeBreak',
  'completeService',
  'pauseService',
  'resumeService',
  'returnToQueue',
  'removeBooking',
  'undoPresent',
  'moveUp',
  'moveDown'
];

for (const fn of funcs) {
  // Matches: const fnName = async (...) => {
  const regex = new RegExp(`const ${fn} = async \\((.*?)\\) => \\{`);
  content = content.replace(regex, `const ${fn} = withProcessing(async ($1) => {`);
}

// Now we need to append the closing parenthesis `});` to the end of each function.
// This is actually very hard using regex because of nested blocks.
