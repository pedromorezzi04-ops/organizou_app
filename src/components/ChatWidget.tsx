import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2, MessageCircle, Mic } from 'lucide-react';
import { useChat, ChatMessage } from '@/contexts/ChatContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import AudioRecorder from '@/components/AudioRecorder';

const ChatWidget = () => {
  const { messages, isOpen, isLoading, openChat, closeChat, sendMessage } = useChat();
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close hub when chat window opens
  useEffect(() => {
    if (isOpen) setIsHubOpen(false);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const message = input;
    setInput('');
    await sendMessage(message);
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-[60] w-80 sm:w-96 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
            {/* Header */}
            <div className="bg-primary px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
                <div>
                  <p className="font-medium text-primary-foreground text-sm">Assistente Financeiro</p>
                  <p className="text-xs text-primary-foreground/80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    IA Ativa
                  </p>
                </div>
              </div>
              <button
                onClick={closeChat}
                className="p-1.5 rounded-lg hover:bg-primary-foreground/20 transition-colors"
                aria-label="Fechar chat"
              >
                <X className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>

            {/* Messages Area */}
            <div
              ref={scrollContainerRef}
              className="flex-1 p-4 min-h-[200px] max-h-[350px] overflow-y-auto"
            >
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Olá! Sou seu assistente financeiro.
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Pergunte sobre suas finanças!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="flex space-x-1">
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs">Digitando...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-muted/30">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading}
                  className="shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audio Recorder bottom sheet */}
      {isAudioOpen && <AudioRecorder onClose={() => setIsAudioOpen(false)} />}

      {/* Backdrop — covers BottomNav (z-50) when hub is open */}
      {isHubOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[55] animate-in fade-in duration-200"
          onClick={() => setIsHubOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Floating Hub */}
      <div className="fixed bottom-20 right-4 z-[60] flex flex-col items-end gap-3">

        {/* Pills — visible when hub is open */}
        {isHubOpen && (
          <>
            {/* Áudio pill */}
            <button
              onClick={() => {
                setIsHubOpen(false);
                setIsAudioOpen(true);
              }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-full shadow-lg bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-sm font-medium transition-colors min-h-[44px] animate-in slide-in-from-bottom-2 fade-in duration-200"
              style={{ animationDelay: '80ms', animationFillMode: 'backwards' }}
              aria-label="Abrir assistente de áudio"
            >
              <span className="relative inline-flex items-center justify-center w-5 h-5">
                <Mic className="w-5 h-5 relative z-10" />
                <span className="sonar-ring" style={{ animationDelay: '0s' }} />
                <span className="sonar-ring" style={{ animationDelay: '0.5s' }} />
                <span className="sonar-ring" style={{ animationDelay: '1s' }} />
              </span>
              <span>Áudio</span>
            </button>

            {/* Chat pill */}
            <button
              onClick={() => {
                setIsHubOpen(false);
                openChat();
              }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-full shadow-lg bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground text-sm font-medium transition-colors min-h-[44px] animate-in slide-in-from-bottom-2 fade-in duration-200"
              style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
              aria-label="Abrir assistente de chat"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Chat</span>
            </button>
          </>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setIsHubOpen((prev) => !prev)}
          className={cn(
            'w-14 h-14 rounded-full shadow-lg',
            'bg-primary text-primary-foreground',
            'flex items-center justify-center',
            'transition-all duration-200 hover:scale-105 active:scale-95',
            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
          )}
          aria-label={isHubOpen ? 'Fechar menu assistente' : 'Abrir menu assistente'}
          aria-expanded={isHubOpen}
        >
          <div className={cn('transition-transform duration-200', isHubOpen && 'rotate-45')}>
            {isHubOpen ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
          </div>
        </button>
      </div>
    </>
  );
};

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] px-3 py-2 rounded-2xl text-sm',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  );
};

export default ChatWidget;
