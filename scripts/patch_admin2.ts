import fs from 'fs';

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

if (!content.includes('useProcessing')) {
  content = content.replace(
    "import { useBarbers } from '../hooks/useBarbers';",
    "import { useBarbers } from '../hooks/useBarbers';\nimport { useProcessing } from '../hooks/useProcessing';\nimport { LoadingOverlay } from '../components/LoadingOverlay';"
  );
}

if (!content.includes('const { isProcessing, withProcessing } = useProcessing();')) {
  content = content.replace(
    "const queueTimers = useQueueTimers(activeBookings, queue, services, breaks, barbers);",
    "const queueTimers = useQueueTimers(activeBookings, queue, services, breaks, barbers);\n  const { isProcessing, withProcessing } = useProcessing();"
  );
}

// Add LoadingOverlay to JSX
if (!content.includes('<LoadingOverlay isVisible={isProcessing} />')) {
  content = content.replace(
    "return (\n    <div",
    "return (\n    <div className=\"min-h-screen bg-carbon text-white relative\">\n      <LoadingOverlay isVisible={isProcessing} />"
  );
  content = content.replace(
    "return (\n    <div className=\"min-h-screen",
    "return (\n    <><LoadingOverlay isVisible={isProcessing} />\n    <div className=\"min-h-screen"
  );
}

// Direct handlers
const direct = ['handleUpdateServices', 'handleAddClient', 'handleAddBreak'];
for (const fn of direct) {
  content = content.replace(new RegExp(`onSubmit=\\{${fn}\\}`, 'g'), `onSubmit={withProcessing(${fn})}`);
  content = content.replace(new RegExp(`onClick=\\{${fn}\\}`, 'g'), `onClick={withProcessing(${fn})}`);
}

// Arrow function handlers
const arrow = [
  'startService',
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

for (const fn of arrow) {
  // Matches onClick={() => fn(...)} and wraps it.
  const regex = new RegExp(`onClick=\\{\\(\\)\\s*=>\\s*(${fn}\\([^\\}]+)\\}`);
  let match;
  while ((match = regex.exec(content)) !== null) {
    const original = match[0]; // e.g. onClick={() => startService(b.id, b.barberId)}
    const inner = match[1]; // e.g. startService(b.id, b.barberId)
    // There could be nested braces if the arguments contain objects. Let's use a simple string replace for each occurrence found, but `regex.exec` might not capture properly if there are `}` inside the args.
    // Fortunately these calls are simple: startService(b.id, val)
  }
}
