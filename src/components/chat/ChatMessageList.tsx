'use client';

import { useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from './ChatMessage';
import type { Message } from '@/types';

interface ChatMessageListProps {
  messages: Message[];
  showTimestamps?: boolean;
  autoScroll?: boolean;
  elapsedTime?: number;
  onSuggestionClick?: (suggestion: string) => void;
  onRetry?: () => void;
}

export function ChatMessageList({
  messages,
  showTimestamps = false,
  autoScroll = true,
  elapsedTime = 0,
  onSuggestionClick,
  onRetry,
}: ChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (!autoScroll || isUserScrollingRef.current) return;
    
    endRef.current?.scrollIntoView({ behavior });
  }, [autoScroll]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Detect user scrolling to pause auto-scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      // If user scrolled away from bottom, pause auto-scroll
      isUserScrollingRef.current = !isAtBottom;
      
      // Reset after user stops scrolling and is at bottom
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (isAtBottom) {
          isUserScrollingRef.current = false;
        }
      }, 150);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Initial scroll to bottom (instant, not animated)
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom('instant');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (messages.length === 0) {
    return (
      <div className="chat-message-list chat-message-list--empty">
        <EmptyState onSuggestionClick={onSuggestionClick} />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="chat-message-list"
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
    >
      <div className="chat-message-list__content">
        {messages.map((message, index) => {
          // Show timestamp if it's the first message or if there's a time gap
          const prevMessage = messages[index - 1];
          const showTime = showTimestamps && (
            !prevMessage || 
            shouldShowTimestamp(prevMessage.timestamp, message.timestamp)
          );
          
          // Pass elapsed time to streaming messages
          const isThinking = message.isStreaming && !message.content;
          
          return (
            <ChatMessage
              key={message.id}
              message={message}
              showTimestamp={showTime}
              elapsedTime={isThinking ? elapsedTime : undefined}
              onRetry={message.type === 'error' ? onRetry : undefined}
            />
          );
        })}
        
        {/* Scroll anchor */}
        <div ref={endRef} className="chat-message-list__anchor" aria-hidden="true" />
      </div>
    </div>
  );
}

const SAMPLE_PROMPTS = [
  'What are the top 10 customers by revenue?',
  'Compare this month vs last month',
  'Show revenue trend over the last 12 months',
  'What is the sports vs non-sports revenue split?',
];

// Empty state when no messages
function EmptyState({ onSuggestionClick }: { onSuggestionClick?: (s: string) => void }) {
  return (
    <div className="chat-empty-state">
      <div className="chat-empty-state__icon">
        <img src="/dsg-admin-logo.png" alt="Dream Set Go" style={{ width: '160px', height: 'auto' }} />
      </div>
      <h2 className="chat-empty-state__title" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '4rem', letterSpacing: '0.08em', color: '#002080' }}>Cerebro</h2>
      <p className="chat-empty-state__description">
        Ask questions about your data in natural language and get instant insights with tables, charts, and more.
      </p>
      <div className="chat-empty-state__suggestions">
        <p className="chat-empty-state__suggestions-title">Try asking:</p>
        <div className="chat-empty-state__suggestions-list">
          {SAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="chat-empty-state__suggestion-btn"
              onClick={() => onSuggestionClick?.(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Determine if we should show a timestamp (e.g., 5+ minute gap)
function shouldShowTimestamp(prev: Date | string, current: Date | string): boolean {
  const prevTime = new Date(prev).getTime();
  const currentTime = new Date(current).getTime();
  const diffMinutes = (currentTime - prevTime) / (1000 * 60);
  return diffMinutes >= 5;
}
