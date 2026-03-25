'use client';

import { useState } from 'react';

type FeedbackValue = 'up' | 'down' | null;

interface MessageFeedbackProps {
  messageId: string;
}

export function MessageFeedback({ messageId }: MessageFeedbackProps) {
  const [feedback, setFeedback] = useState<FeedbackValue>(null);

  const handleFeedback = (value: 'up' | 'down') => {
    // Toggle off if clicking the same button again
    setFeedback((prev) => (prev === value ? null : value));
  };

  return (
    <div className="message-feedback" role="group" aria-label="Rate this response">
      <button
        type="button"
        className={`message-feedback__btn ${feedback === 'up' ? 'message-feedback__btn--active message-feedback__btn--up' : ''}`}
        onClick={() => handleFeedback('up')}
        aria-label="Thumbs up"
        aria-pressed={feedback === 'up'}
        title="Good response"
      >
        <ThumbsUpIcon />
      </button>
      <button
        type="button"
        className={`message-feedback__btn ${feedback === 'down' ? 'message-feedback__btn--active message-feedback__btn--down' : ''}`}
        onClick={() => handleFeedback('down')}
        aria-label="Thumbs down"
        aria-pressed={feedback === 'down'}
        title="Bad response"
      >
        <ThumbsDownIcon />
      </button>
      {feedback && (
        <span className="message-feedback__thanks" aria-live="polite">
          Thanks for your feedback
        </span>
      )}
    </div>
  );
}

function ThumbsUpIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function ThumbsDownIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
      <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </svg>
  );
}
