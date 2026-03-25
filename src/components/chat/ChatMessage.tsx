'use client';

import { memo, useCallback, useState } from 'react';
import type { Message, TableData, ChartData, FileData, MessageAttachment } from '@/types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { DataTable } from './DataTable';
import { ChartRenderer } from './ChartRenderer';
import { SQLViewer } from './SQLViewer';
import { MessageFeedback } from './MessageFeedback';

interface ChatMessageProps {
  message: Message;
  showTimestamp?: boolean;
  elapsedTime?: number;
  onRetry?: () => void;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  showTimestamp = false,
  elapsedTime = 0,
  onRetry,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isThinking = message.isStreaming && !message.content;
  
  // Render message content based on type
  const renderContent = () => {
    if (message.type === 'error') {
      return <ErrorContent message={message} onRetry={onRetry} />;
    }
    
    if (isThinking) {
      return <ThinkingContent elapsedTime={elapsedTime} />;
    }
    
    // Render table if present
    if (message.type === 'table' && message.data) {
      return (
        <div className="chat-message__rich-content">
          {message.content && (
            <div className="chat-message__text">
              <MarkdownRenderer content={message.content} />
            </div>
          )}
          <DataTable data={message.data as TableData} />
        </div>
      );
    }
    
    // Render chart if present
    if (message.type === 'chart' && message.data) {
      const chartData = message.data as ChartData;
      // Check multiple possible field names for base64 image
      const imageData = chartData.imageData || chartData.image || chartData.base64 || chartData.chart_image;
      
      if (imageData) {
        return (
          <div className="chat-message__rich-content">
            {message.content && (
              <div className="chat-message__text">
                <MarkdownRenderer content={message.content} />
              </div>
            )}
            <ChartRenderer 
              imageData={imageData}
              title={chartData.title}
              alt={chartData.title || 'Chart'}
              mimeType={chartData.mimeType}
            />
          </div>
        );
      }
    }
    
    // Render file download if present
    if (message.type === 'file' && message.data) {
      return <FileDownload data={message.data as FileData} />;
    }

    // Default text content
    return (
      <TextContent
        content={message.content}
        isStreaming={message.isStreaming}
        isUser={isUser}
        attachments={message.attachments}
      />
    );
  };
  
  return (
    <div
      id={`message-${message.id}`}
      className={`chat-message ${isUser ? 'chat-message--user' : 'chat-message--agent'}`}
      role="article"
      aria-label={`${isUser ? 'You' : 'Assistant'} said`}
    >
      {/* Agent Avatar */}
      {!isUser && (
        <div className={`chat-message__avatar ${isThinking ? 'chat-message__avatar--pulsing' : ''}`} aria-hidden="true">
          <AgentAvatar />
        </div>
      )}
      
      {/* Message Content */}
      <div className="chat-message__content">
        <div className={`chat-message__bubble ${message.isStreaming ? 'chat-message__bubble--streaming' : ''} ${message.type === 'table' ? 'chat-message__bubble--wide' : ''}`}>
          {renderContent()}
        </div>
        
        {/* SQL Viewer */}
        {!isUser && !isThinking && message.sqlQueries && message.sqlQueries.length > 0 && (
          <SQLViewer queries={message.sqlQueries} />
        )}

        {/* Message Actions: Copy + Feedback */}
        {!isUser && !isThinking && message.type !== 'error' && (
          <div className="chat-message__actions">
            <CopyButton text={message.content} />
            <div className="chat-message__actions-divider" aria-hidden="true" />
            <MessageFeedback messageId={message.id} />
          </div>
        )}

        {/* Timestamp */}
        {showTimestamp && message.timestamp && !isThinking && (
          <time
            className="chat-message__timestamp"
            dateTime={new Date(message.timestamp).toISOString()}
          >
            {formatTime(message.timestamp)}
          </time>
        )}
      </div>
    </div>
  );
});

// File Download Component
function FileDownload({ data }: { data: FileData }) {
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = data.url;
    link.download = data.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [data.url, data.name]);

  const displayName = data.name
    .replace(/^query_results_/, '')
    .replace(/_\d{8}_\d{6}/, '')
    .replace(/_/g, ' ')
    .trim() || data.name;

  return (
    <div className="chat-message__file-download">
      <SpreadsheetIcon />
      <div className="chat-message__file-info">
        <span className="chat-message__file-name">{displayName}</span>
        <span className="chat-message__file-label">Excel Spreadsheet • Complete dataset</span>
      </div>
      <button
        className="chat-message__file-btn"
        onClick={handleDownload}
        aria-label={`Download ${data.name}`}
      >
        <DownloadIcon />
        Download
      </button>
    </div>
  );
}

// Thinking Content - skeleton shimmer while waiting for response
function ThinkingContent({ elapsedTime }: { elapsedTime: number }) {
  const statusMessage = getStatusMessage(elapsedTime);
  const formattedTime = formatElapsedTime(elapsedTime);

  return (
    <div className="chat-message__thinking" role="status" aria-live="polite">
      {/* Status label + timer */}
      <div className="chat-message__thinking-status">
        <span className="chat-message__thinking-message">{statusMessage}</span>
        <span className="chat-message__thinking-time">{formattedTime}</span>
      </div>

      {/* Skeleton shimmer lines */}
      <div className="chat-message__skeleton" aria-hidden="true">
        <div className="skeleton chat-message__skeleton-line" style={{ width: '82%' }} />
        <div className="skeleton chat-message__skeleton-line" style={{ width: '65%' }} />
        <div className="skeleton chat-message__skeleton-line" style={{ width: '74%' }} />
      </div>
    </div>
  );
}

// Attachment chips shown on user messages
function AttachmentList({ attachments }: { attachments: MessageAttachment[] }) {
  return (
    <div className="chat-message__attachments">
      {attachments.map((a, i) => (
        <div key={i} className="chat-message__attachment-chip">
          <span>{getFileIcon(a.mimeType)}</span>
          <span className="chat-message__attachment-name" title={a.name}>{a.name}</span>
          <span className="chat-message__attachment-size">{formatSize(a.size)}</span>
        </div>
      ))}
    </div>
  );
}

function getFileIcon(type: string): string {
  if (type.startsWith('image/')) return '🖼️';
  if (type.includes('pdf')) return '📄';
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('xlsx')) return '📊';
  if (type.includes('csv')) return '📋';
  if (type.includes('word') || type.includes('docx')) return '📝';
  if (type.startsWith('text/')) return '📃';
  return '📎';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Text Content - uses Markdown for agent, plain text for user
function TextContent({
  content,
  isStreaming,
  isUser,
  attachments,
}: {
  content: string;
  isStreaming?: boolean;
  isUser: boolean;
  attachments?: MessageAttachment[];
}) {
  // User messages are plain text
  if (isUser) {
    return (
      <div className="chat-message__text">
        {attachments && attachments.length > 0 && (
          <AttachmentList attachments={attachments} />
        )}
        {content}
      </div>
    );
  }
  
  // Agent messages use markdown rendering
  return (
    <div className="chat-message__text">
      <MarkdownRenderer content={content} />
      {isStreaming && content && <StreamingCursor />}
    </div>
  );
}

// Error Content — contextual per error type with retry
function ErrorContent({ message, onRetry }: { message: Message; onRetry?: () => void }) {
  const error = message.error;

  const { icon, title, description } = getErrorContent(error?.type);

  return (
    <div className="chat-message__error-card">
      <div className="chat-message__error-icon">{icon}</div>
      <div className="chat-message__error-body">
        <span className="chat-message__error-title">{title}</span>
        <span className="chat-message__error-desc">
          {error?.message || description}
        </span>

        {/* Raw response fallback for unknown_format */}
        {error?.type === 'unknown_format' && error.originalResponse && (
          <details className="chat-message__error-raw">
            <summary>View raw response</summary>
            <pre>{JSON.stringify(error.originalResponse, null, 2)}</pre>
          </details>
        )}
      </div>

      {(error?.retryable !== false) && onRetry && (
        <button
          type="button"
          className="chat-message__error-retry"
          onClick={onRetry}
          aria-label="Retry request"
        >
          <RetryIcon />
          Retry
        </button>
      )}
    </div>
  );
}

function getErrorContent(type?: string) {
  switch (type) {
    case 'timeout':
      return {
        icon: <ClockIcon />,
        title: 'Request timed out',
        description: 'The query took too long. Please try again.',
      };
    case 'network':
      return {
        icon: <WifiOffIcon />,
        title: 'Connection issue',
        description: 'Unable to reach the server. Check your connection and retry.',
      };
    case 'server':
      return {
        icon: <ErrorIcon />,
        title: 'Server error',
        description: 'Something went wrong on the server. Please try again.',
      };
    case 'unknown_format':
      return {
        icon: <WarningIcon />,
        title: 'Unrecognised response',
        description: 'The agent returned an unexpected format.',
      };
    default:
      return {
        icon: <ErrorIcon />,
        title: 'Something went wrong',
        description: 'An unexpected error occurred.',
      };
  }
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// Copy Button
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      type="button"
      className={`chat-message__copy-btn ${copied ? 'chat-message__copy-btn--copied' : ''}`}
      onClick={handleCopy}
      aria-label={copied ? 'Copied!' : 'Copy response'}
      title={copied ? 'Copied!' : 'Copy response'}
      disabled={!text}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span>{copied ? 'Copied!' : 'Copy'}</span>
    </button>
  );
}

// Streaming cursor indicator
function StreamingCursor() {
  return <span className="chat-message__cursor" aria-hidden="true" />;
}

// Agent Avatar Icon
function AgentAvatar() {
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

// Spreadsheet Icon
function SpreadsheetIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
      <line x1="8" y1="9" x2="10" y2="9" />
    </svg>
  );
}

// Download Icon
function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// Error Icon
function ErrorIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// Clock Icon (timeout)
function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// WifiOff Icon (network error)
function WifiOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

// Warning Icon (unknown format)
function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// Retry Icon
function RetryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-3.87" />
    </svg>
  );
}

// Status messages based on elapsed time
function getStatusMessage(elapsed: number): string {
  if (elapsed >= 60) return 'Still working on it...';
  if (elapsed >= 30) return 'Almost there, handling complex query...';
  if (elapsed >= 15) return 'Processing results...';
  if (elapsed >= 5) return 'Searching through your data...';
  return 'Analyzing your query...';
}

// Format elapsed time
function formatElapsedTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

// Format timestamp
function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString(undefined, { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true,
  });
}
