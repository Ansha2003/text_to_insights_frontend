'use client';

import { useTheme } from '@/hooks';
import type { Theme } from '@/types';

interface NavbarProps {
  onMenuClick: () => void;
  isSidebarOpen: boolean;
}

export function Navbar({ onMenuClick, isSidebarOpen }: NavbarProps) {
  const { theme, setTheme, resolvedTheme, mounted } = useTheme();

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar__left">
        {/* Menu Toggle Button */}
        <button
          type="button"
          className="navbar__menu-btn"
          onClick={onMenuClick}
          aria-label="Toggle sidebar menu"
          aria-expanded={isSidebarOpen}
          aria-controls="sidebar"
        >
          <MenuIcon />
        </button>

        {/* Logo / Brand */}
        <div className="navbar__brand">
          <span className="navbar__logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/dsg-admin-logo.png" alt="Dream Set Go" style={{ width: '36px', height: 'auto', background: '#ffffff', borderRadius: '6px', padding: '3px' }} />
          </span>
          <span className="navbar__title" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.05em' }}>Cerebro</span>
        </div>
      </div>

      <div className="navbar__right">
        {/* Theme Selector */}
        <div className="navbar__theme-selector" role="group" aria-label="Theme selection">
          {mounted && (
            <>
              <button
                type="button"
                className={`navbar__theme-btn ${theme === 'light' ? 'navbar__theme-btn--active' : ''}`}
                onClick={() => handleThemeChange('light')}
                aria-label="Light mode"
                aria-pressed={theme === 'light'}
              >
                <SunIcon />
              </button>
              <button
                type="button"
                className={`navbar__theme-btn ${theme === 'dark' ? 'navbar__theme-btn--active' : ''}`}
                onClick={() => handleThemeChange('dark')}
                aria-label="Dark mode"
                aria-pressed={theme === 'dark'}
              >
                <MoonIcon />
              </button>
              <button
                type="button"
                className={`navbar__theme-btn ${theme === 'system' ? 'navbar__theme-btn--active' : ''}`}
                onClick={() => handleThemeChange('system')}
                aria-label="System preference"
                aria-pressed={theme === 'system'}
              >
                <SystemIcon />
              </button>
            </>
          )}
        </div>

        {/* Current Theme Indicator (for visual feedback) */}
        {mounted && (
          <div className="navbar__theme-indicator" aria-hidden="true">
            {resolvedTheme === 'dark' ? <MoonIcon /> : <SunIcon />}
          </div>
        )}
      </div>
    </nav>
  );
}

// Icons
function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
