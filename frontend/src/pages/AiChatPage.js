import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { chatWithAI } from '@/lib/nvidiaApi';
import { 
  Bot, 
  Send, 
  Menu, 
  Plus, 
  MessageSquare, 
  Trash2, 
  X,
  Loader2,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';

export default function AiChatPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  // States
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Delete Dialog
  const [chatToDelete, setChatToDelete] = useState(null);

  // Initial Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('discuss_ai_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConversations(parsed);
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  // Save to LocalStorage whenever conversations change
  useEffect(() => {
    localStorage.setItem('discuss_ai_history', JSON.stringify(conversations));
  }, [conversations]);

  // Load Active Conversation Messages
  useEffect(() => {
    if (activeConversationId) {
      const active = conversations.find(c => c.id === activeConversationId);
      if (active) {
        setMessages(active.messages);
      }
    } else {
      setMessages([]);
    }
  }, [activeConversationId, conversations]);

  // Auto-Summarize Logic
  useEffect(() => {
    if (location.state?.prompt && !isTyping) {
      const promptText = location.state.prompt;
      navigate(location.pathname, { replace: true, state: {} });
      handleNewChat(promptText);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleNewChat = (initialPrompt = null) => {
    setActiveConversationId(null);
    setMessages([]);
    if (initialPrompt && typeof initialPrompt === 'string') {
      sendMessage(initialPrompt, null);
    }
  };

  const handleSelectChat = (id) => {
    setActiveConversationId(id);
    setShowSidebar(false);
  };

  const deleteChat = (id) => {
    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
    }
    setChatToDelete(null);
  };

  const sendMessage = async (text, overrideConvId = activeConversationId) => {
    if (!text.trim()) return;

    let convId = overrideConvId;
    let newMessages = [...messages];
    
    if (!convId) {
      convId = Date.now().toString();
      const newConv = {
        id: convId,
        title: text.substring(0, 35) + (text.length > 35 ? '...' : ''),
        messages: []
      };
      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(convId);
      newMessages = [];
    }

    const userMessage = { role: 'user', content: text };
    newMessages.push(userMessage);
    
    setMessages(newMessages);
    updateConversationInState(convId, newMessages);
    setInput('');
    setIsTyping(true);

    try {
      const payload = [
        { role: 'system', content: 'You are Discuss AI, a helpful and brilliant developer assistant created for the Discuss platform. Help programmers write code, debug issues, summarize tech topics, and answer developer questions. Format code blocks properly using markdown.' },
        ...newMessages.map(m => ({ role: m.role, content: m.content }))
      ];

      const reply = await chatWithAI(payload);
      
      const assistantMessage = { role: 'assistant', content: reply };
      const updatedMessages = [...newMessages, assistantMessage];
      
      setMessages(updatedMessages);
      updateConversationInState(convId, updatedMessages);
    } catch (error) {
      const errMsg = error.message?.includes('high traffic') 
        ? '🙏 Our AI servers are currently busy. Please try again in a moment.'
        : 'Sorry, I encountered an error connecting to the NVIDIA network. Please try again.';
      const errorMessage = { role: 'assistant', content: errMsg };
      const updatedMessages = [...newMessages, errorMessage];
      setMessages(updatedMessages);
      updateConversationInState(convId, updatedMessages);
    } finally {
      setIsTyping(false);
    }
  };

  const updateConversationInState = (id, msgs) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, messages: msgs } : c));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col bg-neutral-50 dark:bg-neutral-900 discuss:bg-[#0c0c12]" style={{ height: '100dvh' }}>
      {/* Fixed top Header */}
      <Header />

      {/* Content area below header — uses CSS var for header height */}
      <div className="flex flex-1 overflow-hidden" style={{ marginTop: '64px' }}>

        {/* Mobile Overlay */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setShowSidebar(false)}
            />
          )}
        </AnimatePresence>

        {/* --- SIDEBAR --- */}
        <div
          className={`
            fixed md:static z-50 h-full
            w-72 shrink-0 flex flex-col
            bg-white dark:bg-[#1E293B] discuss:bg-[#111116]
            border-r border-neutral-200 dark:border-neutral-800 discuss:border-white/5
            transition-transform duration-300 ease-in-out
            ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          {/* Sidebar New Chat */}
          <div className="p-4 flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 discuss:border-white/5">
            <button
              onClick={() => handleNewChat()}
              className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#8B5CF6] to-blue-600 hover:opacity-90 text-white rounded-xl font-semibold transition-all shadow-sm text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </button>
            <button
              onClick={() => setShowSidebar(false)}
              className="md:hidden p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {conversations.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                <p className="text-xs text-neutral-400 font-medium">No conversations yet</p>
                <p className="text-xs text-neutral-300 dark:text-neutral-600 mt-1">Start a new chat above</p>
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    activeConversationId === conv.id
                      ? 'bg-[#8B5CF6]/10 text-[#8B5CF6] dark:text-[#A78BFA]'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/60 discuss:hover:bg-white/5 text-neutral-700 dark:text-neutral-300 discuss:text-neutral-400'
                  }`}
                  onClick={() => handleSelectChat(conv.id)}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="text-[13px] truncate font-medium">{conv.title || 'New Chat'}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setChatToDelete(conv.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-400 hover:text-red-500 transition-all rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- MAIN CHAT AREA --- */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Mobile Sub-Header */}
          <div className="md:hidden flex items-center px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-800 discuss:border-white/5 bg-white dark:bg-neutral-900 discuss:bg-[#111116] shrink-0 gap-2">
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 flex-1">
              <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
              <span className="font-bold text-neutral-900 dark:text-white text-sm">Discuss AI</span>
            </div>
            <button
              onClick={() => navigate('/feed')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Home
            </button>
          </div>

          {/* Messages scroll area */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-5 py-16">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-[#8B5CF6]/20 to-blue-500/20 rounded-3xl flex items-center justify-center shadow-inner">
                    <Bot className="w-12 h-12 text-[#8B5CF6]" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-neutral-900" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-white discuss:text-white mb-2">How can I help you today?</h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Ask me to write code, debug issues, explain concepts, or summarize any post. Powered by <span className="font-bold text-[#8B5CF6]">NVIDIA NIM</span>.
                  </p>
                </div>
                <p className="text-xs text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-full font-medium">
                  ⚠️ AI can make mistakes — always double-check
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 w-full max-w-3xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                    msg.role === 'user'
                      ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                      : 'bg-gradient-to-br from-[#8B5CF6] to-blue-600 text-white'
                  }`}>
                    {msg.role === 'user' ? (user?.username?.[0]?.toUpperCase() || 'U') : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[78%]`}>
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-[#8B5CF6] to-blue-600 text-white rounded-tr-sm'
                        : 'bg-white dark:bg-neutral-800 discuss:bg-[#1A1A24] text-neutral-800 dark:text-neutral-200 discuss:text-neutral-300 border border-neutral-100 dark:border-neutral-700 discuss:border-white/5 rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))
            )}

            {isTyping && (
              <div className="flex gap-3 max-w-3xl mx-auto w-full">
                <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-[#8B5CF6] to-blue-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="px-5 py-4 rounded-2xl bg-white dark:bg-neutral-800 discuss:bg-[#1A1A24] border border-neutral-100 dark:border-neutral-700 discuss:border-white/5 rounded-tl-sm flex items-center gap-1.5 shadow-sm">
                  <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-2 h-2 bg-[#8B5CF6] rounded-full" />
                  <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-[#8B5CF6] rounded-full" />
                  <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-[#8B5CF6] rounded-full" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area — always sticks to bottom */}
          <div className="shrink-0 px-3 py-3 bg-white dark:bg-neutral-900 discuss:bg-[#0c0c12] border-t border-neutral-200 dark:border-neutral-800 discuss:border-white/5">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Discuss AI anything..."
                disabled={isTyping}
                className="flex-1 pl-4 pr-4 py-3 bg-neutral-100 dark:bg-neutral-800 discuss:bg-[#1A1A24] text-neutral-900 dark:text-white border border-transparent focus:border-[#8B5CF6]/50 rounded-2xl outline-none transition-all text-sm disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="shrink-0 p-3 bg-gradient-to-br from-[#8B5CF6] to-blue-600 hover:opacity-90 disabled:opacity-40 text-white rounded-2xl transition-all shadow-md"
              >
                {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
            <p className="text-center text-[10px] text-neutral-400 mt-2 font-medium">
              Discuss AI can make mistakes. Double check it. Powered by NVIDIA NIM.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!chatToDelete} onOpenChange={(open) => !open && setChatToDelete(null)}>
        <AlertDialogContent className="bg-white dark:bg-neutral-900 discuss:bg-[#121212] border-neutral-200 dark:border-neutral-800 discuss:border-neutral-800 rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-neutral-900 dark:text-neutral-100 font-bold">Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-500 dark:text-neutral-400 font-medium">
              Are you sure you want to permanently delete this chat? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteChat(chatToDelete)}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-sm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
