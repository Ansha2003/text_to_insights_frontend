'use client';

import { useState, useRef, useEffect, useCallback, KeyboardEvent, ChangeEvent } from 'react';
import { useDropzone } from 'react-dropzone';

interface ChatInputProps {
  onSend: (message: string, files?: File[]) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

const MAX_HEIGHT = 120;
const MIN_HEIGHT = 24;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export function ChatInput({
  onSend,
  isLoading,
  disabled = false,
  placeholder = 'Ask a question about your data...',
  maxLength = 4000,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDisabled = disabled || isLoading;

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.max(MIN_HEIGHT, Math.min(textarea.scrollHeight, MAX_HEIGHT));
    textarea.style.height = `${newHeight}px`;
  }, []);

  useEffect(() => { adjustHeight(); }, [value, adjustHeight]);

  useEffect(() => {
    if (textareaRef.current && !isDisabled) {
      textareaRef.current.focus();
    }
  }, [isDisabled]);

  // Handle send
  const handleSend = useCallback(() => {
    const trimmedValue = value.trim();
    if ((!trimmedValue && files.length === 0) || isDisabled) return;

    onSend(trimmedValue, files.length > 0 ? files : undefined);
    setValue('');
    setFiles([]);
    setFileError(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = `${MIN_HEIGHT}px`;
      textareaRef.current.focus();
    }
  }, [value, files, isDisabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      if (e.target.value.length <= maxLength) {
        setValue(e.target.value);
      }
    },
    [maxLength]
  );

  // Add files with validation
  const addFiles = useCallback((incoming: File[]) => {
    const oversized = incoming.filter(f => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      setFileError(`File too large: max size is 25MB. (${oversized.map(f => f.name).join(', ')})`);
      return;
    }
    setFileError(null);
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      const newFiles = incoming.filter(f => !existing.has(f.name));
      return [...prev, ...newFiles];
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFileError(null);
  }, []);

  // Dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: addFiles,
    maxSize: MAX_FILE_SIZE,
    noClick: true,
    onDropRejected: (rejected) => {
      const hasOversize = rejected.some(f => f.errors.some(e => e.code === 'file-too-large'));
      if (hasOversize) setFileError('File too large. Maximum size is 25MB.');
    },
  });

  const charactersRemaining = maxLength - value.length;
  const showCharacterCount = value.length > maxLength * 0.8;
  const canSend = (value.trim() || files.length > 0) && !isDisabled;

  return (
    <div className="chat-input">
      <div
        {...getRootProps()}
        className={`chat-input__dropzone ${isDragActive ? 'chat-input__dropzone--active' : ''}`}
      >
        <input {...getInputProps()} />

        {/* Drag overlay */}
        {isDragActive && (
          <div className="chat-input__drag-overlay">
            <PaperclipIcon />
            <span>Drop files to attach</span>
          </div>
        )}

        {/* File chips */}
        {files.length > 0 && (
          <div className="chat-input__chips">
            {files.map((file, i) => (
              <FileChip key={i} file={file} onRemove={() => removeFile(i)} />
            ))}
          </div>
        )}

        {/* File error */}
        {fileError && (
          <div className="chat-input__file-error">
            <ErrorIcon />
            {fileError}
          </div>
        )}

        {/* Input row */}
        <div className={`chat-input__wrapper ${isDisabled ? 'chat-input__wrapper--disabled' : ''}`}>
          {/* Paperclip button */}
          <button
            type="button"
            className="chat-input__attach-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isDisabled}
            aria-label="Attach file"
            title="Attach file (max 25MB)"
          >
            <PaperclipIcon />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={e => {
              if (e.target.files) addFiles(Array.from(e.target.files));
              e.target.value = '';
            }}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            className="chat-input__textarea"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={1}
            aria-label="Type your message"
            aria-disabled={isDisabled}
          />

          {/* Send Button */}
          <button
            type="button"
            className={`chat-input__send-btn ${canSend ? 'chat-input__send-btn--active' : ''}`}
            onClick={handleSend}
            disabled={!canSend}
            aria-label={isLoading ? 'Sending...' : 'Send message'}
          >
            {isLoading ? <LoadingSpinner /> : <SendIcon />}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="chat-input__footer">
        <span className="chat-input__hint">
          Press <kbd>Enter</kbd> to send, <kbd>Shift+Enter</kbd> for new line
        </span>
        {showCharacterCount && (
          <span className={`chat-input__char-count ${charactersRemaining < 100 ? 'chat-input__char-count--warning' : ''}`}>
            {charactersRemaining} characters remaining
          </span>
        )}
      </div>
    </div>
  );
}

// File chip component
function FileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const icon = getFileIcon(file.type);
  const size = formatSize(file.size);

  return (
    <div className="file-chip">
      <span className="file-chip__icon">{icon}</span>
      <span className="file-chip__name" title={file.name}>{file.name}</span>
      <span className="file-chip__size">{size}</span>
      <button
        type="button"
        className="file-chip__remove"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
      >
        ×
      </button>
    </div>
  );
}

function getFileIcon(type: string): string {
  if (type.startsWith('image/')) return '🖼️';
  if (type.includes('pdf')) return '📄';
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('xlsx')) return '📊';
  if (type.includes('csv') || type === 'text/csv') return '📋';
  if (type.includes('word') || type.includes('docx')) return '📝';
  if (type.startsWith('text/')) return '📃';
  return '📎';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Icons
function PaperclipIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="chat-input__spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
