import type { 
  SendMessageRequest, 
  SSEEvent, 
  ChatError, 
  Session,
  ResponseType,
  TableData,
  ChartData,
  FileData,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// ============================================================================
// API Client Configuration
// ============================================================================

interface ApiConfig {
  timeout: number;
  retries: number;
}

const defaultConfig: ApiConfig = {
  timeout: 300000, // 5 minutes — agent queries can take 30s+
  retries: 0,
};

// ============================================================================
// Agent/App Management
// ============================================================================

/**
 * List available agents/apps
 */
export async function listApps(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/list-apps?relative_path=./`);
  if (!response.ok) {
    throw createError('network', 'Failed to load agents', true);
  }
  return response.json();
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Create a new session
 */
export async function createSession(
  appName: string, 
  userId: string,
  initialState?: Record<string, unknown>
): Promise<Session> {
  const response = await fetch(
    `${API_BASE}/apps/${appName}/users/${userId}/sessions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: initialState ? JSON.stringify({ state: initialState }) : undefined,
    }
  );
  
  if (!response.ok) {
    throw createError('network', 'Failed to create session', true);
  }
  
  return response.json();
}

/**
 * Get session details
 */
export async function getSession(
  appName: string,
  userId: string,
  sessionId: string
): Promise<Session> {
  const response = await fetch(
    `${API_BASE}/apps/${appName}/users/${userId}/sessions/${sessionId}`
  );
  
  if (!response.ok) {
    throw createError('network', 'Failed to get session', true);
  }
  
  return response.json();
}

/**
 * List all sessions for a user
 */
export async function listSessions(
  appName: string,
  userId: string
): Promise<Session[]> {
  const response = await fetch(
    `${API_BASE}/apps/${appName}/users/${userId}/sessions`
  );
  
  if (!response.ok) {
    throw createError('network', 'Failed to list sessions', true);
  }
  
  return response.json();
}

/**
 * Delete a session
 */
export async function deleteSession(
  appName: string,
  userId: string,
  sessionId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/apps/${appName}/users/${userId}/sessions/${sessionId}`,
    { method: 'DELETE' }
  );
  
  if (!response.ok) {
    throw createError('network', 'Failed to delete session', true);
  }
}

// ============================================================================
// Artifacts Management
// ============================================================================

export interface Artifact {
  filename: string;
  version?: number;
  mimeType?: string;
}

export interface ArtifactData {
  filename: string;
  mimeType: string;
  data: string; // base64 encoded
}

/**
 * List all artifacts for a session
 */
export async function listArtifacts(
  appName: string,
  userId: string,
  sessionId: string
): Promise<string[]> {
  const response = await fetch(
    `${API_BASE}/apps/${appName}/users/${userId}/sessions/${sessionId}/artifacts`
  );
  
  if (!response.ok) {
    console.warn('Failed to list artifacts:', response.status);
    return [];
  }
  
  const data = await response.json();
  // API returns list of artifact names
  return Array.isArray(data) ? data : [];
}

/**
 * Get a specific artifact by name
 */
export async function getArtifact(
  appName: string,
  userId: string,
  sessionId: string,
  artifactName: string
): Promise<ArtifactData | null> {
  try {
    const response = await fetch(
      `${API_BASE}/apps/${appName}/users/${userId}/sessions/${sessionId}/artifacts/${encodeURIComponent(artifactName)}`
    );
    
    if (!response.ok) {
      console.warn('Failed to get artifact:', artifactName, response.status);
      return null;
    }
    
    // The ADK returns the artifact data - need to check the format
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // JSON response with inlineData or inline_data
      const data = await response.json();
      console.log('[Artifact JSON response]', Object.keys(data));
      
      // Handle camelCase (inlineData) - ADK's actual format
      if (data.inlineData?.data) {
        return {
          filename: artifactName,
          mimeType: data.inlineData.mimeType || data.inlineData.mime_type || 'image/png',
          data: fixPadding(cleanBase64(data.inlineData.data)),
        };
      }
      // Handle snake_case (inline_data) - fallback
      if (data.inline_data?.data) {
        return {
          filename: artifactName,
          mimeType: data.inline_data.mime_type || data.inline_data.mimeType || 'image/png',
          data: fixPadding(cleanBase64(data.inline_data.data)),
        };
      }
      // Direct JSON with data field
      if (data.data) {
        return {
          filename: artifactName,
          mimeType: data.mime_type || data.mimeType || 'image/png',
          data: fixPadding(cleanBase64(data.data)),
        };
      }
      console.warn('[Artifact format unknown]', data);
      return null;
    } else if (contentType.includes('image/')) {
      // Binary image response - convert to base64
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      return {
        filename: artifactName,
        mimeType: contentType,
        data: base64,
      };
    } else {
      // Try to read as text/base64
      const text = await response.text();
      // Check if it's already base64
      if (text.match(/^[A-Za-z0-9+/]+=*$/)) {
        return {
          filename: artifactName,
          mimeType: 'image/png',
          data: text,
        };
      }
      return null;
    }
  } catch (error) {
    console.error('Error fetching artifact:', error);
    return null;
  }
}

/**
 * Get all image artifacts for a session (charts)
 */
export async function getChartArtifacts(
  appName: string,
  userId: string,
  sessionId: string
): Promise<ArtifactData[]> {
  const artifactNames = await listArtifacts(appName, userId, sessionId);
  
  // Filter for chart/image artifacts
  const chartArtifacts = artifactNames.filter(name => 
    name.startsWith('chart_') || 
    name.endsWith('.png') || 
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg')
  );
  
  const results: ArtifactData[] = [];
  
  for (const name of chartArtifacts) {
    const artifact = await getArtifact(appName, userId, sessionId, name);
    if (artifact) {
      results.push(artifact);
    }
  }
  
  return results;
}

/**
 * Helper: Clean base64 string by removing whitespace and newlines,
 * and converting URL-safe base64 to standard base64 if needed.
 */
function cleanBase64(base64: string): string {
  if (!base64) return '';
  return base64
    .replace(/[\s\r\n]/g, '') // Remove whitespace/newlines
    .replace(/-/g, '+')       // URL-safe to standard
    .replace(/_/g, '/');      // URL-safe to standard
}

/**
 * Helper: Ensure base64 string has correct padding
 */
function fixPadding(base64: string): string {
  const pad = base64.length % 4;
  if (pad === 0) return base64;
  if (pad === 1) return base64.slice(0, -1); // Invalid base64
  return base64 + '='.repeat(4 - pad);
}

/**
 * Helper: Convert blob to base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix if present
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ============================================================================
// Message Streaming
// ============================================================================

/**
 * Send a message and receive streaming response
 * Returns an async generator that yields parsed events
 */
export async function* sendMessageStream(
  request: SendMessageRequest,
  config: Partial<ApiConfig> = {}
): AsyncGenerator<SSEEvent, void, unknown> {
  const { timeout } = { ...defaultConfig, ...config };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(`${API_BASE}/run_sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw createError(
        response.status >= 500 ? 'server' : 'network',
        `Server error: ${response.status}`,
        response.status >= 500
      );
    }
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw createError('network', 'No response body', true);
    }
    
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;
        
        try {
          const event: SSEEvent = JSON.parse(jsonStr);
          yield event;
        } catch {
          // Skip malformed JSON - don't break the stream
          console.warn('Malformed SSE event:', jsonStr);
        }
      }
    }
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw createError('timeout', 'Request timed out after ' + (timeout / 1000) + 's', true);
    }
    
    // Re-throw if already a ChatError
    if (isChatError(error)) {
      throw error;
    }
    
    throw createError(
      'network',
      error instanceof Error ? error.message : 'Network error',
      true
    );
  }
}

// ============================================================================
// Response Parsing & Filtering
// ============================================================================

/**
 * Parsed content from an SSE event
 */
export interface ParsedContent {
  type: ResponseType;
  text?: string;
  table?: TableData;
  chart?: ChartData;
  file?: FileData;
  sql?: string[];
  raw?: unknown;
}

/**
 * Parse and filter SSE events to extract user-visible content
 * CRITICAL: This function filters out function_call and function_response events
 */
export function parseEventContent(event: SSEEvent): ParsedContent | null {
  // DEBUG: Log all incoming events to help diagnose chart detection
  if (process.env.NODE_ENV === 'development') {
    console.log('[SSE Event]', JSON.stringify(event, null, 2).slice(0, 500));
  }
  
  // Check for direct data fields (table, chart, file)
  if (event.data) {
    const data = event.data as Record<string, unknown>;
    
    if (data.table) {
      return {
        type: 'table',
        table: data.table as TableData,
        sql: data.sql as string[] | undefined,
      };
    }
    
    if (data.chart) {
      return {
        type: 'chart',
        chart: data.chart as ChartData,
        sql: data.sql as string[] | undefined,
      };
    }
    
    if (data.file) {
      return {
        type: 'file',
        file: data.file as FileData,
      };
    }
  }
  
  // Check content parts
  if (!event.content?.parts) return null;
  
  let textContent = '';
  let imageData: string | null = null;
  let imageMimeType: string | null = null;
  
  for (const part of event.content.parts) {
    // DEBUG: Log each part structure
    if (process.env.NODE_ENV === 'development') {
      const partKeys = Object.keys(part);
      console.log('[Part Keys]', partKeys);
    }
    
    // CRITICAL: Skip function calls and responses - NEVER show these to users
    if (part.functionCall || part.functionResponse) {
      continue;
    }
    
    // Check for inline_data (ADK chart/image format)
    const inlineData = part.inlineData || part.inline_data;
    if (inlineData?.data) {
      console.log('[Chart Detected] inline_data found with mime:', inlineData.mimeType || inlineData.mime_type);
      imageData = inlineData.data;
      imageMimeType = inlineData.mimeType || inlineData.mime_type || 'image/png';
    }
    
    // Collect text content
    if (part.text) {
      textContent += part.text;
    }
  }
  
  // If we found an image, return it as a chart
  if (imageData) {
    console.log('[Chart Result] Returning chart with imageData length:', imageData.length);
    return {
      type: 'chart',
      chart: {
        imageData: imageData,
        mimeType: imageMimeType,
      } as ChartData,
      text: textContent || undefined,
    };
  }
  
  // Return text content if found
  if (textContent) {
    return {
      type: 'text',
      text: textContent,
    };
  }
  
  return null;
}

/**
 * Detect response type from parsed content
 */
export function detectResponseType(content: ParsedContent): ResponseType {
  if (content.table) return 'table';
  if (content.chart) return 'chart';
  if (content.file) return 'file';
  return 'text';
}

/**
 * Check if an SSE event contains a function call (for internal logging only)
 */
export function isToolEvent(event: SSEEvent): boolean {
  if (!event.content?.parts) return false;
  return event.content.parts.some(part => part.functionCall || part.functionResponse);
}

/**
 * Get tool name from event (for optional status display)
 */
export function getToolName(event: SSEEvent): string | null {
  if (!event.content?.parts) return null;
  
  for (const part of event.content.parts) {
    if (part.functionCall) {
      return part.functionCall.name;
    }
    if (part.functionResponse) {
      return part.functionResponse.name;
    }
  }
  
  return null;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Create a standardized ChatError
 */
export function createError(
  type: ChatError['type'],
  message: string,
  retryable: boolean,
  originalResponse?: unknown
): ChatError {
  return {
    type,
    message,
    retryable,
    originalResponse,
  };
}

/**
 * Check if an error is a ChatError
 */
export function isChatError(error: unknown): error is ChatError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'message' in error &&
    'retryable' in error
  );
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: ChatError): string {
  switch (error.type) {
    case 'network':
      return 'Connection issue. Please check your network and try again.';
    case 'timeout':
      return 'The request took too long. Please try again.';
    case 'server':
      return 'Server error. Please try again later.';
    case 'unknown_format':
      return 'Received an unexpected response format.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate a unique ID for messages
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Format elapsed time for display
 */
export function formatElapsedTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
