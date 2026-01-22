import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useLocation } from 'react-router-dom';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatContextType {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

const WEBHOOK_URL = 'https://b4b-n8n.ajndqt.easypanel.host/webhook-test/9f19c4a0-1665-4cd4-827f-a277e5076a50';

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const getCurrentContext = useCallback(() => {
    const path = location.pathname;
    const contextMap: Record<string, string> = {
      '/': 'Início',
      '/dashboard': 'Dashboard',
      '/entradas': 'Entradas',
      '/saidas': 'Saídas',
      '/notinhas': 'Notinhas',
      '/graficos': 'Gráficos',
      '/tabelas': 'Tabelas',
      '/impostos': 'Impostos',
      '/config': 'Configurações',
    };
    return contextMap[path] || 'Desconhecido';
  }, [location.pathname]);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen(prev => !prev), []);
  const clearMessages = useCallback(() => setMessages([]), []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user?.id || 'anonymous',
          message: content.trim(),
          context: getCurrentContext(),
        }),
      });

      let assistantContent = 'Desculpe, não consegui processar sua solicitação.';

      if (response.ok) {
        const data = await response.text();
        try {
          const jsonData = JSON.parse(data);
          assistantContent = jsonData.message || jsonData.response || jsonData.text || data;
        } catch {
          assistantContent = data || assistantContent;
        }
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Ops! Ocorreu um erro ao conectar com o assistente. Tente novamente.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, getCurrentContext, isLoading]);

  return (
    <ChatContext.Provider value={{
      messages,
      isOpen,
      isLoading,
      openChat,
      closeChat,
      toggleChat,
      sendMessage,
      clearMessages,
    }}>
      {children}
    </ChatContext.Provider>
  );
};
