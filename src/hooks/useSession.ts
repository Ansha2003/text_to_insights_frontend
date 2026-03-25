'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Session, ChatError } from '@/types';
import { 
  createSession, 
  listSessions, 
  deleteSession,
  getSession,
} from '@/lib/api';

interface UseSessionOptions {
  appName: string;
  userId?: string;
  autoCreate?: boolean;
}

export function useSession({ 
  appName, 
  userId = 'user',
  autoCreate = true,
}: UseSessionOptions) {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);

  // Create a new session
  const create = useCallback(async (initialState?: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const session = await createSession(appName, userId, initialState);
      setCurrentSession(session);
      setSessions(prev => [session, ...prev]);
      return session;
    } catch (err) {
      const chatError = err as ChatError;
      setError(chatError);
      throw chatError;
    } finally {
      setIsLoading(false);
    }
  }, [appName, userId]);

  // Load all sessions
  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const sessionList = await listSessions(appName, userId);
      setSessions(sessionList);
      return sessionList;
    } catch (err) {
      const chatError = err as ChatError;
      setError(chatError);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [appName, userId]);

  // Switch to a different session
  const switchSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const session = await getSession(appName, userId, sessionId);
      setCurrentSession(session);
      return session;
    } catch (err) {
      const chatError = err as ChatError;
      setError(chatError);
      throw chatError;
    } finally {
      setIsLoading(false);
    }
  }, [appName, userId]);

  // Delete a session
  const remove = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await deleteSession(appName, userId, sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      // If we deleted the current session, clear it
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
    } catch (err) {
      const chatError = err as ChatError;
      setError(chatError);
      throw chatError;
    } finally {
      setIsLoading(false);
    }
  }, [appName, userId, currentSession?.id]);

  // Clear current session (start fresh)
  const clear = useCallback(async () => {
    setCurrentSession(null);
    if (autoCreate) {
      return create();
    }
    return null;
  }, [autoCreate, create]);

  // Auto-create session on mount if enabled
  useEffect(() => {
    if (autoCreate && !currentSession && appName) {
      create().catch(() => {
        // Error is already set in state
      });
    }
  }, [autoCreate, appName, currentSession, create]);

  return {
    currentSession,
    sessions,
    isLoading,
    error,
    sessionId: currentSession?.id ?? null,
    // Actions
    create,
    loadSessions,
    switchSession,
    remove,
    clear,
  };
}
