'use client';

import { useState, useCallback, createContext, useContext, ReactNode, useEffect } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { DetailPane } from './DetailPane';
import type { QuestionItem } from '@/types';

// Layout Context for managing panel states
interface LayoutContextType {
  isSidebarOpen: boolean;
  isDetailPaneOpen: boolean;
  detailContent: ReactNode | null;
  toggleSidebar: () => void;
  openDetailPane: (content: ReactNode) => void;
  closeDetailPane: () => void;
}

const LayoutContext = createContext<LayoutContextType | null>(null);

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within AppLayout');
  }
  return context;
}

interface AppLayoutProps {
  children: ReactNode;
  questions?: QuestionItem[];
  onQuestionClick?: (question: QuestionItem) => void;
  onNewChat?: () => void;
}

export function AppLayout({
  children,
  questions = [],
  onQuestionClick,
  onNewChat,
}: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDetailPaneOpen, setIsDetailPaneOpen] = useState(false);
  const [detailContent, setDetailContent] = useState<ReactNode | null>(null);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const openDetailPane = useCallback((content: ReactNode) => {
    setDetailContent(content);
    setIsDetailPaneOpen(true);
  }, []);

  const closeDetailPane = useCallback(() => {
    setIsDetailPaneOpen(false);
    setDetailContent(null);
  }, []);

  // Escape key closes sidebar (on mobile) or detail pane
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDetailPaneOpen) closeDetailPane();
        else if (isSidebarOpen) setIsSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen, isDetailPaneOpen, closeDetailPane]);

  const contextValue: LayoutContextType = {
    isSidebarOpen,
    isDetailPaneOpen,
    detailContent,
    toggleSidebar,
    openDetailPane,
    closeDetailPane,
  };

  return (
    <LayoutContext.Provider value={contextValue}>
      <div className="app-layout">
        {/* Navigation Bar */}
        <Navbar onMenuClick={toggleSidebar} isSidebarOpen={isSidebarOpen} />

        {/* Main Content Area */}
        <div className="app-layout__content">
          {/* Sidebar */}
          <Sidebar
            isOpen={isSidebarOpen}
            questions={questions}
            onQuestionClick={onQuestionClick}
            onNewChat={onNewChat}
          />

          {/* Main Chat Area */}
          <main className="app-layout__main" id="main-content">
            <div className="app-layout__chat-container">
              {children}
            </div>
          </main>

          {/* Detail Pane (for expanded charts/tables) */}
          <DetailPane
            isOpen={isDetailPaneOpen}
            onClose={closeDetailPane}
          >
            {detailContent}
          </DetailPane>
        </div>

        {/* Sidebar Overlay (mobile) */}
        {isSidebarOpen && (
          <div
            className="app-layout__overlay"
            onClick={toggleSidebar}
            aria-hidden="true"
          />
        )}
      </div>
    </LayoutContext.Provider>
  );
}
