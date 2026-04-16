'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Message, ChatError, QuestionItem, ParsedContent, MessageAttachment } from '@/types';
import {
  sendMessageStream,
  parseEventContent,
  generateId,
  createSession,
  isToolEvent,
  getToolName,
  createError,
  getArtifact,
  listArtifacts,
} from '@/lib/api';
import { extractSqlQueries } from '@/lib/responseParser';

interface UseChatOptions {
  appName: string;
  userId?: string;
  onToolCall?: (toolName: string) => void;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: ChatError | null;
  sessionId: string | null;
  elapsedTime: number;
  questions: QuestionItem[];
  currentTool: string | null;
  // Actions
  sendMessage: (content: string, files?: File[]) => Promise<void>;
  retry: () => void;
  clearChat: () => Promise<void>;
  cancel: () => void;
  initSession: () => Promise<string>;
}

export function useChat({ 
  appName, 
  userId = 'user',
  onToolCall,
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const shownArtifactsRef = useRef<Set<string>>(new Set());

  // Initialize session
  const initSession = useCallback(async (): Promise<string> => {
    try {
      const session = await createSession(appName, userId);
      setSessionId(session.id);
      setMessages([]);
      setQuestions([]);
      setError(null);
      return session.id;
    } catch {
      const chatError = createError('network', 'Failed to create session', true);
      setError(chatError);
      throw chatError;
    }
  }, [appName, userId]);

  // Start elapsed time timer
  const startTimer = useCallback(() => {
    setElapsedTime(0);
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
  }, []);

  // Stop elapsed time timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Convert a File to base64 string
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // strip data URL prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Send a message
  const sendMessage = useCallback(
    async (content: string, files?: File[]): Promise<void> => {
      if (!content.trim() && (!files || files.length === 0)) return;
      if (isLoading) return;

      let currentSessionId = sessionId;
      
      // Create session if needed
      if (!currentSessionId) {
        try {
          currentSessionId = await initSession();
        } catch {
          return;
        }
      }

      setError(null);
      setIsLoading(true);
      setCurrentTool(null);
      startTimer();

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Add user message
      const attachments: MessageAttachment[] | undefined = files && files.length > 0
        ? files.map(f => ({ name: f.name, size: f.size, mimeType: f.type || 'application/octet-stream' }))
        : undefined;

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
        type: 'text',
        attachments,
      };

      setMessages((prev) => [...prev, userMessage]);

      // Add to questions list
      setQuestions((prev) => [
        ...prev,
        {
          id: generateId(),
          text: content.trim(),
          timestamp: new Date(),
          messageId: userMessage.id,
        },
      ]);

      // Create placeholder for agent response (shows thinking state)
      const agentMessageId = generateId();
      const agentMessage: Message = {
        id: agentMessageId,
        role: 'agent',
        content: '',
        timestamp: new Date(),
        type: 'text',
        isStreaming: true,
      };
      setMessages((prev) => [...prev, agentMessage]);

      try {
        // Build message parts — text + any attached files
        const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [];
        if (content.trim()) parts.push({ text: content.trim() });
        if (files && files.length > 0) {
          for (const file of files) {
            const base64 = await fileToBase64(file);
            parts.push({ inline_data: { mime_type: file.type || 'application/octet-stream', data: base64 } });
          }
        }

        const stream = sendMessageStream({
          app_name: appName,
          user_id: userId,
          session_id: currentSessionId,
          new_message: {
            role: 'user',
            parts,
          },
          streaming: true,
        });

        let fullText = '';
        let previousTurnsText = '';
        let currentTurnText = '';
        let newTurnPending = false;
        const parsedData: Partial<ParsedContent> = {};

        for await (const event of stream) {
          // Check if aborted
          if (abortControllerRef.current?.signal.aborted) {
            break;
          }

          // Handle tool events (for optional status display)
          if (isToolEvent(event)) {
            const toolName = getToolName(event);
            if (toolName) {
              setCurrentTool(toolName);
              onToolCall?.(toolName);
            }

            // Capture SQL from execute_athena_query function calls
            if (event.content?.parts) {
              for (const part of event.content.parts) {
                if (
                  part.functionCall?.name === 'execute_athena_query' &&
                  typeof part.functionCall.args?.sql_query === 'string'
                ) {
                  const sql = part.functionCall.args.sql_query.trim();
                  if (sql && !parsedData.sql?.includes(sql)) {
                    parsedData.sql = [...(parsedData.sql || []), sql];
                  }
                }
              }
            }

            // Mark that the next text event starts a new agent turn
            newTurnPending = true;
            continue; // Don't show tool events to user
          }

          // Parse visible content
          const parsed = parseEventContent(event);

          if (parsed) {
            if (parsed.text) {
              // When a new turn starts after a tool call, save previous text and reset
              if (newTurnPending) {
                if (currentTurnText.length > 0) {
                  previousTurnsText = fullText;
                }
                currentTurnText = '';
                newTurnPending = false;
              }

              // ADK sends incremental text chunks — concatenate them
              currentTurnText += parsed.text;
              fullText = previousTurnsText
                ? previousTurnsText + '\n\n' + currentTurnText
                : currentTurnText;

              // Update message with streamed content
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === agentMessageId
                    ? { ...msg, content: fullText }
                    : msg
                )
              );
            }
            
            // Collect table/chart/file data
            if (parsed.table) parsedData.table = parsed.table;
            if (parsed.chart) parsedData.chart = parsed.chart;
            if (parsed.file) parsedData.file = parsed.file;
            if (parsed.sql) parsedData.sql = parsed.sql;
          }
        }

        // Determine final message type
        let finalType: Message['type'] = 'text';
        if (parsedData.table) finalType = 'table';
        else if (parsedData.chart) finalType = 'chart';
        else if (parsedData.file) finalType = 'file';

        // Use captured SQL from function calls, fall back to extracting from text
        const sqlQueries = parsedData.sql?.length
          ? parsedData.sql
          : extractSqlQueries(fullText);

        // Mark streaming as complete
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === agentMessageId
              ? {
                  ...msg,
                  content: fullText || 'I processed your request.',
                  isStreaming: false,
                  type: finalType,
                  data: parsedData.table || parsedData.chart || parsedData.file,
                  sqlQueries: sqlQueries.length > 0 ? sqlQueries : undefined,
                }
              : msg
          )
        );

        // Always fetch artifacts after message completes
        // The agent saves charts/spreadsheets to artifacts without including them in the response
        if (currentSessionId) {
          try {
            console.log('[Fetching artifacts for session]', currentSessionId);
            const artifactNames = await listArtifacts(appName, userId, currentSessionId);
            console.log('[Available artifacts]', artifactNames);

            // Only process artifacts we haven't shown yet (prevents duplicates across messages)
            const newArtifactNames = artifactNames.filter(
              (name: string) => !shownArtifactsRef.current.has(name)
            );

            // Filter new artifacts by type
            const chartArtifactNames = newArtifactNames.filter((name: string) =>
              name.startsWith('chart_') ||
              name.endsWith('.png') ||
              name.endsWith('.jpg')
            );

            const excelArtifactNames = newArtifactNames.filter((name: string) =>
              name.endsWith('.xlsx') || name.endsWith('.xls')
            );

            // Fetch and display new chart artifacts
            for (const artifactName of chartArtifactNames) {
              try {
                console.log('[Fetching chart]', artifactName);
                const artifact = await getArtifact(appName, userId, currentSessionId, artifactName);

                if (artifact?.data) {
                  shownArtifactsRef.current.add(artifactName);
                  const chartMessage: Message = {
                    id: generateId(),
                    role: 'agent',
                    content: '',
                    timestamp: new Date(),
                    type: 'chart',
                    data: {
                      imageData: artifact.data,
                      mimeType: artifact.mimeType,
                      title: artifactName
                        .replace(/^chart_/, '')
                        .replace(/\.png$/, '')
                        .replace(/_\d+$/, '')
                        .replace(/_/g, ' ')
                        .replace(/^\w/, (c: string) => c.toUpperCase()),
                    },
                  };
                  setMessages((prev) => [...prev, chartMessage]);
                } else {
                  console.warn('[Chart artifact empty]', artifactName);
                }
              } catch (err) {
                console.warn('[Failed to fetch chart]', artifactName, err);
              }
            }

            // Fetch and display only the latest Excel artifact (sorted by name = timestamp order)
            if (excelArtifactNames.length > 0) {
              const latestExcel = excelArtifactNames.sort().at(-1)!;
              // Mark all new Excel artifacts as shown to suppress future duplicates
              excelArtifactNames.forEach(n => shownArtifactsRef.current.add(n));
              try {
                console.log('[Fetching Excel]', latestExcel);
                const artifact = await getArtifact(appName, userId, currentSessionId, latestExcel);

                if (artifact?.data) {
                  const fileMessage: Message = {
                    id: generateId(),
                    role: 'agent',
                    content: '',
                    timestamp: new Date(),
                    type: 'file',
                    data: {
                      name: latestExcel,
                      url: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${artifact.data}`,
                      size: 0,
                      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    },
                  };
                  setMessages((prev) => [...prev, fileMessage]);
                } else {
                  console.warn('[Excel artifact empty]', latestExcel);
                }
              } catch (err) {
                console.warn('[Failed to fetch Excel]', latestExcel, err);
              }
            }
          } catch (err) {
            console.warn('[Failed to list artifacts]', err);
          }
        }
      } catch (err) {
        const chatError = err as ChatError;
        setError(chatError);
        
        // Update agent message with error
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === agentMessageId
              ? {
                  ...msg,
                  type: 'error' as const,
                  isStreaming: false,
                  error: chatError,
                }
              : msg
          )
        );
      } finally {
        setIsLoading(false);
        setCurrentTool(null);
        stopTimer();
        abortControllerRef.current = null;
      }
    },
    [appName, userId, sessionId, isLoading, initSession, startTimer, stopTimer, onToolCall]
  );

  // Retry last failed message
  const retry = useCallback(() => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMessage) {
      // Remove the failed agent message
      setMessages((prev) => prev.filter((m) => m.type !== 'error'));
      setError(null);
      sendMessage(lastUserMessage.content);
    }
  }, [messages, sendMessage]);

  // Clear chat / new conversation
  const clearChat = useCallback(async () => {
    setMessages([]);
    setQuestions([]);
    setError(null);
    setSessionId(null);
    setCurrentTool(null);
    shownArtifactsRef.current = new Set();
    await initSession();
  }, [initSession]);

  // Cancel current request
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setCurrentTool(null);
    stopTimer();
    
    // Mark any streaming messages as complete
    setMessages((prev) =>
      prev.map((msg) =>
        msg.isStreaming ? { ...msg, isStreaming: false } : msg
      )
    );
  }, [stopTimer]);

  return {
    messages,
    isLoading,
    error,
    sessionId,
    elapsedTime,
    questions,
    currentTool,
    sendMessage,
    retry,
    clearChat,
    cancel,
    initSession,
  };
}
