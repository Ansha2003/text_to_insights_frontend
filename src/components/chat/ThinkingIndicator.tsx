'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

interface ThinkingIndicatorProps {
  isActive: boolean;
  elapsedSeconds?: number;
}

// Status messages that rotate based on elapsed time
const STATUS_MESSAGES = [
  { threshold: 0, message: 'Analyzing your query...' },
  { threshold: 5, message: 'Searching through your data...' },
  { threshold: 15, message: 'Processing results...' },
  { threshold: 30, message: 'Almost there, handling complex query...' },
  { threshold: 60, message: 'Still working on it...' },
];

// Custom hook for elapsed time tracking
function useElapsedTimer(isActive: boolean, externalElapsed?: number) {
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    startTimeRef.current = Date.now();
    setElapsed(0);
    
    intervalRef.current = setInterval(() => {
      const secondsElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(secondsElapsed);
    }, 1000);
  }, [stopTimer]);

  useEffect(() => {
    // If external elapsed is provided, don't run internal timer
    if (externalElapsed !== undefined) {
      stopTimer();
      return;
    }

    if (isActive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- timer is an external system subscription
      startTimer();
    } else {
      stopTimer();
    }

    return stopTimer;
  }, [isActive, externalElapsed, startTimer, stopTimer]);

  // Return external elapsed if provided, otherwise internal
  return externalElapsed ?? elapsed;
}

export function ThinkingIndicator({ 
  isActive, 
  elapsedSeconds: externalElapsed 
}: ThinkingIndicatorProps) {
  const elapsed = useElapsedTimer(isActive, externalElapsed);

  // Get appropriate status message based on elapsed time
  const statusMessage = useMemo(() => {
    for (let i = STATUS_MESSAGES.length - 1; i >= 0; i--) {
      if (elapsed >= STATUS_MESSAGES[i].threshold) {
        return STATUS_MESSAGES[i].message;
      }
    }
    return STATUS_MESSAGES[0].message;
  }, [elapsed]);

  // Format elapsed time for display
  const formattedTime = useMemo(() => {
    if (elapsed < 60) {
      return `${elapsed}s`;
    }
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}m ${seconds}s`;
  }, [elapsed]);

  if (!isActive) return null;

  return (
    <div 
      className="thinking-indicator" 
      role="status" 
      aria-live="polite"
      aria-label={`${statusMessage} ${formattedTime}`}
    >
      {/* Pulsing Avatar */}
      <div className="thinking-indicator__avatar" aria-hidden="true">
        <DatabaseIcon />
      </div>

      {/* Content */}
      <div className="thinking-indicator__content">
        {/* Animated Dots */}
        <div className="thinking-indicator__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        {/* Status Label with Timer */}
        <div className="thinking-indicator__status">
          <span className="thinking-indicator__message">{statusMessage}</span>
          <span className="thinking-indicator__time">{formattedTime}</span>
        </div>
      </div>
    </div>
  );
}

// Compact version for inline use
export function ThinkingDots() {
  return (
    <span className="thinking-dots" role="status" aria-label="Processing">
      <span />
      <span />
      <span />
    </span>
  );
}

// Database Icon for avatar
function DatabaseIcon() {
  return (
    <svg 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}
