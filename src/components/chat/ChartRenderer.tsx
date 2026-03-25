'use client';

import { useState, useCallback, useEffect } from 'react';

interface ChartRendererProps {
  /** Base64 encoded image data (with or without data URI prefix) */
  imageData: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Chart title */
  title?: string;
  /** MIME type of the image (defaults to image/png) */
  mimeType?: string | null;
}

/**
 * Convert base64 to Blob URL for better browser compatibility
 */
function base64ToBlobUrl(base64: string, mimeType: string): string {
  try {
    // 1. Clean data: remove whitespace/newlines, handle URL-safe base64, fix padding
    let base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    
    // Clean whitespace
    base64Data = base64Data.replace(/[\s\r\n]/g, '');
    
    // Handle URL-safe base64 (if any)
    base64Data = base64Data.replace(/-/g, '+').replace(/_/g, '/');
    
    // Ensure correct padding
    const pad = base64Data.length % 4;
    if (pad !== 0) {
      if (pad === 1) {
        base64Data = base64Data.slice(0, -1);
      } else {
        base64Data = base64Data + '='.repeat(4 - pad);
      }
    }
    
    // 2. Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // 3. Create blob and URL
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('[ChartRenderer] Failed to create blob URL:', error);
    // Fallback to data URL with some basic cleaning
    const cleanBase64 = base64.replace(/[\s\r\n]/g, '');
    return cleanBase64.startsWith('data:') ? cleanBase64 : `data:${mimeType};base64,${cleanBase64}`;
  }
}

export function ChartRenderer({ 
  imageData, 
  alt = 'Chart',
  title,
  mimeType = 'image/png',
}: ChartRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const effectiveMimeType = mimeType || 'image/png';

  // Create blob URL on mount
  useEffect(() => {
    if (imageData) {
      console.log('[ChartRenderer] Creating blob URL, data length:', imageData.length);
      const url = base64ToBlobUrl(imageData, effectiveMimeType);
      setBlobUrl(url);
      console.log('[ChartRenderer] Blob URL created:', url.slice(0, 50));
      
      // Cleanup on unmount
      return () => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      };
    }
  }, [imageData, effectiveMimeType]);

  // Use blob URL if available, otherwise fall back to data URL
  const imageSrc = blobUrl || (imageData?.startsWith('data:') 
    ? imageData 
    : `data:${effectiveMimeType};base64,${imageData}`);

  // Open lightbox
  const handleExpand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  // Close lightbox
  const handleClose = useCallback(() => {
    setIsExpanded(false);
  }, []);

  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleExpand();
    }
  }, [handleExpand]);

  // Download chart as PNG
  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      const link = document.createElement('a');
      link.download = `chart-${Date.now()}.png`;
      link.href = imageSrc;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download chart:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [imageSrc]);

  return (
    <>
      {/* Inline Chart */}
      <div className="chart-renderer">
        {title && <div className="chart-renderer__title">{title}</div>}
        
        <div 
          className="chart-renderer__container"
          onClick={handleExpand}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          aria-label={`${alt}. Click to enlarge.`}
        >
          <img 
            src={imageSrc} 
            alt={alt}
            className="chart-renderer__image"
            onError={(e) => {
              console.error('[ChartRenderer] Image load error:', e);
              setImageError(true);
            }}
            onLoad={() => console.log('[ChartRenderer] Image loaded successfully')}
          />
          {imageError && (
            <div style={{ padding: '20px', color: 'red' }}>
              Image failed to load. Data length: {imageData?.length}
            </div>
          )}
          <div className="chart-renderer__overlay">
            <ExpandIcon />
            <span>Click to enlarge</span>
          </div>
        </div>

        {/* Actions */}
        <div className="chart-renderer__actions">
          <button
            className="chart-renderer__download-btn"
            onClick={handleDownload}
            disabled={isDownloading}
            aria-label="Download chart as PNG"
          >
            <DownloadIcon />
            <span>{isDownloading ? 'Downloading...' : 'Download PNG'}</span>
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isExpanded && (
        <ChartLightbox
          imageSrc={imageSrc}
          alt={alt}
          title={title}
          onClose={handleClose}
          onDownload={handleDownload}
        />
      )}
    </>
  );
}

// Lightbox Modal Component
function ChartLightbox({
  imageSrc,
  alt,
  title,
  onClose,
  onDownload,
}: {
  imageSrc: string;
  alt: string;
  title?: string;
  onClose: () => void;
  onDownload: () => void;
}) {
  // Close on escape key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <div 
      className="chart-lightbox"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Enlarged chart view'}
    >
      <div className="chart-lightbox__content">
        {/* Header */}
        <div className="chart-lightbox__header">
          {title && <h2 className="chart-lightbox__title">{title}</h2>}
          <div className="chart-lightbox__actions">
            <button
              className="chart-lightbox__btn"
              onClick={onDownload}
              aria-label="Download chart"
            >
              <DownloadIcon />
            </button>
            <button
              className="chart-lightbox__btn chart-lightbox__close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="chart-lightbox__image-container">
          <img 
            src={imageSrc} 
            alt={alt}
            className="chart-lightbox__image"
          />
        </div>
      </div>
    </div>
  );
}

// Icons
function ExpandIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
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
