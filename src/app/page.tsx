'use client';

import { useCallback } from 'react';
import { AppLayout } from '@/components/layout';
import { ChatInput, ChatMessageList } from '@/components/chat';
import { useChat } from '@/hooks';
import type { QuestionItem } from '@/types';

// Configuration
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'insights_bot';
const USER_ID = process.env.NEXT_PUBLIC_DEFAULT_USER_ID || 'user';

export default function Home() {
  const {
    messages,
    isLoading,
    elapsedTime,
    questions,
    sendMessage,
    clearChat,
    retry,
  } = useChat({
    appName: APP_NAME,
    userId: USER_ID,
  });

  // Handle clicking a question in sidebar to scroll to it
  const handleQuestionClick = useCallback((question: QuestionItem) => {
    const messageElement = document.getElementById(`message-${question.messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Handle new chat
  const handleNewChat = useCallback(() => {
    clearChat();
  }, [clearChat]);

  return (
    <AppLayout
      questions={questions}
      onQuestionClick={handleQuestionClick}
      onNewChat={handleNewChat}
    >
      {/* Messages Area - includes thinking state in agent message */}
      <ChatMessageList
        messages={messages}
        showTimestamps={true}
        elapsedTime={elapsedTime}
        onSuggestionClick={sendMessage}
        onRetry={retry}
      />

      {/* Input Area */}
      <ChatInput
        onSend={sendMessage}
        isLoading={isLoading}
      />
    </AppLayout>
  );
}
