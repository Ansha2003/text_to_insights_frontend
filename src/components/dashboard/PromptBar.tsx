'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface PromptBarProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

export function PromptBar({ onSubmit, isLoading }: PromptBarProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(24, Math.min(el.scrollHeight, 120))}px`;
  }, []);

  useEffect(() => { adjustHeight(); }, [value, adjustHeight]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && !isLoading) {
      onSubmit(trimmed);
      setValue('');
      if (textareaRef.current) textareaRef.current.style.height = '24px';
    }
  }, [value, isLoading, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = value.trim().length > 0;

  return (
    <div className="chat-input" style={{ position: 'relative', borderTop: 'none', padding: '0 0 20px' }}>
      <div className={`chat-input__wrapper ${isLoading ? 'chat-input__wrapper--disabled' : ''}`}>
        <textarea
          ref={textareaRef}
          className="chat-input__textarea"
          placeholder="Add a chart — e.g. Show monthly sales trend as a line chart..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={1}
        />
        <button
          className={`chat-input__send-btn ${hasContent ? 'chat-input__send-btn--active' : ''}`}
          onClick={handleSend}
          disabled={isLoading || !hasContent}
          aria-label="Generate chart"
        >
          {isLoading ? (
            <svg className="chat-input__spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
      <div className="chat-input__footer">
        <span className="chat-input__hint">
          Press <kbd>Enter</kbd> to generate &middot; <kbd>Shift+Enter</kbd> for new line
        </span>
      </div>
    </div>
  );
}
