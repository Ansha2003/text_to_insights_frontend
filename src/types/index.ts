// Message Types
export type MessageRole = 'user' | 'agent';
export type ResponseType = 'text' | 'table' | 'chart' | 'file' | 'error';

export interface MessageAttachment {
  name: string;
  size: number;
  mimeType: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  type: ResponseType;
  isStreaming?: boolean;
  data?: TableData | ChartData | FileData;
  sqlQueries?: string[];
  error?: ChatError;
  attachments?: MessageAttachment[];
}

// Table Types
export interface TableData {
  columns: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
}

// Chart Types
export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter';

export interface ChartData {
  type?: ChartType;
  title?: string;
  // Base64 image data from backend-rendered charts
  imageData?: string;
  image?: string;
  base64?: string;
  chart_image?: string;
  mimeType?: string | null;
  // For frontend-rendered charts (not used currently)
  data?: Record<string, unknown>[];
  xKey?: string;
  yKey?: string;
  xLabel?: string;
  yLabel?: string;
}

// File Types
export interface FileData {
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

// Session Types
export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  messages: Message[];
}

// Error Types
export type ErrorType = 'network' | 'timeout' | 'server' | 'unknown_format' | 'generic';

export interface ChatError {
  type: ErrorType;
  message: string;
  retryable: boolean;
  originalResponse?: unknown;
}

// Theme Types
export type Theme = 'light' | 'dark' | 'system';

// Feedback Types
export type FeedbackType = 'positive' | 'negative' | null;

// File Upload Types
export interface UploadedFile {
  file: File;
  preview?: string;
}

// API Types
export interface SendMessageRequest {
  app_name: string;
  user_id: string;
  session_id: string;
  new_message: {
    role: 'user';
    parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }>;
  };
  streaming: boolean;
}

export interface SSEEvent {
  content?: {
    parts?: Array<{
      text?: string;
      functionCall?: {
        name: string;
        args: Record<string, unknown>;
      };
      functionResponse?: {
        name: string;
        response: unknown;
      };
      // ADK inline data for images/charts
      inlineData?: {
        mimeType?: string;
        mime_type?: string;
        data: string; // base64 encoded
      };
      inline_data?: {
        mimeType?: string;
        mime_type?: string;
        data: string; // base64 encoded
      };
    }>;
  };
  type?: string;
  data?: unknown;
}

// Question Item for Sidebar
export interface QuestionItem {
  id: string;
  text: string;
  timestamp: Date;
  messageId: string;
}

// Parsed Content from SSE Events
export interface ParsedContent {
  type: ResponseType;
  text?: string;
  table?: TableData;
  chart?: ChartData;
  file?: FileData;
  sql?: string[];
  raw?: unknown;
}

// Conversation/Thread for Sidebar
export interface Conversation {
  id: string;
  title: string;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
  previewText?: string;
  questionCount: number;
}

// App State
export interface AppState {
  appName: string;
  userId: string;
  isInitialized: boolean;
}
