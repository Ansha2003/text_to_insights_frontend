'use client';

import { ReactNode, useEffect, useRef } from 'react';

interface DetailPaneProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function DetailPane({ isOpen, onClose, children }: DetailPaneProps) {
  const paneRef = useRef<HTMLDivElement>(null);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap and focus management
  useEffect(() => {
    if (isOpen && paneRef.current) {
      const firstFocusable = paneRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <aside
      ref={paneRef}
      className="detail-pane"
      aria-label="Detail view"
      role="complementary"
    >
      {/* Header */}
      <div className="detail-pane__header">
        <h2 className="detail-pane__title">Expanded View</h2>
        <button
          type="button"
          className="detail-pane__close-btn"
          onClick={onClose}
          aria-label="Close detail pane"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Content */}
      <div className="detail-pane__content">
        {children}
      </div>
    </aside>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
