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
    "return (\n    <div className=\"min-h-screen",
    "return (\n    <>\n      <LoadingOverlay isVisible={isProcessing} />\n      <div className=\"min-h-screen"
  );
  content = content.replace(
    "    </div>\n  );\n}\n",
    "    </div>\n    </>\n  );\n}\n"
  );
}

// Direct handlers
const direct = ['handleUpdateServices', 'handleAddClient', 'handleAddBreak'];
for (const fn of direct) {
  content = content.replace(new RegExp(`onSubmit=\\{${fn}\\}`, 'g'), `onSubmit={withProcessing(${fn})}`);
  content = content.replace(new RegExp(`onClick=\\{${fn}\\}`, 'g'), `onClick={withProcessing(${fn})}`);
}

const replacements = [
  ["onClick={() => startService(nextB.id, barber.id)}", "onClick={withProcessing(() => startService(nextB.id, barber.id))}"],
  ["onClick={() => removeBreak(b.id)}", "onClick={withProcessing(() => removeBreak(b.id))}"],
  ["onClick={() => completeService(activeB.id)}", "onClick={withProcessing(() => completeService(activeB.id))}"],
  ["onClick={() => pauseService(activeB)}", "onClick={withProcessing(() => pauseService(activeB))}"],
  ["onClick={() => resumeService(activeB)}", "onClick={withProcessing(() => resumeService(activeB))}"],
  ["onClick={() => returnToQueue(cancelingBooking.id)}", "onClick={withProcessing(() => returnToQueue(cancelingBooking.id))}"],
  ["onClick={() => removeBooking(cancelingBooking.id)}", "onClick={withProcessing(() => removeBooking(cancelingBooking.id))}"],
  ["onClick={() => removeBooking(item.id)}", "onClick={withProcessing(() => removeBooking(item.id))}"],
  ["onClick={() => undoPresent(item.id)}", "onClick={withProcessing(() => undoPresent(item.id))}"],
  ["onClick={() => moveUp(idx)}", "onClick={withProcessing(() => moveUp(idx))}"],
  ["onClick={() => moveDown(idx)}", "onClick={withProcessing(() => moveDown(idx))}"],
  ["onClick={() => markPresent(item.id)}", "onClick={withProcessing(() => markPresent(item.id))}"],
  ["onClick={() => toggleOpenStatus(isOpen)}", "onClick={withProcessing(() => toggleOpenStatus(isOpen))}"],
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync('src/pages/AdminDashboard.tsx', content, 'utf8');
