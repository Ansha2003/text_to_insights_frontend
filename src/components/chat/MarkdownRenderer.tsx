'use client';

import React, { useState, useCallback, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

// SQL keywords to highlight
const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
  'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'ON',
  'AND', 'OR', 'IN', 'NOT', 'NULL', 'IS', 'DISTINCT', 'UNION', 'ALL',
  'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'CREATE', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TABLE', 'INDEX',
  'WITH', 'BETWEEN', 'LIKE', 'EXISTS', 'CAST', 'COALESCE', 'NULLIF',
];

/**
 * MarkdownRenderer - renders markdown content
 * 
 * Note: Important metrics should be highlighted by the LLM using **bold** 
 * in its response. The frontend just renders markdown as-is.
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({ 
  content,
}: MarkdownRendererProps) {
  
  const components: Components = {
    // Custom code block with copy button
    code: ({ className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const isInline = !className;
      
      if (isInline) {
        return (
          <code className="markdown-inline-code" {...props}>
            {children}
          </code>
        );
      }
      
      return (
        <CodeBlock language={language}>
          {String(children).replace(/\n$/, '')}
        </CodeBlock>
      );
    },
    // Custom pre to avoid double wrapping
    pre: ({ children }) => <>{children}</>,
    // Links open in new tab
    a: ({ href, children }) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="markdown-link"
      >
        {children}
      </a>
    ),
    // Tables
    table: ({ children }) => (
      <div className="markdown-table-wrapper">
        <table className="markdown-table">{children}</table>
      </div>
    ),
    // Images - handle base64 data URLs and regular URLs
    img: ({ src, alt }) => (
      <MarkdownImage src={typeof src === 'string' ? src : ''} alt={alt || 'Image'} />
    ),
    // Unwrap <p> when it contains an image — <figure>/<div> are invalid inside <p>
    // NOTE: react-markdown passes the custom img renderer (an arrow fn) as the child type,
    // not MarkdownImage itself, so we detect images by checking for a `src` prop instead.
    p: ({ children }) => {
      const childArray = React.Children.toArray(children);
      const containsImage = childArray.some(
        (child) =>
          React.isValidElement(child) &&
          (child.props as Record<string, unknown>)?.src != null
      );
      if (containsImage) return <>{children}</>;
      return <p>{children}</p>;
    },
  };

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

/**
 * Code block with syntax highlighting and copy button
 */
function CodeBlock({ 
  children, 
  language 
}: { 
  children: string; 
  language: string;
}) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [children]);

  // Determine display language
  const displayLang = language || 'text';
  const isSQL = displayLang.toLowerCase() === 'sql';

  return (
    <div className="code-block">
      <div className="code-block__header">
        <span className="code-block__language">{displayLang.toUpperCase()}</span>
        <button 
          className="code-block__copy-btn"
          onClick={handleCopy}
          aria-label={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <>
              <CheckIcon />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <CopyIcon />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="code-block__pre">
        <code className={`code-block__code language-${displayLang}`}>
          {isSQL ? <SQLHighlighter code={children} /> : children}
        </code>
      </pre>
    </div>
  );
}

/**
 * Simple SQL syntax highlighter
 */
function SQLHighlighter({ code }: { code: string }) {
  // Create regex pattern for SQL keywords
  const keywordPattern = new RegExp(
    `\\b(${SQL_KEYWORDS.join('|')})\\b`,
    'gi'
  );
  
  // Split by keywords while preserving them
  const parts = code.split(keywordPattern);
  
  return (
    <>
      {parts.map((part, index) => {
        const isKeyword = SQL_KEYWORDS.some(
          kw => kw.toLowerCase() === part.toLowerCase()
        );
        
        if (isKeyword) {
          return (
            <span key={index} className="sql-keyword">
              {part.toUpperCase()}
            </span>
          );
        }
        
        // Highlight strings
        const stringHighlighted = part.replace(
          /('[^']*'|"[^"]*")/g,
          '<span class="sql-string">$1</span>'
        );
        
        // Highlight numbers
        const numberHighlighted = stringHighlighted.replace(
          /\b(\d+\.?\d*)\b/g,
          '<span class="sql-number">$1</span>'
        );
        
        return (
          <span 
            key={index} 
            dangerouslySetInnerHTML={{ __html: numberHighlighted }}
          />
        );
      })}
    </>
  );
}

// Icons
function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/**
 * Image component for markdown - handles base64 and regular URLs
 */
function MarkdownImage({ src, alt }: { src: string; alt: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Check if it's a base64 data URL
  const isBase64 = src.startsWith('data:');
  
  // Handle download
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.download = `chart-${Date.now()}.png`;
    link.href = src;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [src]);

  if (hasError) {
    return (
      <div className="markdown-image-error">
        <span>Failed to load image: {alt}</span>
      </div>
    );
  }

  return (
    <>
      <figure className="markdown-image">
        <div 
          className="markdown-image__container"
          onClick={() => setIsExpanded(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setIsExpanded(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={src} 
            alt={alt}
            className="markdown-image__img"
            onError={() => setHasError(true)}
          />
          <div className="markdown-image__overlay">
            <ExpandIcon />
            <span>Click to enlarge</span>
          </div>
        </div>
        {alt && <figcaption className="markdown-image__caption">{alt}</figcaption>}
        {isBase64 && (
          <button
            className="markdown-image__download"
            onClick={handleDownload}
            aria-label="Download image"
          >
            <DownloadIcon />
            Download
          </button>
        )}
      </figure>

      {/* Lightbox */}
      {isExpanded && (
        <div 
          className="markdown-image-lightbox"
          onClick={() => setIsExpanded(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="markdown-image-lightbox__content" onClick={(e) => e.stopPropagation()}>
            <div className="markdown-image-lightbox__header">
              <span className="markdown-image-lightbox__title">{alt}</span>
              <div className="markdown-image-lightbox__actions">
                {isBase64 && (
                  <button onClick={handleDownload} aria-label="Download">
                    <DownloadIcon />
                  </button>
                )}
                <button onClick={() => setIsExpanded(false)} aria-label="Close">
                  <CloseIcon />
                </button>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="markdown-image-lightbox__img" />
          </div>
        </div>
      )}
    </>
  );
}

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
