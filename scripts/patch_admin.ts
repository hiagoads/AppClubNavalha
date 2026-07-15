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

// Wrap onSubmit
content = content.replace(/onSubmit=\{([a-zA-Z0-9_]+)\}/g, 'onSubmit={withProcessing($1)}');
// Note: Some might be inline onSubmit={() => ...}, we can replace that too
content = content.replace(/onSubmit=\{\(\) => ([^\}]+)\}/g, 'onSubmit={withProcessing(() => $1)}');

// Wrap onClick
// It's tricky to wrap all onClicks because some might just be setting state (e.g. setActiveTab)
// We only want to wrap the async ones or the ones that submit data.
// Let's just replace the specific async function declarations to manage their own isProcessing state, or use withProcessing manually on them.

fs.writeFileSync('scripts/temp.ts', content, 'utf8');
