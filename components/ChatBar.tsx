'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Sparkles } from 'lucide-react'
import type { WardProperties } from '@/lib/types'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatBarProps {
  wardContext: WardProperties | null
}

export function ChatBar({ wardContext }: ChatBarProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, wardContext }),
      })
      const json = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: json.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, wardContext])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* Expanded chat panel — absolutely positioned above bar */}
      {open && (
        <div
          className="absolute bottom-14 left-0 right-0 z-50 flex items-end justify-center px-4 pb-1 pointer-events-none"
          style={{ height: 'min(420px, 55vh)' }}
        >
          <div
            className="w-full max-w-2xl rounded-xl overflow-hidden pointer-events-auto flex flex-col"
            style={{
              background: 'rgba(17,17,17,0.82)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(44,44,44,0.8)',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
              height: '100%',
            }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle flex-none">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-coral" strokeWidth={1.5} />
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Ask about Tokyo&apos;s refill situation
                </span>
                {wardContext && (
                  <span className="text-xs font-mono text-text-muted bg-bg-elevated border border-border-subtle rounded px-1.5 py-0.5">
                    {wardContext.ward_name}
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {messages.length === 0 && (
                <div className="text-text-muted text-sm text-center py-8">
                  Ask anything about Tokyo&apos;s plastic waste, refill stations, or mymizu coverage.
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-coral text-white'
                        : 'bg-bg-elevated border border-border-subtle text-text-primary'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-bg-elevated border border-border-subtle px-3 py-2 rounded-lg flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-border-subtle border-t-teal rounded-full animate-spin" />
                    <span className="text-text-muted text-xs">Thinking…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div
        className="flex-none h-14 border-t border-border-subtle flex items-center px-4 gap-3 z-40"
        style={{
          background: open
            ? 'rgba(17,17,17,0.95)'
            : 'rgba(28,28,28,0.9)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors"
          >
            <MessageCircle size={16} strokeWidth={1.5} />
            <span className="text-sm">Ask about Tokyo&apos;s waste problem…</span>
          </button>
        )}
        {open && (
          <>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={wardContext ? `Ask about ${wardContext.ward_name}…` : "Ask about Tokyo\u2019s refill deserts\u2026"}
              className="flex-1 bg-transparent text-text-primary placeholder-text-muted text-sm outline-none"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="flex-none text-coral disabled:text-text-muted transition-colors disabled:cursor-not-allowed"
            >
              <Send size={16} strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>
    </>
  )
}
