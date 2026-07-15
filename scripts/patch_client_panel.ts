import fs from 'fs';

let content = fs.readFileSync('src/pages/ClientPanel.tsx', 'utf8');

// Add import
if (!content.includes('LoadingOverlay')) {
  content = content.replace(
    "import { useBarbers } from '../hooks/useBarbers';",
    "import { useBarbers } from '../hooks/useBarbers';\nimport { LoadingOverlay } from '../components/LoadingOverlay';"
  );
}

// Add state and wrap function
if (!content.includes('const [isProcessing, setIsProcessing] = useState(false);')) {
  content = content.replace(
    "const [formType, setFormType] = useState<'walk-in' | 'scheduled'>('walk-in');",
    `const [formType, setFormType] = useState<'walk-in' | 'scheduled'>('walk-in');
  const [isProcessing, setIsProcessing] = useState(false);

  const withProcessing = (fn: any) => {
    return async (...args: any[]) => {
      if (args[0] && args[0].preventDefault) args[0].preventDefault();
      if (isProcessing) return;
      setIsProcessing(true);
      try {
        await fn(...args);
      } finally {
        setIsProcessing(false);
      }
    };
  };`
  );
}

// Wrap handleSubmit
content = content.replace(
  `onSubmit={handleSubmit}`,
  `onSubmit={withProcessing(handleSubmit)}`
);

// Wrap handleUpdateServices
content = content.replace(
  `onSubmit={handleUpdateServices}`,
  `onSubmit={withProcessing(handleUpdateServices)}`
);

// Wrap handleCheckIn
content = content.replace(
  `onClick={handleCheckIn}`,
  `onClick={withProcessing(handleCheckIn)}`
);

// Wrap handleUndoCheckIn
content = content.replace(
  `onClick={handleUndoCheckIn}`,
  `onClick={withProcessing(handleUndoCheckIn)}`
);

// Wrap handleWithdraw
content = content.replace(
  `onClick={handleWithdraw}`,
  `onClick={withProcessing(handleWithdraw)}`
);

// Add LoadingOverlay to JSX
if (!content.includes('<LoadingOverlay isVisible={isProcessing} />')) {
  content = content.replace(
    "{/* Floating WhatsApp Contact Button */}",
    `<LoadingOverlay isVisible={isProcessing} />\n      {/* Floating WhatsApp Contact Button */}`
  );
}

fs.writeFileSync('src/pages/ClientPanel.tsx', content, 'utf8');
