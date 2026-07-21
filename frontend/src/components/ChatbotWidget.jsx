import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Send, Bot, User, Circle, Loader2, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const CHAT_API = '/chat/message';

const chatStore = new Map();

function storeKey(userId) {
  return `${userId || 'anon'}`;
}

function loadMessages(userId) {
  return chatStore.get(storeKey(userId)) || null;
}

function saveMessages(userId, msgs) {
  chatStore.set(storeKey(userId), msgs);
}

function clearMessages(userId) {
  if (userId) chatStore.delete(storeKey(userId));
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const chatVariants = {
  window: {
    hidden: { opacity: 0, scale: 0.92, y: 24 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 26, stiffness: 300, mass: 0.8 } },
    exit: { opacity: 0, scale: 0.95, y: 12, transition: { duration: 0.18, ease: 'easeIn' } },
  },
  message: {
    hidden: { opacity: 0, y: 16, scale: 0.96 },
    visible: (i) => ({ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.04, duration: 0.28, ease: [0.22, 1, 0.36, 1] } }),
    exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
  },
  bubble: {
    hidden: { opacity: 0, y: 8, scale: 0.97 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } },
  },
  typing: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
    exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
  },
  fab: {
    idle: { scale: 1, rotate: 0 },
    hover: { scale: 1.08, rotate: 3, transition: { type: 'spring', damping: 18, stiffness: 300 } },
    pulse: { scale: [1, 1.06, 1], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } },
  },
  header: {
    hidden: { opacity: 0, y: -12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  },
  input: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut', delay: 0.05 } },
  },
  send: {
    idle: { scale: 1 },
    hover: { scale: 1.1, transition: { type: 'spring', damping: 15, stiffness: 300 } },
    tap: { scale: 0.9 },
    busy: { scale: [1, 1.15, 1], transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' } },
  },
};

function StreamingText({ text, speed = 18 }) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    indexRef.current = 0;
    if (!text) return;

    const interval = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <span className={done ? '' : 'chat-streaming-cursor'}>{displayed}</span>;
}

export default function ChatbotWidget({ user, mode = 'employee' }) {
  const userId = user?.id || user?.userId || user?.employee_id;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => loadMessages(userId) || []);

  useEffect(() => {
    console.log('[Chatbot] mounted. userId=', userId, 'roleMode=', mode);
  }, [userId, mode]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [streamingId, setStreamingId] = useState(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [sendFlash, setSendFlash] = useState(false);

  const bodyRef = useRef(null);
  const msgId = useRef(messages.length);
  const prevMsgCountRef = useRef(messages.length);

  const userPhoto = user?.profile_picture
    ? (user.profile_picture.startsWith('http')
        ? user.profile_picture
        : user.profile_picture)
    : null;

  const pushMessage = useCallback((msg) => {
    const full = { id: ++msgId.current, time: Date.now(), ...msg };
    setMessages((prev) => {
      const next = [...prev, full];
      saveMessages(userId, next);
      return next;
    });
    if (msg.from === 'bot') setStreamingId(full.id);
    return full;
  }, [userId]);

  useEffect(() => {
    const onStorage = () => {
      if (!localStorage.getItem('accessToken')) {
        clearMessages(userId);
        setMessages([]);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [userId]);

  // Every message goes directly to Gemini via the backend.
  const askGemini = useCallback(async (text) => {
    try {
      const payload = { message: text };
      console.log('[Chatbot] Sending to Gemini:', payload);
      const res = await api.post(CHAT_API, payload);
      const data = res.data;
      console.log('[Chatbot] Gemini response:', data);
      // Show whatever the backend returns — including fallback messages
      pushMessage({ from: 'bot', text: data?.reply || data?.text || "I couldn't find an answer for that." });
    } catch (err) {
      console.error('[Chatbot] Request failed:', err);
      const status = err?.response?.status;

      if (status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userRole');

        pushMessage({
          from: 'bot',
          text: 'Session expired. Please login again.',
          kind: 'error'
        });

        try { window.location.href = '/login'; } catch { /* ignore */ }
        return;
      }

      // Show the backend's error message if available
      const backendMsg = err?.response?.data?.reply || err?.response?.data?.message;
      pushMessage({
        from: 'bot',
        text: backendMsg || 'Sorry — could not fetch the answer right now.',
        kind: 'error'
      });
    }
  }, [pushMessage]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || busy) return;
    console.log('[Chatbot] Sending:', text);
    pushMessage({ from: 'user', text });
    setInput('');
    setBusy(true);
    setSendFlash(true);
    askGemini(text).finally(() => { setBusy(false); setTimeout(() => setSendFlash(false), 600); });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTo({
        top: bodyRef.current.scrollHeight,
        behavior: messages.length > prevMsgCountRef.current ? 'smooth' : 'auto',
      });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages, open]);

  const kindIcon = (kind) => {
    if (kind === 'success') return <CheckCircle2 size={14} className="chat-kind-success" />;
    if (kind === 'error') return <AlertTriangle size={14} className="chat-kind-error" />;
    return <Bot size={14} />;
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            className="chat-fab"
            onClick={() => setOpen(true)}
            aria-label="Open chat assistant"
            title="AI Search"
            variants={chatVariants.fab}
            initial="idle"
            whileHover="hover"
            animate="pulse"
          >
            <span className="chat-bot-face" aria-hidden="true">
              <span className="chat-bot-eye left" />
              <span className="chat-bot-eye right" />
              <span className="chat-bot-mouth" />
            </span>
            <span className="chat-fab-dot" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            className="chat-window"
            variants={chatVariants.window}
            initial="hidden"
            animate="visible"
            exit="exit"
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
          >
            <motion.header className="chat-header" variants={chatVariants.header} initial="hidden" animate="visible">
              <div className="chat-header-info">
                <div className="chat-avatar chat-avatar-bot">
                  <span className="chat-bot-face" aria-hidden="true">
                    <span className="chat-bot-eye left" />
                    <span className="chat-bot-eye right" />
                    <span className="chat-bot-mouth" />
                  </span>
                </div>
                <div>
                  <div className="chat-title">AI Assistant</div>
                  <div className="chat-status">
                    <Circle size={8} className="online" />
                    Online
                  </div>
                </div>
              </div>

              <div className="chat-header-actions">
                <button
                  className="chat-icon-btn"
                  onClick={() => setOpen(false)}
                  title="Close chat"
                  aria-label="Close chat"
                >
                  <X size={18} />
                </button>
              </div>
            </motion.header>

            <div className="chat-body" ref={bodyRef}>
              {messages.map((m, idx) => {
                const isUser = m.from === 'user';
                const isStreaming = m.id === streamingId && !isUser && idx === messages.length - 1;

                return (
                  <motion.div
                    className={`chat-row ${isUser ? 'user' : 'bot'}`}
                    key={m.id}
                    custom={idx}
                    variants={chatVariants.message}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    whileHover={{ x: isUser ? -2 : 2, transition: { duration: 0.15 } }}
                  >
                    {!isUser && (
                      <div className="chat-msg-avatar">
                        {kindIcon(m.kind)}
                      </div>
                    )}
                    <div className="chat-msg-col">
                      <motion.div
                        className={`chat-bubble ${isUser ? 'user' : 'bot'} chat-kind-${m.kind || 'normal'}`}
                        variants={chatVariants.bubble}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
                      >
                        {isStreaming ? (
                          <StreamingText text={m.text} />
                        ) : (
                          m.text
                        )}
                      </motion.div>
                      <div className="chat-msg-time">{m.time ? formatTime(m.time) : ''}</div>
                    </div>
                    {isUser && (
                      <div className="chat-msg-avatar user">
                        {userPhoto ? (
                          <img src={userPhoto} alt="You" className="chat-avatar-img" />
                        ) : (
                          <User size={14} />
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}

              <AnimatePresence>
                {busy && (
                  <motion.div
                    className="chat-row bot"
                    variants={chatVariants.typing}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <div className="chat-msg-avatar"><Loader2 size={14} className="chat-spin" /></div>
                    <div className="chat-msg-col">
                      <div className="chat-bubble bot chat-typing">
                        <span className="chat-dot" /><span className="chat-dot" /><span className="chat-dot" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.div className={`chat-input-bar${inputFocused || busy || sendFlash ? ' flash' : ''}`} variants={chatVariants.input} initial="hidden" animate="visible">
              <textarea
                className="chat-input"
                rows={1}
                placeholder="Ask me anything…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
              />
              <motion.button
                className="chat-send"
                onClick={handleSend}
                aria-label="Send"
                disabled={busy}
                variants={chatVariants.send}
                initial="idle"
                animate={busy ? 'busy' : 'idle'}
                whileHover="hover"
                whileTap="tap"
              >
                <Send size={18} />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

