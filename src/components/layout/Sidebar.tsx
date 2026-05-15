'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { QuestionItem } from '@/types';

interface SidebarProps {
  isOpen: boolean;
  questions: QuestionItem[];
  onQuestionClick?: (question: QuestionItem) => void;
  onNewChat?: () => void;
}

const NAV_ITEMS = [
  { label: 'Chat', href: '/', icon: 'chat' },
  { label: 'Sales Overview', href: '/dashboard/sales', icon: 'chart' },
] as const;

export function Sidebar({
  isOpen,
  questions,
  onQuestionClick,
  onNewChat,
}: SidebarProps) {
  const pathname = usePathname();
  // Group questions by date
  const groupedQuestions = useMemo(() => {
    const groups: Record<string, QuestionItem[]> = {};
    
    questions.forEach((question) => {
      const date = new Date(question.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let label: string;
      if (isSameDay(date, today)) {
        label = 'Today';
      } else if (isSameDay(date, yesterday)) {
        label = 'Yesterday';
      } else if (isWithinDays(date, today, 7)) {
        label = 'This Week';
      } else if (isWithinDays(date, today, 30)) {
        label = 'This Month';
      } else {
        label = 'Older';
      }
      
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(question);
    });
    
    return groups;
  }, [questions]);

  const groupOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older'];

  return (
    <aside
      id="sidebar"
      className={`sidebar ${isOpen ? 'sidebar--open' : 'sidebar--closed'}`}
      aria-label="Conversation history"
      aria-hidden={!isOpen}
    >
      {/* New Chat Button */}
      <div className="sidebar__header">
        <button
          type="button"
          className="sidebar__new-chat-btn"
          onClick={onNewChat}
          aria-label="Start a new conversation"
        >
          <PlusIcon />
          <span>New Chat</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar__nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar__nav-item ${pathname === item.href ? 'sidebar__nav-item--active' : ''}`}
          >
            {item.icon === 'chat' ? <ChatIcon /> : <ChartIcon />}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar__divider" />

      {/* Questions List */}
      <nav className="sidebar__content" aria-label="Previous questions">
        {questions.length === 0 ? (
          <div className="sidebar__empty">
            <p>No conversations yet</p>
            <p className="sidebar__empty-hint">
              Start by asking a question about your data
            </p>
          </div>
        ) : (
          <div className="sidebar__groups">
            {groupOrder.map((group) => {
              const items = groupedQuestions[group];
              if (!items || items.length === 0) return null;
              
              return (
                <div key={group} className="sidebar__group">
                  <h3 className="sidebar__group-title">{group}</h3>
                  <ul className="sidebar__list" role="list">
                    {items.map((question) => (
                      <li key={question.id}>
                        <button
                          type="button"
                          className="sidebar__item"
                          onClick={() => onQuestionClick?.(question)}
                          title={question.text}
                          aria-label={`Jump to: ${question.text}`}
                        >
                          <ChatIcon />
                          <span className="sidebar__item-content">
                            <span className="sidebar__item-text">
                              {truncateText(question.text, 40)}
                            </span>
                            <span className="sidebar__item-time">
                              {formatTime(question.timestamp)}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar__footer">
        <span className="sidebar__footer-text">
          {questions.length} question{questions.length !== 1 ? 's' : ''}
        </span>
      </div>
    </aside>
  );
}

// Helper functions
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isWithinDays(date: Date, reference: Date, days: number): boolean {
  const diffTime = reference.getTime() - date.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Icons
function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
