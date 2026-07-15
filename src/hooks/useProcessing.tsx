import React, { useState } from 'react';
import { LoadingOverlay } from '../components/LoadingOverlay';

export function useProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);

  const withProcessing = <T extends any[], R>(fn: (...args: T) => Promise<R> | R) => {
    return async (...args: T) => {
      // If the first argument is an event and has preventDefault, call it
      const e = args[0] as any;
      if (e && e.preventDefault && typeof e.preventDefault === 'function') {
        // e.preventDefault();
      }
      if (isProcessing) return;
      setIsProcessing(true);
      try {
        return await fn(...args);
      } finally {
        setIsProcessing(false);
      }
    };
  };

  return { isProcessing, withProcessing };
}
